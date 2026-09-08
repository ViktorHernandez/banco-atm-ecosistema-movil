import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { promises as dns } from 'node:dns';
import type { Transporter } from 'nodemailer';

type ModoTransporte = 'smtp' | 'api' | 'ninguno';

export interface CorreoPendiente {
  para: string;
  asunto: string;
  titulo: string;
  parrafos: string[];
  accion?: { texto: string; url: string };
  codigo?: string;
  piePersonalizado?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger('Correo');
  private transporte: Transporter | null = null;
  private modo: ModoTransporte = 'ninguno';
  private ultimoError: string | null = null;

  private readonly bandeja: Array<CorreoPendiente & { enviadoEn: Date }> = [];

  constructor(private readonly configService: ConfigService) {}

  private leer(clave: string): string {
    return (this.configService.get<string>(clave) ?? '').trim();
  }

  async onModuleInit(): Promise<void> {
    if (!this.habilitado) {
      this.logger.warn(
        '=================================================================',
      );
      this.logger.warn(
        'CORREO DESACTIVADO: MAIL_ENABLED no es "true" en backend/.env.',
      );
      this.logger.warn(
        'Los codigos de verificacion NO llegaran al buzon del usuario.',
      );
      this.logger.warn(
        'Se registraran en este log con el formato [correo simulado] ... codigo=NNNNNN',
      );
      this.logger.warn(
        'Para enviar correo real: MAIL_ENABLED=true y reinicie el backend.',
      );
      this.logger.warn(
        '=================================================================',
      );
      return;
    }

    if (this.leer('MAIL_TRANSPORT').toLowerCase() === 'api' || this.leer('MAIL_API_KEY')) {
      this.configurarApi();
      return;
    }

    await this.configurarSmtp();
  }

  private get proveedorApi(): string {
    return (this.leer('MAIL_API_PROVIDER') || 'brevo').toLowerCase();
  }

  private configurarApi(): void {
    const clave = this.leer('MAIL_API_KEY');
    const remitente = this.leer('MAIL_FROM');

    if (!clave) {
      this.ultimoError = 'MAIL_API_KEY no esta definida';
      this.logger.error(
        'MAIL_TRANSPORT=api pero falta MAIL_API_KEY. No se enviara correo.',
      );
      return;
    }

    if (!remitente) {
      this.ultimoError = 'MAIL_FROM no esta definida';
      this.logger.error(
        'MAIL_TRANSPORT=api requiere MAIL_FROM con un remitente verificado en el proveedor.',
      );
      return;
    }

    if (this.proveedorApi === 'emailjs') {
      const faltantes = ['MAIL_EMAILJS_SERVICE_ID', 'MAIL_EMAILJS_TEMPLATE_ID', 'MAIL_EMAILJS_PUBLIC_KEY']
        .filter((clave) => !this.leer(clave));

      if (faltantes.length) {
        this.ultimoError = `Faltan variables de EmailJS: ${faltantes.join(', ')}`;
        this.logger.error(this.ultimoError);
        return;
      }
    }

    if (!['resend', 'brevo', 'emailjs'].includes(this.proveedorApi)) {
      this.ultimoError = `Proveedor de API no soportado: ${this.proveedorApi}`;
      this.logger.error(this.ultimoError);
      return;
    }

    this.modo = 'api';
    this.logger.log(
      `Transporte de correo por API HTTPS (${this.proveedorApi}). Los puertos SMTP no se utilizan.`,
    );
  }

  private async configurarSmtp(): Promise<void> {
    const host = this.leer('MAIL_HOST');
    const usuario = this.leer('MAIL_USER');
    const password = this.leer('MAIL_PASSWORD').replace(/\s+/g, '');

    if (!host || !usuario || !password) {
      this.logger.error(
        'MAIL_ENABLED esta activo pero faltan MAIL_HOST, MAIL_USER o MAIL_PASSWORD. No se enviara correo.',
      );
      return;
    }

    const puerto = Number(this.leer('MAIL_PORT')) || 587;

    if ([25, 465, 587].includes(puerto) && this.enPlataformaSinSmtp()) {
      this.logger.warn(
        `El puerto ${puerto} suele estar bloqueado para trafico saliente en plataformas de despliegue como Render. ` +
          'Si observa "Connection timeout", use MAIL_TRANSPORT=api con MAIL_API_KEY, o un proveedor SMTP que ofrezca el puerto 2525.',
      );
    }

    const forzarIPv4 =
      (this.configService.get<string>('MAIL_FORCE_IPV4') ?? 'true')
        .trim()
        .toLowerCase() === 'true';

    let hostConexion = host;

    if (forzarIPv4 && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
      try {
        const direccionesIPv4 = await dns.resolve4(host);

        if (direccionesIPv4.length > 0) {
          hostConexion = direccionesIPv4[0];
          this.logger.log(
            `Servidor SMTP ${host} resuelto a IPv4 ${hostConexion}:${puerto}`,
          );
        }
      } catch (error: unknown) {
        this.ultimoError =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `No fue posible resolver ${host} mediante IPv4: ${this.ultimoError}`,
        );
        this.logger.error(
          'El envio de correo real queda deshabilitado para evitar intentos por IPv6. ' +
            'Revise la conectividad IPv4 del entorno de despliegue.',
        );
        return;
      }
    }

    this.transporte = nodemailer.createTransport({
      host: hostConexion,
      port: puerto,
      secure: this.leer('MAIL_SECURE') === 'true',
      auth: { user: usuario, pass: password },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      ...(hostConexion !== host ? { tls: { servername: host } } : {}),
    });

    this.modo = 'smtp';

    try {
      await this.transporte.verify();
      this.logger.log(
        `Servidor de correo verificado en ${host}:${puerto}` +
          (hostConexion !== host ? ` usando IPv4 ${hostConexion}` : ''),
      );
    } catch (error: unknown) {
      this.ultimoError =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No fue posible verificar el servidor de correo: ${this.ultimoError}`,
      );
      if (/invalid login|username and password|535/i.test(this.ultimoError)) {
        this.logger.error(
          'Gmail rechazo las credenciales. Revise que MAIL_PASSWORD sea una contrasena ' +
            'de aplicacion de 16 caracteres sin espacios y que la verificacion en dos pasos este activa.',
        );
      }
      if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(this.ultimoError)) {
        this.logger.error(
          `No se pudo abrir la conexion TCP con ${host}:${puerto}. Es el sintoma tipico de un puerto SMTP ` +
            'bloqueado por la plataforma de despliegue. Configure MAIL_TRANSPORT=api y MAIL_API_KEY.',
        );
      }
    }
  }

  private enPlataformaSinSmtp(): boolean {
    return Boolean(
      this.configService.get<string>('RENDER') ??
        this.configService.get<string>('RENDER_SERVICE_ID'),
    );
  }

  get habilitado(): boolean {
    return (this.configService.get<string>('MAIL_ENABLED') ?? '')
      .trim()
      .toLowerCase() === 'true';
  }

  get estado() {
    return {
      habilitado: this.habilitado,
      modo: this.modo,
      transporteListo: this.modo !== 'ninguno',
      ultimoError: this.ultimoError,
      correosEnSesion: this.bandeja.length,
    };
  }

  bandejaReciente(limite = 10) {
    return this.bandeja.slice(-limite).reverse();
  }

  private remitente(): string {
    const declarado = this.leer('MAIL_FROM');
    const usuario = this.leer('MAIL_USER');

    if (this.modo === 'api') {
      return declarado;
    }

    if (!usuario) {
      return declarado || 'Banco ATM <no-reply@bancoatm.test>';
    }

    if (!declarado || !declarado.includes(usuario)) {
      if (declarado) {
        this.logger.warn(
          `MAIL_FROM no coincide con MAIL_USER. Se enviara como "Banco ATM <${usuario}>" para que el servidor SMTP no rechace el mensaje.`,
        );
      }
      return `Banco ATM <${usuario}>`;
    }

    return declarado;
  }

  private urlPortal(): string {
    const configurada = this.leer('PORTAL_PUBLIC_URL');

    if (!configurada) {
      if (this.enPlataformaSinSmtp()) {
        this.logger.error(
          'PORTAL_PUBLIC_URL no esta definida en el entorno de despliegue. ' +
            'Los enlaces de los correos apuntarian a localhost y no funcionarian para el usuario.',
        );
      }
      return 'http://localhost:5501';
    }

    const limpia = configurada.replace(/\/+$/, '');

    if (/localhost|127\.0\.0\.1/.test(limpia) && this.enPlataformaSinSmtp()) {
      this.logger.error(
        `PORTAL_PUBLIC_URL apunta a ${limpia} en un entorno desplegado. ` +
          'Configurela con la URL publica del Portal para que los enlaces de verificacion funcionen.',
      );
    }

    return limpia;
  }

  private escapar(valor: string): string {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private construirHtml(correo: CorreoPendiente): string {
    const parrafos = correo.parrafos
      .map(
        (texto) =>
          `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151">${this.escapar(texto)}</p>`,
      )
      .join('');

    const codigo = correo.codigo
      ? `<div style="margin:22px 0;padding:18px;background:#f1f5f9;border-radius:10px;text-align:center">
           <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px">Código de verificación</div>
           <div style="font-size:30px;font-weight:700;letter-spacing:.28em;color:#0f172a;font-family:monospace">${this.escapar(correo.codigo)}</div>
         </div>`
      : '';

    const accion = correo.accion
      ? `<div style="margin:24px 0">
           <a href="${this.escapar(correo.accion.url)}"
              style="display:inline-block;padding:12px 22px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">
             ${this.escapar(correo.accion.texto)}
           </a>
         </div>`
      : '';

    const pie = correo.piePersonalizado
      ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b">${this.escapar(correo.piePersonalizado)}</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:24px;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0f172a;padding:20px 26px">
      <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:#0f766e;color:#fff;border-radius:9px;font-weight:700;vertical-align:middle">BA</span>
      <span style="color:#f8fafc;font-size:17px;font-weight:600;margin-left:10px;vertical-align:middle">Banco ATM</span>
    </div>
    <div style="padding:28px 26px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${this.escapar(correo.titulo)}</h1>
      ${parrafos}
      ${codigo}
      ${accion}
    </div>
    <div style="padding:18px 26px;background:#f8fafc;border-top:1px solid #e2e8f0">
      ${pie}
      <p style="margin:0;font-size:12px;color:#94a3b8">
        Banco ATM es una institución ficticia creada como proyecto académico.
        Este mensaje no corresponde a una operación financiera real.
      </p>
    </div>
  </div>
</body></html>`;
  }

  private construirTexto(correo: CorreoPendiente): string {
    const lineas = [correo.titulo, '', ...correo.parrafos];
    if (correo.codigo) {
      lineas.push('', `Código de verificación: ${correo.codigo}`);
    }
    if (correo.accion) {
      lineas.push('', `${correo.accion.texto}: ${correo.accion.url}`);
    }
    if (correo.piePersonalizado) {
      lineas.push('', correo.piePersonalizado);
    }
    lineas.push('', 'Banco ATM · proyecto académico sin operación real.');
    return lineas.join('\n');
  }

  async enviar(correo: CorreoPendiente): Promise<boolean> {
    this.bandeja.push({ ...correo, enviadoEn: new Date() });
    if (this.bandeja.length > 50) {
      this.bandeja.shift();
    }

    if (!correo.para) {
      return false;
    }

    if (this.modo === 'ninguno') {
      this.logger.log(
        `[correo simulado] para=${correo.para} asunto="${correo.asunto}"` +
          (correo.codigo ? ` codigo=${correo.codigo}` : '') +
          (correo.accion ? ` enlace=${correo.accion.url}` : ''),
      );
      return false;
    }

    try {
      if (this.modo === 'api') {
        await this.enviarPorApi(correo);
      } else {
        await this.enviarPorSmtp(correo);
      }
      this.logger.log(`Correo enviado a ${correo.para}: ${correo.asunto}`);
      return true;
    } catch (error) {
      this.ultimoError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `No fue posible enviar el correo a ${correo.para}: ${this.ultimoError}`,
      );
      return false;
    }
  }

  private async enviarPorSmtp(correo: CorreoPendiente): Promise<void> {
    if (!this.transporte) {
      throw new Error('El transporte SMTP no esta inicializado');
    }

    await this.transporte.sendMail({
      from: this.remitente(),
      to: correo.para,
      subject: correo.asunto,
      text: this.construirTexto(correo),
      html: this.construirHtml(correo),
    });
  }

  private async enviarPorApi(correo: CorreoPendiente): Promise<void> {
    const clave = this.leer('MAIL_API_KEY');
    const remitente = this.remitente();
    const html = this.construirHtml(correo);
    const texto = this.construirTexto(correo);

    if (this.proveedorApi === 'emailjs') {
      await this.enviarPorEmailJs(correo, html, texto);
      return;
    }

    const peticion: {
      url: string;
      cabeceras: Record<string, string>;
      cuerpo: unknown;
    } =
      this.proveedorApi === 'brevo'
        ? {
            url: 'https://api.brevo.com/v3/smtp/email',
            cabeceras: {
              'api-key': clave,
              'content-type': 'application/json',
              accept: 'application/json',
            },
            cuerpo: {
              sender: this.separarRemitente(remitente),
              to: [{ email: correo.para }],
              subject: correo.asunto,
              htmlContent: html,
              textContent: texto,
            },
          }
        : {
            url: 'https://api.resend.com/emails',
            cabeceras: {
              authorization: `Bearer ${clave}`,
              'content-type': 'application/json',
            },
            cuerpo: {
              from: remitente,
              to: [correo.para],
              subject: correo.asunto,
              html,
              text: texto,
            },
          };

    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), 15000);

    try {
      const respuesta = await fetch(peticion.url, {
        method: 'POST',
        headers: peticion.cabeceras,
        body: JSON.stringify(peticion.cuerpo),
        signal: control.signal,
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.text();

        if (
          respuesta.status === 403 &&
          /verify a domain|only send testing emails/i.test(detalle)
        ) {
          throw new Error(
            'Resend solo permite enviar al correo de la propia cuenta mientras no exista un dominio verificado. ' +
              'Para enviar a cualquier destinatario sin comprar un dominio, use MAIL_API_PROVIDER=brevo, ' +
              'que permite verificar una unica direccion de remitente. ' +
              `Detalle: ${detalle.slice(0, 200)}`,
          );
        }

        if (
          respuesta.status === 401 &&
          this.proveedorApi === 'brevo'
        ) {
          throw new Error(
            'Brevo rechazo la clave. Compruebe que MAIL_API_KEY es una clave v3 creada en SMTP & API > API Keys. ' +
              `Detalle: ${detalle.slice(0, 200)}`,
          );
        }

        if (
          respuesta.status === 400 &&
          this.proveedorApi === 'brevo' &&
          /sender/i.test(detalle)
        ) {
          throw new Error(
            'Brevo no reconoce el remitente de MAIL_FROM. Verifique esa direccion en Senders, Domains & Dedicated IPs > Senders. ' +
              `Detalle: ${detalle.slice(0, 200)}`,
          );
        }

        throw new Error(
          `${this.proveedorApi} respondio ${respuesta.status}: ${detalle.slice(0, 300)}`,
        );
      }
    } finally {
      clearTimeout(temporizador);
    }
  }

  private async enviarPorEmailJs(
    correo: CorreoPendiente,
    html: string,
    texto: string,
  ): Promise<void> {
    const cuerpo: Record<string, unknown> = {
      service_id: this.leer('MAIL_EMAILJS_SERVICE_ID'),
      template_id: this.leer('MAIL_EMAILJS_TEMPLATE_ID'),
      user_id: this.leer('MAIL_EMAILJS_PUBLIC_KEY'),
      template_params: {
        to_email: correo.para,
        subject: correo.asunto,
        title: correo.titulo,
        body_html: html,
        body_text: texto,
        code: correo.codigo ?? '',
        action_text: correo.accion?.texto ?? '',
        action_url: correo.accion?.url ?? '',
        footer: correo.piePersonalizado ?? '',
      },
    };

    const privada = this.leer('MAIL_EMAILJS_PRIVATE_KEY');

    if (privada) {
      cuerpo.accessToken = privada;
    }

    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), 15000);

    try {
      const respuesta = await fetch(
        'https://api.emailjs.com/api/v1.0/email/send',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(cuerpo),
          signal: control.signal,
        },
      );

      if (!respuesta.ok) {
        const detalle = await respuesta.text();

        if (/non-browser|API calls are disabled/i.test(detalle)) {
          throw new Error(
            'EmailJS rechaza las llamadas desde el servidor. Active "Allow EmailJS API for non-browser applications" ' +
              `en Account > Security y defina MAIL_EMAILJS_PRIVATE_KEY. Detalle: ${detalle.slice(0, 200)}`,
          );
        }

        throw new Error(
          `emailjs respondio ${respuesta.status}: ${detalle.slice(0, 300)}`,
        );
      }
    } finally {
      clearTimeout(temporizador);
    }
  }

  private separarRemitente(remitente: string): {
    name: string;
    email: string;
  } {
    const coincidencia = remitente.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);

    if (coincidencia) {
      return { name: coincidencia[1] || 'Banco ATM', email: coincidencia[2] };
    }

    return { name: 'Banco ATM', email: remitente.trim() };
  }

  async avisoInicioSesion(
    para: string,
    nombre: string,
    canal: string,
    momento: Date,
  ): Promise<boolean> {
    const fecha = momento.toLocaleString('es-MX', {
      timeZone:
        this.configService.get<string>('APP_TIMEZONE') ??
        'America/Mexico_City',
      dateStyle: 'long',
      timeStyle: 'short',
    });

    return this.enviar({
      para,
      asunto: 'Inicio de sesión en su banca en línea',
      titulo: 'Detectamos un inicio de sesión',
      parrafos: [
        `Hola ${nombre}:`,
        `Se inició sesión en su cuenta de Banco ATM el ${fecha}, desde el canal ${canal}.`,
        'Si fue usted, puede ignorar este mensaje. No necesita hacer nada.',
        'Si no reconoce esta actividad, entre al portal y cambie su contraseña de inmediato desde la sección Mi perfil. Si su tarjeta también pudo verse comprometida, bloquéela desde Mis tarjetas.',
      ],
      accion: {
        texto: 'Entrar al portal y revisar mi cuenta',
        url: `${this.urlPortal()}/login`,
      },
      piePersonalizado:
        'Banco ATM nunca le pedirá su contraseña ni su PIN por correo o por teléfono.',
    });
  }

  async codigoVerificacion(
    para: string,
    nombre: string,
    codigo: string,
  ): Promise<boolean> {
    return this.enviar({
      para,
      asunto: 'Verifique su correo para activar su cuenta',
      titulo: 'Confirme su correo electrónico',
      parrafos: [
        `Hola ${nombre}:`,
        'Gracias por registrarse en Banco ATM. Para activar su cuenta necesitamos comprobar que este correo le pertenece.',
        'Escriba el siguiente código en la pantalla de verificación. El código vence en 30 minutos.',
      ],
      codigo,
      accion: {
        texto: 'Abrir la pantalla de verificación',
        url: `${this.urlPortal()}/verificar?correo=${encodeURIComponent(para)}&codigo=${encodeURIComponent(codigo)}`,
      },
      piePersonalizado:
        'Si usted no solicitó esta cuenta, ignore este mensaje: la cuenta no se activará sin el código.',
    });
  }

  async cuentaAbierta(
    para: string,
    nombre: string,
    numeroCuenta: string,
    numeroTarjeta: string,
    pinInicial: string,
  ): Promise<boolean> {
    return this.enviar({
      para,
      asunto: 'Su cuenta de Banco ATM ya está activa',
      titulo: 'Su cuenta bancaria fue creada',
      parrafos: [
        `Hola ${nombre}:`,
        `Confirmamos su correo y abrimos su cuenta ${numeroCuenta}. Ya puede consultar su saldo, recibir transferencias, pagar servicios y solicitar productos desde su banca en línea.`,
        `También emitimos su tarjeta de débito ${numeroTarjeta}. Su PIN inicial es ${pinInicial}: cámbielo en el primer cajero que utilice.`,
        'Su cuenta comienza con saldo cero. Puede recibir una transferencia o hacer un depósito en cualquier cajero para empezar a operar.',
      ],
      accion: {
        texto: 'Entrar a mi banca en línea',
        url: `${this.urlPortal()}/login`,
      },
      piePersonalizado:
        'Banco ATM nunca le pedirá su contraseña ni su PIN por correo o por teléfono.',
    });
  }

  async cuentaEliminada(para: string, nombre: string): Promise<boolean> {
    return this.enviar({
      para,
      asunto: 'Su cuenta de Banco ATM fue eliminada',
      titulo: 'Su cuenta fue eliminada',
      parrafos: [
        `Hola ${nombre}:`,
        'Le informamos que su cuenta de Banco ATM fue eliminada por el banco. A partir de este momento no podrá iniciar sesión ni utilizar sus tarjetas.',
        'Sus operaciones anteriores permanecen registradas en nuestros archivos por obligación de auditoría, pero ya no están disponibles para consulta desde la banca en línea.',
        'Si desea volver a utilizar Banco ATM, puede crear una cuenta nueva desde nuestro portal web cuando lo desee.',
      ],
      accion: {
        texto: 'Crear una cuenta nueva',
        url: `${this.urlPortal()}/crearcuenta`,
      },
      piePersonalizado:
        'Si no solicitó esta baja y cree que se trata de un error, comuníquese con atención a clientes.',
    });
  }

  async recuperacionPassword(
    para: string,
    nombre: string,
    codigo: string,
    minutos: number,
    idioma = 'es',
  ): Promise<boolean> {
    const enlace = `${this.urlPortal()}/recuperar?correo=${encodeURIComponent(para)}&codigo=${encodeURIComponent(codigo)}`;

    if (idioma === 'en') {
      return this.enviar({
        para,
        asunto: 'Reset your Banco ATM password',
        titulo: 'Reset your password',
        parrafos: [
          `Hello ${nombre}:`,
          'We received a request to reset the password of your Banco ATM online banking.',
          `Enter the following code on the recovery screen. It expires in ${minutos} minutes.`,
        ],
        codigo,
        accion: { texto: 'Open the recovery screen', url: enlace },
        piePersonalizado:
          'If you did not request this change, ignore this message: your password will remain unchanged.',
      });
    }

    return this.enviar({
      para,
      asunto: 'Restablezca su contraseña de Banco ATM',
      titulo: 'Restablezca su contraseña',
      parrafos: [
        `Hola ${nombre}:`,
        'Recibimos una solicitud para restablecer la contraseña de su banca en línea de Banco ATM.',
        `Escriba el siguiente código en la pantalla de recuperación. Vence en ${minutos} minutos.`,
      ],
      codigo,
      accion: { texto: 'Abrir la pantalla de recuperación', url: enlace },
      piePersonalizado:
        'Si usted no solicitó este cambio, ignore este mensaje: su contraseña seguirá siendo la misma.',
    });
  }

  async cambioDePerfil(
    para: string,
    nombre: string,
    descripcion: string,
  ): Promise<boolean> {
    return this.enviar({
      para,
      asunto: 'Cambio en los datos de su cuenta',
      titulo: 'Actualizamos los datos de su cuenta',
      parrafos: [
        `Hola ${nombre}:`,
        descripcion,
        'Si usted realizó este cambio, no necesita hacer nada.',
        'Si no reconoce esta modificación, entre al portal y cambie su contraseña de inmediato.',
      ],
      accion: {
        texto: 'Revisar mi perfil',
        url: `${this.urlPortal()}/perfil`,
      },
    });
  }

  async avisoOperacion(
    para: string,
    nombre: string,
    mensaje: string,
  ): Promise<boolean> {
    return this.enviar({
      para,
      asunto: 'Aviso de su cuenta Banco ATM',
      titulo: 'Movimiento en su cuenta',
      parrafos: [
        `Hola ${nombre}:`,
        mensaje,
        'Puede consultar el detalle y el comprobante desde su banca en línea.',
      ],
      accion: {
        texto: 'Ver mis movimientos',
        url: `${this.urlPortal()}/movimientos`,
      },
    });
  }

  async tarjetaAprobada(
    para: string,
    nombre: string,
    nivel: string,
    linea: number,
    numeroEnmascarado: string,
  ): Promise<boolean> {
    return this.enviar({
      para,
      asunto: `Su tarjeta de crédito ${nivel} fue aprobada`,
      titulo: `Bienvenido a la tarjeta ${nivel}`,
      parrafos: [
        `Hola ${nombre}:`,
        `Aprobamos su solicitud de tarjeta de crédito ${nivel}. La tarjeta ${numeroEnmascarado} ya está activa.`,
        `Su línea de crédito autorizada es de ${linea.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`,
        'Puede consultar sus beneficios y el estado de la tarjeta desde la sección Mis tarjetas del portal.',
      ],
      accion: {
        texto: 'Ver mis tarjetas',
        url: `${this.urlPortal()}/tarjetas`,
      },
    });
  }
}
