import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Canal } from '../../common/enums/canal.enum';
import { TipoTransaccion } from '../transactions/enums/tipo-transaccion.enum';
import { PocketsService } from './pockets.service';

describe('PocketsService (apartados del canal movil)', () => {
  const contexto = {
    cuentaId: 'cuenta-1',
    usuarioId: 'usuario-1',
    canal: Canal.APP,
  };

  const construirServicio = (
    cuenta: { id: string; saldo: number },
    apartados: any[],
  ) => {
    const transaccionesCreadas: any[] = [];
    const consultasBloqueadas: any[] = [];

    const manager = {
      findOne: jest.fn((entidad: any, opciones: any) => {
        if (entidad?.name === 'Cuenta') {
          return Promise.resolve(
            cuenta.id === opciones.where.id ? cuenta : null,
          );
        }
        const encontrado = apartados.find(
          (apartado) => apartado.id === opciones.where.id && apartado.activo,
        );
        return Promise.resolve(encontrado ?? null);
      }),
      getRepository: jest.fn(() => ({
        findOne: jest.fn((opciones: any) => {
          consultasBloqueadas.push(opciones);
          const encontrado = apartados.find(
            (apartado) =>
              apartado.id === opciones.where.id &&
              apartado.activo &&
              apartado.cuentaId === opciones.where.cuentaId,
          );
          return Promise.resolve(encontrado ?? null);
        }),
      })),
      save: jest.fn((_entidad: unknown, valor: any) => Promise.resolve(valor)),
      create: jest.fn((_entidad: unknown, valor: any) => {
        const creada = { id: 'transaccion-1', ...valor };
        transaccionesCreadas.push(creada);
        return creada;
      }),
    };

    const dataSource = {
      transaction: jest.fn((callback: (m: unknown) => Promise<unknown>) =>
        callback(manager),
      ),
    };

    const apartadoRepository = {
      find: jest.fn(() =>
        Promise.resolve(apartados.filter((apartado) => apartado.activo)),
      ),
      findOne: jest.fn((opciones: any) => {
        const encontrado = apartados.find(
          (apartado) =>
            apartado.activo &&
            (opciones.where.id
              ? apartado.id === opciones.where.id
              : apartado.nombre === opciones.where.nombre),
        );
        return Promise.resolve(encontrado ?? null);
      }),
      count: jest.fn(() =>
        Promise.resolve(apartados.filter((apartado) => apartado.activo).length),
      ),
      create: jest.fn((valor: any) => ({ id: 'apartado-nuevo', ...valor })),
      save: jest.fn((valor: any) => Promise.resolve(valor)),
    };

    const cuentaRepository = {
      findOne: jest.fn(() => Promise.resolve(cuenta)),
    };

    const auditService = { registrar: jest.fn().mockResolvedValue(undefined) };
    const notificationsService = {
      registrar: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PocketsService(
      dataSource as never,
      apartadoRepository as never,
      cuentaRepository as never,
      auditService as never,
      notificationsService as never,
    );

    return {
      service,
      auditService,
      notificationsService,
      transaccionesCreadas,
      apartadoRepository,
      consultasBloqueadas,
    };
  };

  const apartadoBase = (monto: number) => ({
    id: 'apartado-1',
    nombre: 'Fondo de emergencia',
    monto,
    metaMonto: 1000,
    icono: 'emergencia',
    activo: true,
    cuentaId: 'cuenta-1',
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
  });

  it('descuenta el saldo disponible al apartar y deja el dinero en el apartado', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const apartado = apartadoBase(0);
    const { service, transaccionesCreadas, notificationsService } =
      construirServicio(cuenta, [apartado]);

    const resultado = await service.apartar(contexto, 'apartado-1', {
      monto: 250,
    });

    expect(cuenta.saldo).toBe(750);
    expect(apartado.monto).toBe(250);
    expect(resultado.saldoDisponible).toBe(750);
    expect(resultado.monto).toBe(250);
    expect(transaccionesCreadas[0].tipo).toBe(TipoTransaccion.APARTADO_ABONO);
    expect(notificationsService.registrar).toHaveBeenCalled();
  });

  it('no permite apartar mas dinero del saldo disponible', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 100 };
    const apartado = apartadoBase(0);
    const { service } = construirServicio(cuenta, [apartado]);

    await expect(
      service.apartar(contexto, 'apartado-1', { monto: 500 }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(cuenta.saldo).toBe(100);
    expect(apartado.monto).toBe(0);
  });

  it('rechaza montos por debajo del minimo sin tocar la cuenta', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const apartado = apartadoBase(0);
    const { service } = construirServicio(cuenta, [apartado]);

    await expect(
      service.apartar(contexto, 'apartado-1', { monto: 0.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cuenta.saldo).toBe(1000);
  });

  it('devuelve el dinero del apartado al saldo disponible', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 500 };
    const apartado = apartadoBase(300);
    const { service, transaccionesCreadas } = construirServicio(cuenta, [
      apartado,
    ]);

    const resultado = await service.devolver(contexto, 'apartado-1', {
      monto: 200,
    });

    expect(cuenta.saldo).toBe(700);
    expect(apartado.monto).toBe(100);
    expect(resultado.saldoDisponible).toBe(700);
    expect(transaccionesCreadas[0].tipo).toBe(TipoTransaccion.APARTADO_RETIRO);
  });

  it('no deja retirar mas de lo guardado en el apartado', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 500 };
    const apartado = apartadoBase(100);
    const { service } = construirServicio(cuenta, [apartado]);

    await expect(
      service.devolver(contexto, 'apartado-1', { monto: 400 }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(cuenta.saldo).toBe(500);
    expect(apartado.monto).toBe(100);
  });

  it('rechaza operar sobre un apartado de otra cuenta', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 500 };
    const ajeno = { ...apartadoBase(100), cuentaId: 'cuenta-2' };
    const { service } = construirServicio(cuenta, [ajeno]);

    await expect(
      service.apartar(contexto, 'apartado-1', { monto: 50 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('al cerrar un apartado devuelve todo el dinero guardado', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 200 };
    const apartado = apartadoBase(450);
    const { service, transaccionesCreadas } = construirServicio(cuenta, [
      apartado,
    ]);

    const resultado = await service.eliminar(contexto, 'apartado-1');

    expect(resultado.devuelto).toBe(450);
    expect(cuenta.saldo).toBe(650);
    expect(apartado.activo).toBe(false);
    expect(apartado.monto).toBe(0);
    expect(transaccionesCreadas[0].tipo).toBe(TipoTransaccion.APARTADO_RETIRO);
  });

  it('el resumen separa saldo disponible, total apartado y total de la cuenta', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const { service } = construirServicio(cuenta, [
      apartadoBase(300),
      { ...apartadoBase(200), id: 'apartado-2', nombre: 'Viaje' },
    ]);

    const resumen = await service.listar('cuenta-1');

    expect(resumen.saldoDisponible).toBe(1000);
    expect(resumen.totalApartado).toBe(500);
    expect(resumen.totalCuenta).toBe(1500);
    expect(resumen.apartados).toHaveLength(2);
  });

  it('calcula el progreso frente a la meta declarada', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const { service } = construirServicio(cuenta, [apartadoBase(250)]);

    const resumen = await service.listar('cuenta-1');

    expect(resumen.apartados[0].progreso).toBe(25);
  });

  it('impide crear dos apartados con el mismo nombre', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const { service } = construirServicio(cuenta, [apartadoBase(0)]);

    await expect(
      service.crear(contexto, { nombre: 'Fondo de emergencia' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('impide superar el maximo de apartados activos', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const muchos = Array.from({ length: PocketsService.MAX_APARTADOS }).map(
      (_, indice) => ({
        ...apartadoBase(0),
        id: `apartado-${indice}`,
        nombre: `Apartado ${indice}`,
      }),
    );
    const { service } = construirServicio(cuenta, muchos);

    await expect(
      service.crear(contexto, { nombre: 'Uno mas' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('registra la operacion en auditoria con el canal de origen', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const { service, auditService } = construirServicio(cuenta, [
      apartadoBase(0),
    ]);

    await service.apartar(contexto, 'apartado-1', { monto: 100 });

    expect(auditService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'APARTADO_ABONO',
        canal: Canal.APP,
        entidadAfectada: 'Apartado',
      }),
    );
  });

  it('no pide relaciones al bloquear el apartado, para no romper FOR UPDATE', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const { service, consultasBloqueadas } = construirServicio(cuenta, [
      apartadoBase(0),
    ]);

    await service.apartar(contexto, 'apartado-1', { monto: 100 });

    expect(consultasBloqueadas).not.toHaveLength(0);
    consultasBloqueadas.forEach((consulta) => {
      expect(consulta.relations).toBeUndefined();
      expect(consulta.lock).toEqual({ mode: 'pessimistic_write' });
      expect(consulta.where.cuentaId).toBe('cuenta-1');
    });
  });

  it('tampoco pide relaciones al cerrar el apartado', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 200 };
    const { service, consultasBloqueadas } = construirServicio(cuenta, [
      apartadoBase(450),
    ]);

    await service.eliminar(contexto, 'apartado-1');

    expect(consultasBloqueadas).not.toHaveLength(0);
    consultasBloqueadas.forEach((consulta) => {
      expect(consulta.relations).toBeUndefined();
    });
  });

  it('mantiene la contabilidad exacta en apartar, devolver y cerrar', async () => {
    const cuenta = { id: 'cuenta-1', saldo: 1000 };
    const apartado = apartadoBase(0);
    const { service } = construirServicio(cuenta, [apartado]);

    await service.apartar(contexto, 'apartado-1', { monto: 300 });
    expect(cuenta.saldo).toBe(700);
    expect(apartado.monto).toBe(300);

    await service.devolver(contexto, 'apartado-1', { monto: 100 });
    expect(cuenta.saldo).toBe(800);
    expect(apartado.monto).toBe(200);

    const cierre = await service.eliminar(contexto, 'apartado-1');
    expect(cierre.devuelto).toBe(200);
    expect(cuenta.saldo).toBe(1000);
    expect(apartado.monto).toBe(0);
    expect(apartado.activo).toBe(false);
  });
});
