import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  let peticiones: Array<{ url: string; opciones: RequestInit }>;
  const fetchOriginal = global.fetch;

  async function crear(
    variables: Record<string, string>,
  ): Promise<MailService> {
    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: { get: (clave: string) => variables[clave] },
        },
      ],
    }).compile();

    const servicio = modulo.get<MailService>(MailService);
    await servicio.onModuleInit();
    return servicio;
  }

  beforeEach(() => {
    peticiones = [];
    global.fetch = jest.fn(async (url: string, opciones: RequestInit) => {
      peticiones.push({ url: String(url), opciones });
      return {
        ok: true,
        status: 200,
        text: async () => '{"id":"correo-1"}',
      } as unknown as Response;
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  describe('seleccion de transporte', () => {
    it('queda simulado cuando MAIL_ENABLED no es true', async () => {
      const servicio = await crear({ MAIL_ENABLED: 'false' });
      expect(servicio.estado.modo).toBe('ninguno');
      expect(servicio.habilitado).toBe(false);
    });

    it('usa la API HTTPS cuando MAIL_TRANSPORT es api', async () => {
      const servicio = await crear({
        MAIL_ENABLED: 'true',
        MAIL_TRANSPORT: 'api',
        MAIL_API_KEY: 'clave-de-prueba',
        MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      });
      expect(servicio.estado.modo).toBe('api');
    });

    it('usa la API cuando solo se define MAIL_API_KEY', async () => {
      const servicio = await crear({
        MAIL_ENABLED: 'true',
        MAIL_API_KEY: 'clave-de-prueba',
        MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      });
      expect(servicio.estado.modo).toBe('api');
    });

    it('no activa la API si falta MAIL_API_KEY', async () => {
      const servicio = await crear({
        MAIL_ENABLED: 'true',
        MAIL_TRANSPORT: 'api',
        MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      });
      expect(servicio.estado.modo).toBe('ninguno');
      expect(servicio.estado.ultimoError).toContain('MAIL_API_KEY');
    });

    it('no activa la API si falta MAIL_FROM', async () => {
      const servicio = await crear({
        MAIL_ENABLED: 'true',
        MAIL_TRANSPORT: 'api',
        MAIL_API_KEY: 'clave-de-prueba',
      });
      expect(servicio.estado.modo).toBe('ninguno');
      expect(servicio.estado.ultimoError).toContain('MAIL_FROM');
    });

    it('rechaza un proveedor de API no soportado', async () => {
      const servicio = await crear({
        MAIL_ENABLED: 'true',
        MAIL_TRANSPORT: 'api',
        MAIL_API_PROVIDER: 'inventado',
        MAIL_API_KEY: 'clave-de-prueba',
        MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      });
      expect(servicio.estado.modo).toBe('ninguno');
    });
  });

  describe('envio por API', () => {
    const base = {
      MAIL_ENABLED: 'true',
      MAIL_TRANSPORT: 'api',
      MAIL_API_PROVIDER: 'resend',
      MAIL_API_KEY: 'clave-de-prueba',
      MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      PORTAL_PUBLIC_URL: 'https://portal.example.test',
    };

    it('envia el codigo de verificacion sobre HTTPS', async () => {
      const servicio = await crear(base);
      const enviado = await servicio.codigoVerificacion(
        'cliente@example.test',
        'Cliente',
        '123456',
      );

      expect(enviado).toBe(true);
      expect(peticiones).toHaveLength(1);
      expect(peticiones[0].url).toBe('https://api.resend.com/emails');
    });

    it('no utiliza ningun puerto SMTP', async () => {
      const servicio = await crear(base);
      await servicio.codigoVerificacion('c@example.test', 'C', '123456');

      const url = new URL(peticiones[0].url);
      expect(url.protocol).toBe('https:');
      expect(url.port).toBe('');
    });

    it('construye el enlace con la URL publica del portal', async () => {
      const servicio = await crear(base);
      await servicio.codigoVerificacion('c@example.test', 'C', '654321');

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.text).toContain(
        'https://portal.example.test/verificar?correo=',
      );
      expect(cuerpo.text).not.toContain('localhost');
      expect(cuerpo.html).not.toContain('localhost');
    });

    it('conserva el codigo y el correo real sin alterarlos', async () => {
      const servicio = await crear(base);
      await servicio.codigoVerificacion(
        'cliente+prueba@example.test',
        'Cliente',
        '987654',
      );

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.to).toEqual(['cliente+prueba@example.test']);
      expect(cuerpo.text).toContain('987654');
    });

    it('usa el formato de Brevo cuando se selecciona ese proveedor', async () => {
      const servicio = await crear({
        ...base,
        MAIL_API_PROVIDER: 'brevo',
      });
      await servicio.codigoVerificacion('c@example.test', 'C', '111111');

      expect(peticiones[0].url).toBe('https://api.brevo.com/v3/smtp/email');
      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.sender).toEqual({
        name: 'Banco ATM',
        email: 'no-reply@example.test',
      });
      expect(cuerpo.to).toEqual([{ email: 'c@example.test' }]);
    });

    it('respeta MAIL_FROM sin sustituirlo por MAIL_USER', async () => {
      const servicio = await crear({ ...base, MAIL_USER: 'otro@gmail.test' });
      await servicio.codigoVerificacion('c@example.test', 'C', '222222');

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.from).toBe('Banco ATM <no-reply@example.test>');
    });

    it('informa el fallo cuando el proveedor responde con error', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 422,
        text: async () => '{"message":"remitente no verificado"}',
      })) as unknown as typeof fetch;

      const servicio = await crear(base);
      const enviado = await servicio.codigoVerificacion(
        'c@example.test',
        'C',
        '333333',
      );

      expect(enviado).toBe(false);
      expect(servicio.estado.ultimoError).toContain('422');
    });

    it('mantiene todos los correos del sistema sobre el mismo transporte', async () => {
      const servicio = await crear(base);

      await servicio.codigoVerificacion('c@example.test', 'C', '123456');
      await servicio.cuentaAbierta(
        'c@example.test',
        'C',
        '1000000001',
        '**** 0001',
        '1234',
      );
      await servicio.avisoInicioSesion(
        'c@example.test',
        'C',
        'WEB',
        new Date('2026-03-15T12:00:00.000Z'),
      );
      await servicio.cuentaEliminada('c@example.test', 'C');
      await servicio.cambioDePerfil('c@example.test', 'C', 'Cambio de correo');
      await servicio.avisoOperacion('c@example.test', 'C', 'Deposito aplicado');
      await servicio.tarjetaAprobada('c@example.test', 'C', 'Oro', 30000, '**** 1234');

      expect(peticiones).toHaveLength(7);
      peticiones.forEach((peticion) => {
        expect(peticion.url).toBe('https://api.resend.com/emails');
      });
    });

    it('ningun correo del sistema genera enlaces a localhost', async () => {
      const servicio = await crear(base);

      await servicio.codigoVerificacion('c@example.test', 'C', '123456');
      await servicio.cuentaAbierta('c@example.test', 'C', '1', '2', '3');
      await servicio.avisoInicioSesion('c@example.test', 'C', 'WEB', new Date());
      await servicio.cuentaEliminada('c@example.test', 'C');
      await servicio.cambioDePerfil('c@example.test', 'C', 'Cambio');
      await servicio.avisoOperacion('c@example.test', 'C', 'Aviso');
      await servicio.tarjetaAprobada('c@example.test', 'C', 'Oro', 1, '3');

      peticiones.forEach((peticion) => {
        expect(String(peticion.opciones.body)).not.toContain('localhost');
        expect(String(peticion.opciones.body)).not.toContain('127.0.0.1');
      });
    });
  });

  describe('proveedor EmailJS', () => {
    const base = {
      MAIL_ENABLED: 'true',
      MAIL_TRANSPORT: 'api',
      MAIL_API_PROVIDER: 'emailjs',
      MAIL_API_KEY: 'no-usada-por-emailjs',
      MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      MAIL_EMAILJS_SERVICE_ID: 'service_pruebas',
      MAIL_EMAILJS_TEMPLATE_ID: 'template_pruebas',
      MAIL_EMAILJS_PUBLIC_KEY: 'clave-publica',
      MAIL_EMAILJS_PRIVATE_KEY: 'clave-privada',
      PORTAL_PUBLIC_URL: 'https://portal.example.test',
    };

    it('envia por HTTPS al endpoint de EmailJS', async () => {
      const servicio = await crear(base);
      const enviado = await servicio.codigoVerificacion(
        'c@example.test',
        'C',
        '123456',
      );

      expect(enviado).toBe(true);
      expect(peticiones[0].url).toBe(
        'https://api.emailjs.com/api/v1.0/email/send',
      );
    });

    it('envia los identificadores y el token privado del servidor', async () => {
      const servicio = await crear(base);
      await servicio.codigoVerificacion('c@example.test', 'C', '123456');

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.service_id).toBe('service_pruebas');
      expect(cuerpo.template_id).toBe('template_pruebas');
      expect(cuerpo.user_id).toBe('clave-publica');
      expect(cuerpo.accessToken).toBe('clave-privada');
    });

    it('pasa el contenido como variables de plantilla', async () => {
      const servicio = await crear(base);
      await servicio.codigoVerificacion('c@example.test', 'C', '246810');

      const parametros = JSON.parse(
        String(peticiones[0].opciones.body),
      ).template_params;
      expect(parametros.to_email).toBe('c@example.test');
      expect(parametros.code).toBe('246810');
      expect(parametros.action_url).toContain(
        'https://portal.example.test/verificar',
      );
      expect(parametros.action_url).not.toContain('localhost');
    });

    it('no arranca si faltan identificadores de EmailJS', async () => {
      const servicio = await crear({
        ...base,
        MAIL_EMAILJS_TEMPLATE_ID: '',
      });

      expect(servicio.estado.modo).toBe('ninguno');
      expect(servicio.estado.ultimoError).toContain('MAIL_EMAILJS_TEMPLATE_ID');
    });

    it('explica el bloqueo de llamadas desde servidor', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => 'API calls are disabled for non-browser applications',
      })) as unknown as typeof fetch;

      const servicio = await crear(base);
      const enviado = await servicio.codigoVerificacion(
        'c@example.test',
        'C',
        '111111',
      );

      expect(enviado).toBe(false);
      expect(servicio.estado.ultimoError).toContain('non-browser');
    });

    it('cubre todos los eventos del sistema con una sola plantilla', async () => {
      const servicio = await crear(base);

      await servicio.codigoVerificacion('c@example.test', 'C', '1');
      await servicio.cuentaAbierta('c@example.test', 'C', '1', '2', '3');
      await servicio.avisoInicioSesion('c@example.test', 'C', 'WEB', new Date());
      await servicio.cuentaEliminada('c@example.test', 'C');
      await servicio.cambioDePerfil('c@example.test', 'C', 'Cambio');
      await servicio.avisoOperacion('c@example.test', 'C', 'Aviso');
      await servicio.tarjetaAprobada('c@example.test', 'C', 'Oro', 1, '3');

      expect(peticiones).toHaveLength(7);
      const plantillas = new Set(
        peticiones.map(
          (p) => JSON.parse(String(p.opciones.body)).template_id as string,
        ),
      );
      expect(plantillas.size).toBe(1);
    });

    it('ningun evento genera enlaces a localhost', async () => {
      const servicio = await crear(base);

      await servicio.codigoVerificacion('c@example.test', 'C', '1');
      await servicio.cuentaAbierta('c@example.test', 'C', '1', '2', '3');
      await servicio.cuentaEliminada('c@example.test', 'C');

      peticiones.forEach((p) => {
        expect(String(p.opciones.body)).not.toContain('localhost');
        expect(String(p.opciones.body)).not.toContain('127.0.0.1');
      });
    });
  });

  describe('eleccion de proveedor', () => {
    const base = {
      MAIL_ENABLED: 'true',
      MAIL_TRANSPORT: 'api',
      MAIL_API_KEY: 'clave-de-prueba',
      MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      PORTAL_PUBLIC_URL: 'https://portal.example.test',
    };

    it('usa Brevo cuando no se indica proveedor', async () => {
      const servicio = await crear(base);
      await servicio.codigoVerificacion('c@example.test', 'C', '123456');

      expect(peticiones[0].url).toBe('https://api.brevo.com/v3/smtp/email');
    });

    it('envia a cualquier destinatario, no solo al titular de la cuenta', async () => {
      const servicio = await crear(base);
      await servicio.codigoVerificacion('otro@gmail.test', 'Otro', '123456');

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.to).toEqual([{ email: 'otro@gmail.test' }]);
    });

    it('explica la restriccion de dominio de Resend', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 403,
        text: async () =>
          '{"message":"You can only send testing emails to your own email address. To send emails to other recipients, please verify a domain at resend.com/domains"}',
      })) as unknown as typeof fetch;

      const servicio = await crear({ ...base, MAIL_API_PROVIDER: 'resend' });
      const enviado = await servicio.codigoVerificacion(
        'otro@gmail.test',
        'Otro',
        '123456',
      );

      expect(enviado).toBe(false);
      expect(servicio.estado.ultimoError).toContain('MAIL_API_PROVIDER=brevo');
    });

    it('explica una clave de Brevo invalida', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => '{"message":"Key not found"}',
      })) as unknown as typeof fetch;

      const servicio = await crear(base);
      await servicio.codigoVerificacion('c@example.test', 'C', '123456');

      expect(servicio.estado.ultimoError).toContain('SMTP & API');
    });

    it('explica un remitente no verificado en Brevo', async () => {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => '{"message":"sender is not valid"}',
      })) as unknown as typeof fetch;

      const servicio = await crear(base);
      await servicio.codigoVerificacion('c@example.test', 'C', '123456');

      expect(servicio.estado.ultimoError).toContain('Senders');
    });

    it('cubre los siete correos del sistema con Brevo', async () => {
      const servicio = await crear(base);

      await servicio.codigoVerificacion('c@example.test', 'C', '1');
      await servicio.cuentaAbierta('c@example.test', 'C', '1', '2', '3');
      await servicio.avisoInicioSesion('c@example.test', 'C', 'WEB', new Date());
      await servicio.cuentaEliminada('c@example.test', 'C');
      await servicio.recuperacionPassword('c@example.test', 'C', '123456', 30);
      await servicio.cambioDePerfil('c@example.test', 'C', 'Cambio');
      await servicio.avisoOperacion('c@example.test', 'C', 'Aviso');
      await servicio.tarjetaAprobada('c@example.test', 'C', 'Oro', 1, '3');

      expect(peticiones).toHaveLength(8);
      peticiones.forEach((peticion) => {
        expect(peticion.url).toBe('https://api.brevo.com/v3/smtp/email');
      });
    });

    it('envia el correo de recuperacion en ingles cuando se solicita', async () => {
      const servicio = await crear(base);
      await servicio.recuperacionPassword(
        'c@example.test',
        'C',
        '654321',
        30,
        'en',
      );

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.subject).toBe('Reset your Banco ATM password');
      expect(cuerpo.textContent).toContain('654321');
      expect(cuerpo.textContent).not.toContain('localhost');
    });

    it('envia el correo de recuperacion en espanol por defecto', async () => {
      const servicio = await crear(base);
      await servicio.recuperacionPassword('c@example.test', 'C', '111111', 30);

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.subject).toContain('Restablezca su contraseña');
    });
  });

  describe('enlaces del portal', () => {
    it('cae a localhost solo cuando no hay PORTAL_PUBLIC_URL', async () => {
      const servicio = await crear({
        MAIL_ENABLED: 'true',
        MAIL_TRANSPORT: 'api',
        MAIL_API_PROVIDER: 'resend',
        MAIL_API_KEY: 'clave',
        MAIL_FROM: 'Banco ATM <no-reply@example.test>',
      });
      await servicio.codigoVerificacion('c@example.test', 'C', '123456');

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.text).toContain('http://localhost:5501');
    });

    it('elimina la barra final de PORTAL_PUBLIC_URL', async () => {
      const servicio = await crear({
        MAIL_ENABLED: 'true',
        MAIL_TRANSPORT: 'api',
        MAIL_API_PROVIDER: 'resend',
        MAIL_API_KEY: 'clave',
        MAIL_FROM: 'Banco ATM <no-reply@example.test>',
        PORTAL_PUBLIC_URL: 'https://portal.example.test/',
      });
      await servicio.codigoVerificacion('c@example.test', 'C', '123456');

      const cuerpo = JSON.parse(String(peticiones[0].opciones.body));
      expect(cuerpo.text).toContain('https://portal.example.test/verificar');
      expect(cuerpo.text).not.toContain('example.test//verificar');
    });
  });
});
