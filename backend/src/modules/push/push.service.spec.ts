import { NotFoundException } from '@nestjs/common';
import { generateKeyPairSync } from 'node:crypto';
import { CategoriaNotificacion } from '../notifications/enums/categoria-notificacion.enum';
import { PushService } from './push.service';

describe('PushService (registro de dispositivos y envio FCM)', () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const configuracionCompleta: Record<string, string> = {
    FIREBASE_PROJECT_ID: 'banco-atm-demo',
    FIREBASE_CLIENT_EMAIL: 'push@banco-atm-demo.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: privateKey as string,
  };

  const construirServicio = (
    dispositivos: any[],
    configuracion: Record<string, string> = configuracionCompleta,
  ) => {
    const actualizados: any[] = [];

    const dispositivoRepository = {
      find: jest.fn(() =>
        Promise.resolve(dispositivos.filter((item) => item.activo)),
      ),
      findOne: jest.fn((opciones: any) =>
        Promise.resolve(
          dispositivos.find((item) => item.token === opciones.where.token) ??
            null,
        ),
      ),
      create: jest.fn((valor: any) => ({ id: 'dispositivo-nuevo', ...valor })),
      save: jest.fn((valor: any) => Promise.resolve(valor)),
      update: jest.fn((criterio: any, cambios: any) => {
        actualizados.push({ criterio, cambios });
        const encontrado = dispositivos.find(
          (item) => item.token === criterio.token,
        );
        if (encontrado) {
          Object.assign(encontrado, cambios);
        }
        return Promise.resolve({ affected: 1 });
      }),
    };

    const cuentaRepository = {
      findOne: jest.fn(() => Promise.resolve({ id: 'cuenta-1', saldo: 100 })),
    };

    const configService = {
      get: jest.fn((clave: string) => configuracion[clave]),
    };

    const service = new PushService(
      dispositivoRepository as never,
      cuentaRepository as never,
      configService as never,
    );

    return { service, dispositivoRepository, actualizados };
  };

  const dispositivo = (token: string, idioma = 'es') => ({
    id: `id-${token}`,
    token,
    plataforma: 'android',
    idioma,
    modelo: 'Pixel 7',
    activo: true,
    usuario: { id: 'usuario-1' },
    cuenta: { id: 'cuenta-1' },
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queda deshabilitado cuando faltan las credenciales de Firebase', () => {
    const { service } = construirServicio([], {});
    expect(service.habilitado).toBe(false);
  });

  it('queda habilitado cuando las tres variables estan presentes', () => {
    const { service } = construirServicio([]);
    expect(service.habilitado).toBe(true);
  });

  it('no intenta enviar nada si el servidor no tiene credenciales', async () => {
    const { service } = construirServicio([dispositivo('token-a')], {});
    const peticiones = jest.spyOn(global, 'fetch' as never);

    const entregadas = await service.enviarACuenta('cuenta-1', {
      mensaje: 'Recibio una transferencia',
      categoria: CategoriaNotificacion.MOVIMIENTO,
    });

    expect(entregadas).toBe(0);
    expect(peticiones).not.toHaveBeenCalled();
  });

  it('registra un dispositivo nuevo asociandolo al usuario y la cuenta', async () => {
    const { service, dispositivoRepository } = construirServicio([]);

    const resultado = await service.registrarDispositivo(
      'usuario-1',
      'cuenta-1',
      { token: 'token-nuevo-de-firebase-largo', idioma: 'en' },
    );

    expect(resultado.registrado).toBe(true);
    expect(resultado.actualizado).toBe(false);
    expect(dispositivoRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-nuevo-de-firebase-largo',
        idioma: 'en',
        activo: true,
      }),
    );
  });

  it('reasigna el token si el mismo telefono lo usa otro usuario', async () => {
    const existente = dispositivo('token-compartido');
    const { service } = construirServicio([existente]);

    const resultado = await service.registrarDispositivo(
      'usuario-2',
      'cuenta-2',
      { token: 'token-compartido' },
    );

    expect(resultado.actualizado).toBe(true);
    expect(existente.usuario).toEqual({ id: 'usuario-2' });
    expect(existente.cuenta).toEqual({ id: 'cuenta-2' });
  });

  it('rechaza dar de baja un dispositivo de otro usuario', async () => {
    const { service } = construirServicio([dispositivo('token-ajeno')]);

    await expect(
      service.darDeBaja('usuario-2', { token: 'token-ajeno' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('da de baja el dispositivo propio al cerrar sesion', async () => {
    const propio = dispositivo('token-propio');
    const { service } = construirServicio([propio]);

    const resultado = await service.darDeBaja('usuario-1', {
      token: 'token-propio',
    });

    expect(resultado.dadoDeBaja).toBe(true);
    expect(propio.activo).toBe(false);
  });

  it('envia el cuerpo en ingles al dispositivo con idioma en', async () => {
    const { service } = construirServicio([dispositivo('token-en', 'en')]);

    const llamadas: any[] = [];
    jest
      .spyOn(global, 'fetch' as never)
      .mockImplementation(((url: string, opciones: any) => {
        llamadas.push({ url, opciones });
        if (String(url).includes('oauth2')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({ access_token: 'ya29.token', expires_in: 3600 }),
          });
        }
        return Promise.resolve({ ok: true, status: 200 });
      }) as never);

    const entregadas = await service.enviarACuenta('cuenta-1', {
      mensaje: 'Recibió una transferencia de 100.00',
      mensajeEn: 'You received a transfer of 100.00',
      categoria: CategoriaNotificacion.MOVIMIENTO,
    });

    expect(entregadas).toBe(1);

    const envio = llamadas.find((llamada) =>
      String(llamada.url).includes('fcm.googleapis.com'),
    );
    const cuerpo = JSON.parse(envio.opciones.body);

    expect(cuerpo.message.notification.body).toBe(
      'You received a transfer of 100.00',
    );
    expect(cuerpo.message.notification.title).toBe('Account activity');
    expect(cuerpo.message.token).toBe('token-en');
  });

  it('usa el mensaje en espanol cuando el dispositivo esta en es', async () => {
    const { service } = construirServicio([dispositivo('token-es', 'es')]);

    const llamadas: any[] = [];
    jest
      .spyOn(global, 'fetch' as never)
      .mockImplementation(((url: string, opciones: any) => {
        llamadas.push({ url, opciones });
        if (String(url).includes('oauth2')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({ access_token: 'ya29.token', expires_in: 3600 }),
          });
        }
        return Promise.resolve({ ok: true, status: 200 });
      }) as never);

    await service.enviarACuenta('cuenta-1', {
      mensaje: 'Recibió una transferencia de 100.00',
      mensajeEn: 'You received a transfer of 100.00',
      categoria: CategoriaNotificacion.MOVIMIENTO,
    });

    const envio = llamadas.find((llamada) =>
      String(llamada.url).includes('fcm.googleapis.com'),
    );
    const cuerpo = JSON.parse(envio.opciones.body);

    expect(cuerpo.message.notification.body).toBe(
      'Recibió una transferencia de 100.00',
    );
    expect(cuerpo.message.notification.title).toBe('Movimiento en su cuenta');
  });

  it('da de baja el token cuando Firebase responde que ya no existe', async () => {
    const caduco = dispositivo('token-caduco');
    const { service } = construirServicio([caduco]);

    jest
      .spyOn(global, 'fetch' as never)
      .mockImplementation(((url: string) => {
        if (String(url).includes('oauth2')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({ access_token: 'ya29.token', expires_in: 3600 }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      }) as never);

    const entregadas = await service.enviarACuenta('cuenta-1', {
      mensaje: 'Retiro de 500.00',
      categoria: CategoriaNotificacion.MOVIMIENTO,
    });

    expect(entregadas).toBe(0);
    expect(caduco.activo).toBe(false);
  });

  it('no falla cuando la red de Firebase no responde', async () => {
    const { service } = construirServicio([dispositivo('token-red')]);

    jest
      .spyOn(global, 'fetch' as never)
      .mockImplementation((() =>
        Promise.reject(new Error('ECONNRESET'))) as never);

    await expect(
      service.enviarACuenta('cuenta-1', {
        mensaje: 'Deposito de 100.00',
        categoria: CategoriaNotificacion.MOVIMIENTO,
      }),
    ).resolves.toBe(0);
  });

  it('entrega a todos los dispositivos activos de la cuenta', async () => {
    const { service } = construirServicio([
      dispositivo('token-uno'),
      dispositivo('token-dos'),
      { ...dispositivo('token-baja'), activo: false },
    ]);

    jest
      .spyOn(global, 'fetch' as never)
      .mockImplementation(((url: string) => {
        if (String(url).includes('oauth2')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({ access_token: 'ya29.token', expires_in: 3600 }),
          });
        }
        return Promise.resolve({ ok: true, status: 200 });
      }) as never);

    const entregadas = await service.enviarACuenta('cuenta-1', {
      mensaje: 'Pago aplicado',
      categoria: CategoriaNotificacion.MOVIMIENTO,
    });

    expect(entregadas).toBe(2);
  });

  it('solo pide un token de acceso para varios envios seguidos', async () => {
    const { service } = construirServicio([dispositivo('token-cache')]);

    let solicitudesDeToken = 0;
    jest
      .spyOn(global, 'fetch' as never)
      .mockImplementation(((url: string) => {
        if (String(url).includes('oauth2')) {
          solicitudesDeToken += 1;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({ access_token: 'ya29.token', expires_in: 3600 }),
          });
        }
        return Promise.resolve({ ok: true, status: 200 });
      }) as never);

    await service.enviarACuenta('cuenta-1', {
      mensaje: 'Uno',
      categoria: CategoriaNotificacion.MOVIMIENTO,
    });
    await service.enviarACuenta('cuenta-1', {
      mensaje: 'Dos',
      categoria: CategoriaNotificacion.MOVIMIENTO,
    });

    expect(solicitudesDeToken).toBe(1);
  });
});
