import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Canal } from '../../common/enums/canal.enum';
import { AuditService } from '../audit/audit.service';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CategoriaNotificacion } from '../notifications/enums/categoria-notificacion.enum';
import { Transaccion } from '../transactions/entities/transaccion.entity';
import { EstadoTransaccion } from '../transactions/enums/estado-transaccion.enum';
import { TipoTransaccion } from '../transactions/enums/tipo-transaccion.enum';
import { Apartado } from './entities/apartado.entity';
import {
  ActualizarApartadoDto,
  CrearApartadoDto,
  MovimientoApartadoDto,
} from './dto/apartado.dto';

export interface ContextoApartado {
  cuentaId: string;
  usuarioId: string;
  canal: Canal;
}

@Injectable()
export class PocketsService {
  static readonly MAX_APARTADOS = 8;
  static readonly MONTO_MINIMO = 1;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Apartado)
    private readonly apartadoRepository: Repository<Apartado>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private presentar(apartado: Apartado) {
    const meta = apartado.metaMonto ?? null;
    const progreso =
      meta && meta > 0
        ? Math.min(100, Math.round((apartado.monto / meta) * 100))
        : null;

    return {
      id: apartado.id,
      nombre: apartado.nombre,
      monto: apartado.monto,
      metaMonto: meta,
      progreso,
      icono: apartado.icono,
      creadoEn: apartado.creadoEn,
      actualizadoEn: apartado.actualizadoEn,
    };
  }

  private async apartadoPropio(
    cuentaId: string,
    apartadoId: string,
    manager?: EntityManager,
  ): Promise<Apartado> {
    const repositorio = manager
      ? manager.getRepository(Apartado)
      : this.apartadoRepository;

    const apartado = await repositorio.findOne({
      where: { id: apartadoId, activo: true, cuentaId },
      lock: manager ? { mode: 'pessimistic_write' } : undefined,
    });

    if (!apartado) {
      throw new NotFoundException('Apartado no encontrado');
    }

    return apartado;
  }

  private async bloquearCuenta(
    manager: EntityManager,
    cuentaId: string,
  ): Promise<Cuenta> {
    const cuenta = await manager.findOne(Cuenta, {
      where: { id: cuentaId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    return cuenta;
  }

  async listar(cuentaId: string) {
    const apartados = await this.apartadoRepository.find({
      where: { cuentaId, activo: true },
      order: { creadoEn: 'ASC' },
    });

    const cuenta = await this.cuentaRepository.findOne({
      where: { id: cuentaId },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    const totalApartado = this.redondear(
      apartados.reduce((suma, apartado) => suma + apartado.monto, 0),
    );

    return {
      saldoDisponible: cuenta.saldo,
      totalApartado,
      totalCuenta: this.redondear(cuenta.saldo + totalApartado),
      maximoApartados: PocketsService.MAX_APARTADOS,
      apartados: apartados.map((apartado) => this.presentar(apartado)),
    };
  }

  async detalle(cuentaId: string, apartadoId: string) {
    const apartado = await this.apartadoPropio(cuentaId, apartadoId);
    return this.presentar(apartado);
  }

  async crear(contexto: ContextoApartado, dto: CrearApartadoDto) {
    const existentes = await this.apartadoRepository.count({
      where: { cuentaId: contexto.cuentaId, activo: true },
    });

    if (existentes >= PocketsService.MAX_APARTADOS) {
      throw new ConflictException(
        `No es posible tener más de ${PocketsService.MAX_APARTADOS} apartados activos`,
      );
    }

    const duplicado = await this.apartadoRepository.findOne({
      where: {
        cuentaId: contexto.cuentaId,
        nombre: dto.nombre.trim(),
        activo: true,
      },
    });

    if (duplicado) {
      throw new ConflictException('Ya existe un apartado con ese nombre');
    }

    const apartado = this.apartadoRepository.create({
      cuentaId: contexto.cuentaId,
      nombre: dto.nombre.trim(),
      metaMonto: dto.metaMonto ?? null,
      icono: dto.icono ?? 'ahorro',
      monto: 0,
      activo: true,
    });

    const guardado = await this.apartadoRepository.save(apartado);

    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: 'APARTADO_CREADO',
      entidadAfectada: 'Apartado',
      entidadId: guardado.id,
      canal: contexto.canal,
      detalle: guardado.nombre,
    });

    if (dto.montoInicial && dto.montoInicial > 0) {
      return this.apartar(contexto, guardado.id, { monto: dto.montoInicial });
    }

    return this.presentar(guardado);
  }

  async actualizar(
    contexto: ContextoApartado,
    apartadoId: string,
    dto: ActualizarApartadoDto,
  ) {
    const apartado = await this.apartadoPropio(contexto.cuentaId, apartadoId);

    if (dto.nombre) {
      const duplicado = await this.apartadoRepository.findOne({
        where: {
          cuentaId: contexto.cuentaId,
          nombre: dto.nombre.trim(),
          activo: true,
        },
      });

      if (duplicado && duplicado.id !== apartado.id) {
        throw new ConflictException('Ya existe un apartado con ese nombre');
      }

      apartado.nombre = dto.nombre.trim();
    }

    if (dto.metaMonto !== undefined) {
      apartado.metaMonto = dto.metaMonto;
    }

    if (dto.icono) {
      apartado.icono = dto.icono;
    }

    const guardado = await this.apartadoRepository.save(apartado);

    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: 'APARTADO_ACTUALIZADO',
      entidadAfectada: 'Apartado',
      entidadId: guardado.id,
      canal: contexto.canal,
    });

    return this.presentar(guardado);
  }

  async apartar(
    contexto: ContextoApartado,
    apartadoId: string,
    dto: MovimientoApartadoDto,
  ) {
    const monto = this.redondear(dto.monto);

    if (monto < PocketsService.MONTO_MINIMO) {
      throw new BadRequestException(
        `El monto mínimo para apartar es de ${PocketsService.MONTO_MINIMO}`,
      );
    }

    const resultado = await this.dataSource.transaction(async (manager) => {
      const cuenta = await this.bloquearCuenta(manager, contexto.cuentaId);
      const apartado = await this.apartadoPropio(
        contexto.cuentaId,
        apartadoId,
        manager,
      );

      if (cuenta.saldo < monto) {
        throw new ConflictException(
          'Saldo disponible insuficiente para apartar ese monto',
        );
      }

      cuenta.saldo = this.redondear(cuenta.saldo - monto);
      apartado.monto = this.redondear(apartado.monto + monto);

      await manager.save(Cuenta, cuenta);
      await manager.save(Apartado, apartado);

      const transaccion = manager.create(Transaccion, {
        tipo: TipoTransaccion.APARTADO_ABONO,
        monto,
        estado: EstadoTransaccion.EXITOSA,
        canal: contexto.canal,
        cuentaOrigen: cuenta,
        descripcion: `Traspaso al apartado ${apartado.nombre}`,
      });
      await manager.save(Transaccion, transaccion);

      return { cuenta, apartado, transaccion };
    });

    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: 'APARTADO_ABONO',
      entidadAfectada: 'Apartado',
      entidadId: apartadoId,
      canal: contexto.canal,
      detalle: `Monto ${monto}`,
    });

    await this.notificationsService.registrar(
      contexto.cuentaId,
      `Apartó ${monto.toFixed(2)} en ${resultado.apartado.nombre}. Saldo disponible: ${resultado.cuenta.saldo.toFixed(2)}.`,
      undefined,
      {
        categoria: CategoriaNotificacion.MOVIMIENTO,
        mensajeEn: `You set aside ${monto.toFixed(2)} in ${resultado.apartado.nombre}. Available balance: ${resultado.cuenta.saldo.toFixed(2)}.`,
      },
    );

    return {
      ...this.presentar(resultado.apartado),
      saldoDisponible: resultado.cuenta.saldo,
      transaccionId: resultado.transaccion.id,
    };
  }

  async devolver(
    contexto: ContextoApartado,
    apartadoId: string,
    dto: MovimientoApartadoDto,
  ) {
    const monto = this.redondear(dto.monto);

    if (monto < PocketsService.MONTO_MINIMO) {
      throw new BadRequestException(
        `El monto mínimo para retirar de un apartado es de ${PocketsService.MONTO_MINIMO}`,
      );
    }

    const resultado = await this.dataSource.transaction(async (manager) => {
      const cuenta = await this.bloquearCuenta(manager, contexto.cuentaId);
      const apartado = await this.apartadoPropio(
        contexto.cuentaId,
        apartadoId,
        manager,
      );

      if (apartado.monto < monto) {
        throw new ConflictException(
          'El apartado no tiene suficiente dinero guardado',
        );
      }

      apartado.monto = this.redondear(apartado.monto - monto);
      cuenta.saldo = this.redondear(cuenta.saldo + monto);

      await manager.save(Apartado, apartado);
      await manager.save(Cuenta, cuenta);

      const transaccion = manager.create(Transaccion, {
        tipo: TipoTransaccion.APARTADO_RETIRO,
        monto,
        estado: EstadoTransaccion.EXITOSA,
        canal: contexto.canal,
        cuentaDestino: cuenta,
        descripcion: `Retiro del apartado ${apartado.nombre}`,
      });
      await manager.save(Transaccion, transaccion);

      return { cuenta, apartado, transaccion };
    });

    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: 'APARTADO_RETIRO',
      entidadAfectada: 'Apartado',
      entidadId: apartadoId,
      canal: contexto.canal,
      detalle: `Monto ${monto}`,
    });

    await this.notificationsService.registrar(
      contexto.cuentaId,
      `Retiró ${monto.toFixed(2)} del apartado ${resultado.apartado.nombre}. Saldo disponible: ${resultado.cuenta.saldo.toFixed(2)}.`,
      undefined,
      {
        categoria: CategoriaNotificacion.MOVIMIENTO,
        mensajeEn: `You withdrew ${monto.toFixed(2)} from ${resultado.apartado.nombre}. Available balance: ${resultado.cuenta.saldo.toFixed(2)}.`,
      },
    );

    return {
      ...this.presentar(resultado.apartado),
      saldoDisponible: resultado.cuenta.saldo,
      transaccionId: resultado.transaccion.id,
    };
  }

  async eliminar(contexto: ContextoApartado, apartadoId: string) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const cuenta = await this.bloquearCuenta(manager, contexto.cuentaId);
      const apartado = await this.apartadoPropio(
        contexto.cuentaId,
        apartadoId,
        manager,
      );

      const devuelto = apartado.monto;

      if (devuelto > 0) {
        cuenta.saldo = this.redondear(cuenta.saldo + devuelto);
        apartado.monto = 0;
        await manager.save(Cuenta, cuenta);

        const transaccion = manager.create(Transaccion, {
          tipo: TipoTransaccion.APARTADO_RETIRO,
          monto: devuelto,
          estado: EstadoTransaccion.EXITOSA,
          canal: contexto.canal,
          cuentaDestino: cuenta,
          descripcion: `Cierre del apartado ${apartado.nombre}`,
        });
        await manager.save(Transaccion, transaccion);
      }

      apartado.activo = false;
      await manager.save(Apartado, apartado);

      return { cuenta, apartado, devuelto };
    });

    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: 'APARTADO_ELIMINADO',
      entidadAfectada: 'Apartado',
      entidadId: apartadoId,
      canal: contexto.canal,
      detalle: `Devuelto ${resultado.devuelto}`,
    });

    if (resultado.devuelto > 0) {
      await this.notificationsService.registrar(
        contexto.cuentaId,
        `Cerró el apartado ${resultado.apartado.nombre} y devolvió ${resultado.devuelto.toFixed(2)} a su saldo disponible.`,
        undefined,
        {
          categoria: CategoriaNotificacion.MOVIMIENTO,
          mensajeEn: `You closed ${resultado.apartado.nombre} and returned ${resultado.devuelto.toFixed(2)} to your available balance.`,
        },
      );
    }

    return {
      eliminado: true,
      devuelto: resultado.devuelto,
      saldoDisponible: resultado.cuenta.saldo,
    };
  }
}
