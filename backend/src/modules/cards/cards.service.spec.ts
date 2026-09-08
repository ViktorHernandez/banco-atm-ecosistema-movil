import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Canal } from '../../common/enums/canal.enum';
import { CardsService } from './cards.service';
import { EstadoTarjeta } from './enums/estado-tarjeta.enum';
import { MotivoBloqueo } from './enums/motivo-bloqueo.enum';

describe('CardsService (HU-BE-06 / RF-06 / RF-07 / HU-ATM-10)', () => {
  const construirServicio = (tarjeta: any) => {
    const tarjetaRepository = {
      findOne: jest.fn().mockResolvedValue(tarjeta),
      save: jest.fn().mockImplementation((valor) => Promise.resolve(valor)),
      find: jest.fn().mockResolvedValue([tarjeta]),
    };
    const cuentaRepository = {
      findOne: jest.fn().mockResolvedValue(tarjeta?.cuenta ?? null),
      find: jest.fn().mockResolvedValue([]),
    };
    const auditService = { registrar: jest.fn().mockResolvedValue(undefined) };
    const notificationsService = {
      registrar: jest.fn().mockResolvedValue(undefined),
    };
    const mailService = {
      tarjetaAprobada: jest.fn().mockResolvedValue(true),
    };

    const service = new CardsService(
      tarjetaRepository as never,
      cuentaRepository as never,
      auditService as never,
      notificationsService as never,
      mailService as never,
    );

    return { service, tarjetaRepository, auditService };
  };

  const tarjetaBase = (overrides: Record<string, unknown> = {}) => ({
    id: 'tarjeta-1',
    numeroTarjeta: '4000000000000001',
    pinHash: '',
    estado: EstadoTarjeta.ACTIVA,
    intentosFallidos: 0,
    motivoBloqueo: null,
    emitidaEn: new Date(),
    cvv: '123',
    expiraEn: '2030-01-31',
    cuenta: {
      id: 'cuenta-1',
      numeroCuenta: '1000000001',
      usuario: { id: 'usuario-1', nombreCompleto: 'Cliente Uno', activo: true },
    },
    ...overrides,
  });

  describe('detallePropia', () => {
    it('entrega el numero completo, el CVV y la vigencia al titular', async () => {
      const tarjeta = tarjetaBase();
      const { service } = construirServicio(tarjeta);

      const detalle = await service.detallePropia('cuenta-1', 'tarjeta-1');

      expect(detalle.numeroCompleto).toBe('4000000000000001');
      expect(detalle.cvv).toBe('123');
      expect(detalle.expiraEn).toBe('2030-01-31');
      expect(detalle.emitidaEn).toBeDefined();
    });

    it('conserva el numero enmascarado junto al completo', async () => {
      const tarjeta = tarjetaBase();
      const { service } = construirServicio(tarjeta);

      const detalle = await service.detallePropia('cuenta-1', 'tarjeta-1');

      expect(detalle.numeroTarjeta).toBe('****0001');
    });

    it('rechaza la consulta de una tarjeta de otra cuenta', async () => {
      const tarjeta = tarjetaBase();
      const { service } = construirServicio(tarjeta);

      await expect(
        service.detallePropia('cuenta-ajena', 'tarjeta-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no filtra datos sensibles cuando la cuenta no coincide', async () => {
      const tarjeta = tarjetaBase();
      const { service } = construirServicio(tarjeta);

      await expect(
        service.detallePropia('cuenta-ajena', 'tarjeta-1'),
      ).rejects.not.toHaveProperty('cvv');
    });

    it('rechaza la consulta si el titular fue dado de baja', async () => {
      const tarjeta = tarjetaBase({
        cuenta: {
          id: 'cuenta-1',
          numeroCuenta: '1000000001',
          usuario: { id: 'usuario-1', activo: false },
        },
      });
      const { service } = construirServicio(tarjeta);

      await expect(
        service.detallePropia('cuenta-1', 'tarjeta-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('devuelve 404 cuando la tarjeta no existe', async () => {
      const { service } = construirServicio(null);

      await expect(
        service.detallePropia('cuenta-1', 'inexistente'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('incluye la linea de credito en tarjetas de credito', async () => {
      const tarjeta = tarjetaBase({
        tipo: 'CREDITO',
        limiteCredito: 30000,
        creditoUtilizado: 5000,
      });
      const { service } = construirServicio(tarjeta);

      const detalle = await service.detallePropia('cuenta-1', 'tarjeta-1');

      expect(detalle.limiteCredito).toBe(30000);
      expect(detalle.creditoDisponible).toBe(25000);
    });
  });

  it('bloquea la tarjeta a solicitud del cliente y marca el motivo', async () => {
    const tarjeta = tarjetaBase();
    const { service } = construirServicio(tarjeta);

    const resultado = await service.bloquearPropia(
      'cuenta-1',
      'usuario-1',
      Canal.ATM,
    );

    expect(tarjeta.estado).toBe(EstadoTarjeta.BLOQUEADA);
    expect(tarjeta.motivoBloqueo).toBe(MotivoBloqueo.CLIENTE);
    expect(resultado.numeroTarjeta).toBe('****0001');
  });

  it('permite desbloquear solo cuando el bloqueo lo hizo el propio cliente (RF-07)', async () => {
    const tarjeta = tarjetaBase({
      estado: EstadoTarjeta.BLOQUEADA,
      motivoBloqueo: MotivoBloqueo.CLIENTE,
      intentosFallidos: 0,
    });
    const { service } = construirServicio(tarjeta);

    await service.desbloquearPropia('cuenta-1', 'usuario-1', Canal.WEB);

    expect(tarjeta.estado).toBe(EstadoTarjeta.ACTIVA);
    expect(tarjeta.motivoBloqueo).toBeNull();
  });

  it('impide el autodesbloqueo cuando el bloqueo fue por intentos fallidos', async () => {
    const tarjeta = tarjetaBase({
      estado: EstadoTarjeta.BLOQUEADA,
      motivoBloqueo: MotivoBloqueo.INTENTOS_FALLIDOS,
      intentosFallidos: 3,
    });
    const { service } = construirServicio(tarjeta);

    await expect(
      service.desbloquearPropia('cuenta-1', 'usuario-1', Canal.WEB),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tarjeta.estado).toBe(EstadoTarjeta.BLOQUEADA);
  });

  it('rechaza el cambio de PIN cuando el PIN actual es incorrecto', async () => {
    const tarjeta = tarjetaBase({ pinHash: await bcrypt.hash('1234', 4) });
    const { service } = construirServicio(tarjeta);

    await expect(
      service.cambiarPin('cuenta-1', 'usuario-1', Canal.ATM, {
        pinActual: '0000',
        pinNuevo: '4321',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('actualiza el PIN cuando las credenciales son correctas', async () => {
    const tarjeta = tarjetaBase({ pinHash: await bcrypt.hash('1234', 4) });
    const { service } = construirServicio(tarjeta);

    const resultado = await service.cambiarPin(
      'cuenta-1',
      'usuario-1',
      Canal.ATM,
      { pinActual: '1234', pinNuevo: '4321' },
    );

    expect(resultado.mensaje).toContain('actualizado');
    await expect(bcrypt.compare('4321', tarjeta.pinHash)).resolves.toBe(true);
  });

  it('reactiva la tarjeta y limpia intentos cuando lo hace un administrador (RF-18)', async () => {
    const tarjeta = tarjetaBase({
      estado: EstadoTarjeta.BLOQUEADA,
      motivoBloqueo: MotivoBloqueo.INTENTOS_FALLIDOS,
      intentosFallidos: 3,
    });
    const { service } = construirServicio(tarjeta);

    await service.actualizarEstadoComoAdministrador(
      'tarjeta-1',
      EstadoTarjeta.ACTIVA,
      'admin-1',
    );

    expect(tarjeta.estado).toBe(EstadoTarjeta.ACTIVA);
    expect(tarjeta.intentosFallidos).toBe(0);
    expect(tarjeta.motivoBloqueo).toBeNull();
  });
});
