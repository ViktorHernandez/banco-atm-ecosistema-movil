import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createSign } from 'node:crypto';
import { Repository } from 'typeorm';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { Usuario } from '../users/entities/usuario.entity';
import { CategoriaNotificacion } from '../notifications/enums/categoria-notificacion.enum';
import {
  BajaDispositivoDto,
  RegistrarDispositivoDto,
} from './dto/dispositivo.dto';
import { DispositivoPush } from './entities/dispositivo-push.entity';

export interface AvisoPush {
  mensaje: string;
  mensajeEn?: string;
  categoria: CategoriaNotificacion;
  notificacionId?: string;
  noLeidas?: number;
}

interface CredencialesFirebase {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const TITULOS: Record<string, { es: string; en: string }> = {
  MOVIMIENTO: { es: 'Movimiento en su cuenta', en: 'Account activity' },
  TARJETA: { es: 'Sus tarjetas', en: 'Your cards' },
  PRESTAMO: { es: 'Sus préstamos', en: 'Your loans' },
  SEGURIDAD: { es: 'Seguridad', en: 'Security' },
  PERFIL: { es: 'Su perfil', en: 'Your profile' },
  GENERAL: { es: 'Banco ATM', en: 'Banco ATM' },
};

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger('Push');
  private tokenAcceso: string | null = null;
  private tokenExpira = 0;

  constructor(
    @InjectRepository(DispositivoPush)
    private readonly dispositivoRepository: Repository<DispositivoPush>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly configService: ConfigService,
  ) {}

  private credenciales(): CredencialesFirebase | null {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return {
      projectId: this.limpiar(projectId),
      clientEmail: this.limpiar(clientEmail),
      privateKey: this.limpiar(privateKey).replace(/\\n/g, '\n'),
    };
  }

  private limpiar(valor: string): string {
    return valor.trim().replace(/^["']|["']$/g, '').trim();
  }

  get habilitado(): boolean {
    return this.credenciales() !== null;
  }

  diagnostico() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clave = privateKey ? this.limpiar(privateKey).replace(/\\n/g, '\n') : '';

    return {
      projectIdPresente: Boolean(projectId && projectId.trim()),
      clientEmailPresente: Boolean(clientEmail && clientEmail.trim()),
      privateKeyPresente: Boolean(privateKey && privateKey.trim()),
      privateKeyConEncabezado: clave.startsWith('-----BEGIN'),
      privateKeyConSaltos: clave.includes('\n'),
      longitudPrivateKey: clave.length,
    };
  }

  onModuleInit(): void {
    const estado = this.diagnostico();

    if (!this.habilitado) {
      this.logger.warn(
        `Firebase no configurado. projectId=${estado.projectIdPresente} clientEmail=${estado.clientEmailPresente} privateKey=${estado.privateKeyPresente}`,
      );
      return;
    }

    if (!estado.privateKeyConEncabezado || !estado.privateKeyConSaltos) {
      this.logger.warn(
        'La clave privada de Firebase no tiene el formato PEM esperado. Revise encabezado y saltos de linea.',
      );
      return;
    }

    this.logger.log('Firebase configurado correctamente para notificaciones push');
  }

  private base64url(valor: Buffer | string): string {
    const bufer = typeof valor === 'string' ? Buffer.from(valor) : valor;
    return bufer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async obtenerTokenAcceso(
    credenciales: CredencialesFirebase,
  ): Promise<string | null> {
    const ahora = Math.floor(Date.now() / 1000);

    if (this.tokenAcceso && this.tokenExpira > ahora + 60) {
      return this.tokenAcceso;
    }

    const encabezado = this.base64url(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    );
    const carga = this.base64url(
      JSON.stringify({
        iss: credenciales.clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: ahora,
        exp: ahora + 3600,
      }),
    );

    let firma: string;
    try {
      const firmador = createSign('RSA-SHA256');
      firmador.update(`${encabezado}.${carga}`);
      firmador.end();
      firma = this.base64url(firmador.sign(credenciales.privateKey));
    } catch (error) {
      this.logger.error(
        `No fue posible firmar el token de servicio de Firebase: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }

    try {
      const respuesta = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: `${encabezado}.${carga}.${firma}`,
        }).toString(),
      });

      if (!respuesta.ok) {
        this.logger.error(
          `Firebase rechazo la solicitud de token (${respuesta.status})`,
        );
        return null;
      }

      const datos = (await respuesta.json()) as {
        access_token?: string;
        expires_in?: number;
      };

      if (!datos.access_token) {
        return null;
      }

      this.tokenAcceso = datos.access_token;
      this.tokenExpira = ahora + (datos.expires_in ?? 3600);
      return this.tokenAcceso;
    } catch (error) {
      this.logger.error(
        `No fue posible obtener el token de Firebase: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async registrarDispositivo(
    usuarioId: string,
    cuentaId: string | undefined,
    dto: RegistrarDispositivoDto,
  ) {
    const existente = await this.dispositivoRepository.findOne({
      where: { token: dto.token },
      relations: { usuario: true },
    });

    if (existente) {
      existente.usuario = { id: usuarioId } as Usuario;
      existente.cuenta = cuentaId ? ({ id: cuentaId } as Cuenta) : null;
      existente.plataforma = dto.plataforma ?? existente.plataforma;
      existente.idioma = dto.idioma ?? existente.idioma;
      existente.modelo = dto.modelo ?? existente.modelo ?? null;
      existente.activo = true;
      await this.dispositivoRepository.save(existente);

      return {
        registrado: true,
        push: this.habilitado,
        actualizado: true,
      };
    }

    const dispositivo = this.dispositivoRepository.create({
      token: dto.token,
      plataforma: dto.plataforma ?? 'android',
      idioma: dto.idioma ?? 'es',
      modelo: dto.modelo ?? null,
      activo: true,
      usuario: { id: usuarioId } as Usuario,
      cuenta: cuentaId ? ({ id: cuentaId } as Cuenta) : null,
    });

    await this.dispositivoRepository.save(dispositivo);

    this.logger.log(`Dispositivo registrado para el usuario ${usuarioId}`);

    return { registrado: true, push: this.habilitado, actualizado: false };
  }

  async darDeBaja(usuarioId: string, dto: BajaDispositivoDto) {
    const dispositivo = await this.dispositivoRepository.findOne({
      where: { token: dto.token },
      relations: { usuario: true },
    });

    if (!dispositivo || dispositivo.usuario?.id !== usuarioId) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    dispositivo.activo = false;
    await this.dispositivoRepository.save(dispositivo);

    return { dadoDeBaja: true };
  }

  async listarDeCuenta(cuentaId: string) {
    const dispositivos = await this.dispositivoRepository.find({
      where: { cuenta: { id: cuentaId }, activo: true },
      order: { actualizadoEn: 'DESC' },
    });

    return dispositivos.map((dispositivo) => ({
      id: dispositivo.id,
      plataforma: dispositivo.plataforma,
      idioma: dispositivo.idioma,
      modelo: dispositivo.modelo ?? null,
      registradoEn: dispositivo.creadoEn,
    }));
  }

  private async desactivar(token: string): Promise<void> {
    await this.dispositivoRepository
      .update({ token }, { activo: false })
      .catch(() => undefined);
  }

  private async enviarUno(
    credenciales: CredencialesFirebase,
    tokenAcceso: string,
    dispositivo: DispositivoPush,
    aviso: AvisoPush,
  ): Promise<boolean> {
    const idioma = dispositivo.idioma === 'en' ? 'en' : 'es';
    const titulos = TITULOS[aviso.categoria] ?? TITULOS.GENERAL;
    const cuerpo =
      idioma === 'en' && aviso.mensajeEn ? aviso.mensajeEn : aviso.mensaje;

    const mensaje = {
      message: {
        token: dispositivo.token,
        notification: {
          title: titulos[idioma],
          body: cuerpo,
        },
        data: {
          categoria: aviso.categoria,
          notificacionId: aviso.notificacionId ?? '',
          noLeidas: String(aviso.noLeidas ?? 0),
        },
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: 'movimientos',
            default_sound: true,
          },
        },
      },
    };

    try {
      const respuesta = await fetch(
        `https://fcm.googleapis.com/v1/projects/${credenciales.projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenAcceso}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mensaje),
        },
      );

      if (respuesta.ok) {
        return true;
      }

      if (respuesta.status === 404 || respuesta.status === 400) {
        await this.desactivar(dispositivo.token);
        this.logger.warn(
          `Token de dispositivo invalido, se dio de baja (${respuesta.status})`,
        );
        return false;
      }

      if (respuesta.status === 401 || respuesta.status === 403) {
        this.tokenAcceso = null;
        this.tokenExpira = 0;
      }

      this.logger.error(`Firebase respondio ${respuesta.status} al enviar`);
      return false;
    } catch (error) {
      this.logger.error(
        `No fue posible entregar la notificacion push: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async enviarACuenta(cuentaId: string, aviso: AvisoPush): Promise<number> {
    const credenciales = this.credenciales();

    if (!credenciales) {
      return 0;
    }

    let dispositivos: DispositivoPush[] = [];

    try {
      dispositivos = await this.dispositivoRepository.find({
        where: { cuenta: { id: cuentaId }, activo: true },
      });
    } catch (error) {
      this.logger.error(
        `No fue posible consultar los dispositivos de la cuenta ${cuentaId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }

    if (!dispositivos.length) {
      return 0;
    }

    const tokenAcceso = await this.obtenerTokenAcceso(credenciales);

    if (!tokenAcceso) {
      return 0;
    }

    const resultados = await Promise.all(
      dispositivos.map((dispositivo) =>
        this.enviarUno(credenciales, tokenAcceso, dispositivo, aviso),
      ),
    );

    const entregadas = resultados.filter(Boolean).length;

    if (entregadas > 0) {
      this.logger.log(
        `Push entregada a ${entregadas} dispositivo(s) de la cuenta ${cuentaId}`,
      );
    }

    return entregadas;
  }

  async enviarPrueba(cuentaId: string): Promise<number> {
    const cuenta = await this.cuentaRepository.findOne({
      where: { id: cuentaId },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    return this.enviarACuenta(cuentaId, {
      mensaje: 'Notificación de prueba del ecosistema Banco ATM.',
      mensajeEn: 'Test notification from the Banco ATM ecosystem.',
      categoria: CategoriaNotificacion.GENERAL,
      noLeidas: 0,
    });
  }
}
