import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Canal } from '../../common/enums/canal.enum';
import { generarFolio } from '../../common/utils/enmascarar.util';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { AuditService } from '../audit/audit.service';
import { Tarjeta } from '../cards/entities/tarjeta.entity';
import { EstadoTarjeta } from '../cards/enums/estado-tarjeta.enum';
import { NivelTarjeta } from '../cards/enums/nivel-tarjeta.enum';
import { TipoTarjeta } from '../cards/enums/tipo-tarjeta.enum';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Transaccion } from '../transactions/entities/transaccion.entity';
import { EstadoTransaccion } from '../transactions/enums/estado-transaccion.enum';
import { TipoTransaccion } from '../transactions/enums/tipo-transaccion.enum';
import {
  MAX_PRESTAMOS_ACTIVOS,
  MONTO_MINIMO,
  PLAZOS_DISPONIBLES,
  SALDO_MINIMO_ELEGIBLE,
  calcularLimite,
  calcularPagoMensual,
  interesDelPeriodo,
  montosSugeridos,
  nivelMasAlto,
  perfilDeNivel,
  siguienteFechaPago,
} from './data/politica-prestamos';
import {
  PagoMultipleDto,
  PagoPrestamoDto,
} from './dto/pago-prestamo.dto';
import { SolicitarPrestamoDto } from './dto/solicitar-prestamo.dto';
import { Prestamo } from './entities/prestamo.entity';
import { EstadoPrestamo } from './enums/estado-prestamo.enum';

interface ContextoPrestamo {
  cuentaId: string;
  usuarioId: string;
  canal: Canal;
}

@Injectable()
export class LoansService {
  private readonly logger = new Logger('Prestamos');

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Prestamo)
    private readonly prestamoRepository: Repository<Prestamo>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Tarjeta)
    private readonly tarjetaRepository: Repository<Tarjeta>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private async obtenerCuenta(cuentaId: string): Promise<Cuenta> {
    const cuenta = await this.cuentaRepository.findOne({
      where: { id: cuentaId },
      relations: { usuario: true },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    return cuenta;
  }

  private async nivelDeLaCuenta(
    cuentaId: string,
  ): Promise<NivelTarjeta | null> {
    const tarjetas = await this.tarjetaRepository.find({
      where: {
        cuenta: { id: cuentaId },
        tipo: TipoTarjeta.CREDITO,
        estado: EstadoTarjeta.ACTIVA,
      },
    });

    return nivelMasAlto(
      tarjetas
        .map((tarjeta) => tarjeta.nivel)
        .filter((nivel): nivel is NivelTarjeta => Boolean(nivel)),
    );
  }

  private async prestamosActivos(cuentaId: string): Promise<number> {
    return this.prestamoRepository.count({
      where: { cuenta: { id: cuentaId }, estado: EstadoPrestamo.APROBADO },
    });
  }

  private async evaluar(cuentaId: string) {
    const cuenta = await this.obtenerCuenta(cuentaId);
    const nivel = await this.nivelDeLaCuenta(cuentaId);
    const perfil = perfilDeNivel(nivel);
    const limite = calcularLimite(cuenta.saldo, perfil);
    const activos = await this.prestamosActivos(cuentaId);

    const motivos: string[] = [];

    if (cuenta.saldo < SALDO_MINIMO_ELEGIBLE) {
      motivos.push(
        `Su cuenta debe tener un saldo de al menos ${SALDO_MINIMO_ELEGIBLE.toFixed(2)} para solicitar un préstamo. Saldo actual: ${cuenta.saldo.toFixed(2)}.`,
      );
    }

    if (activos >= MAX_PRESTAMOS_ACTIVOS) {
      motivos.push(
        `Ya tiene ${activos} préstamos vigentes. El máximo permitido es ${MAX_PRESTAMOS_ACTIVOS}.`,
      );
    }

    if (motivos.length === 0 && limite < MONTO_MINIMO) {
      motivos.push(
        `Su límite disponible es de ${limite.toFixed(2)} y el préstamo mínimo es de ${MONTO_MINIMO.toFixed(2)}.`,
      );
    }

    return {
      cuenta,
      perfil,
      limite,
      activos,
      motivos,
      elegible: motivos.length === 0,
    };
  }

  async condiciones(cuentaId: string) {
    const evaluacion = await this.evaluar(cuentaId);
    const { perfil, limite } = evaluacion;

    return {
      elegible: evaluacion.elegible,
      motivos: evaluacion.motivos,
      saldoDisponible: evaluacion.cuenta.saldo,
      saldoMinimoElegible: SALDO_MINIMO_ELEGIBLE,
      montoMinimo: MONTO_MINIMO,
      montoMaximo: limite,
      limiteDisponible: limite,
      tieneTarjetaCredito: perfil.nivel !== null,
      nivelTarjeta: perfil.nivel,
      nombrePerfil: perfil.nombrePerfil,
      color: perfil.color,
      factorAplicado: perfil.factor,
      topePerfil: perfil.tope,
      tasaAnual: perfil.tasaAnual,
      montosSugeridos: montosSugeridos(limite),
      plazosDisponibles: PLAZOS_DISPONIBLES,
      plazoPorDefecto: 12,
      prestamosActivos: evaluacion.activos,
      maximoPrestamosActivos: MAX_PRESTAMOS_ACTIVOS,
    };
  }

  async simular(cuentaId: string, monto: number, plazoMeses: number) {
    const evaluacion = await this.evaluar(cuentaId);
    const pagoMensual = calcularPagoMensual(
      monto,
      plazoMeses,
      evaluacion.perfil.tasaAnual,
    );

    return {
      monto,
      plazoMeses,
      tasaAnual: evaluacion.perfil.tasaAnual,
      pagoMensual,
      totalAPagar: this.redondear(pagoMensual * plazoMeses),
      intereses: this.redondear(pagoMensual * plazoMeses - monto),
    };
  }

  private presentar(prestamo: Prestamo) {
    const activo = prestamo.estado === EstadoPrestamo.APROBADO;
    const capitalPendiente = prestamo.capitalPendiente ?? 0;
    const pagosRealizados = prestamo.pagosRealizados ?? 0;
    const pagosRestantes = Math.max(prestamo.plazoMeses - pagosRealizados, 0);
    const interesCorriente = activo
      ? interesDelPeriodo(capitalPendiente, prestamo.tasaAnual)
      : 0;
    const montoLiquidacion = activo
      ? this.redondear(capitalPendiente + interesCorriente)
      : 0;
    const saldoPendiente = activo
      ? this.redondear(Math.min(prestamo.pagoMensual * pagosRestantes, montoLiquidacion + prestamo.pagoMensual * Math.max(pagosRestantes - 1, 0)))
      : 0;
    const pagoMinimo = activo
      ? this.redondear(Math.min(prestamo.pagoMensual, montoLiquidacion))
      : 0;

    return {
      id: prestamo.id,
      folio: generarFolio(prestamo.id),
      monto: prestamo.monto,
      plazoMeses: prestamo.plazoMeses,
      tasaAnual: prestamo.tasaAnual,
      pagoMensual: prestamo.pagoMensual,
      totalAPagar: prestamo.totalAPagar,
      estado: prestamo.estado,
      nivelReferencia: prestamo.nivelReferencia ?? null,
      limiteAlSolicitar: prestamo.limiteAlSolicitar,
      canal: prestamo.canal,
      motivoRechazo: prestamo.motivoRechazo ?? null,
      creadoEn: prestamo.creadoEn,
      capitalPendiente: activo ? capitalPendiente : 0,
      saldoPendiente,
      montoLiquidacion,
      interesCorriente,
      pagoMinimo,
      totalPagado: prestamo.totalPagado ?? 0,
      interesesPagados: prestamo.interesesPagados ?? 0,
      pagosRealizados,
      pagosRestantes,
      progreso:
        prestamo.plazoMeses > 0
          ? Math.round((pagosRealizados / prestamo.plazoMeses) * 100)
          : 0,
      proximoPagoEn: activo ? (prestamo.proximoPagoEn ?? null) : null,
      liquidado: prestamo.estado === EstadoPrestamo.LIQUIDADO,
    };
  }

  async detalle(cuentaId: string, prestamoId: string) {
    const prestamo = await this.prestamoRepository.findOne({
      where: { id: prestamoId, cuenta: { id: cuentaId } },
    });

    if (!prestamo) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    return this.presentar(prestamo);
  }

  async listarPendientes(cuentaId: string) {
    const prestamos = await this.prestamoRepository.find({
      where: { cuenta: { id: cuentaId }, estado: EstadoPrestamo.APROBADO },
      order: { proximoPagoEn: 'ASC' },
    });

    return prestamos.map((prestamo) => this.presentar(prestamo));
  }

  private async aplicarPago(
    manager: EntityManager,
    contexto: ContextoPrestamo,
    prestamoId: string,
    montoSolicitado: number | undefined,
  ) {
    const pertenece = await manager.findOne(Prestamo, {
      where: { id: prestamoId, cuenta: { id: contexto.cuentaId } },
      select: { id: true },
    });

    if (!pertenece) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    const prestamo = await manager.findOne(Prestamo, {
      where: { id: prestamoId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!prestamo) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    if (prestamo.estado !== EstadoPrestamo.APROBADO) {
      throw new ConflictException(
        `El préstamo ${generarFolio(prestamo.id)} no admite pagos porque está ${prestamo.estado.toLowerCase()}.`,
      );
    }

    const interes = interesDelPeriodo(
      prestamo.capitalPendiente,
      prestamo.tasaAnual,
    );
    const liquidacion = this.redondear(prestamo.capitalPendiente + interes);
    const minimo = this.redondear(Math.min(prestamo.pagoMensual, liquidacion));
    const monto = this.redondear(montoSolicitado ?? minimo);

    if (monto < minimo) {
      throw new BadRequestException(
        `El pago mínimo del préstamo ${generarFolio(prestamo.id)} es de ${minimo.toFixed(2)}.`,
      );
    }

    if (monto > liquidacion) {
      throw new BadRequestException(
        `El préstamo ${generarFolio(prestamo.id)} se liquida con ${liquidacion.toFixed(2)}. No es necesario pagar más.`,
      );
    }

    const cuenta = await manager.findOne(Cuenta, {
      where: { id: contexto.cuentaId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    if (cuenta.saldo < monto) {
      throw new ConflictException(
        `Saldo insuficiente para pagar ${monto.toFixed(2)}. Su saldo disponible es ${cuenta.saldo.toFixed(2)}.`,
      );
    }

    const capitalAmortizado = this.redondear(monto - interes);
    const capitalRestante = this.redondear(
      Math.max(prestamo.capitalPendiente - capitalAmortizado, 0),
    );

    cuenta.saldo = this.redondear(cuenta.saldo - monto);
    await manager.save(Cuenta, cuenta);

    prestamo.capitalPendiente = capitalRestante;
    prestamo.totalPagado = this.redondear(prestamo.totalPagado + monto);
    prestamo.interesesPagados = this.redondear(
      prestamo.interesesPagados + interes,
    );
    prestamo.pagosRealizados += 1;

    const liquidado = capitalRestante <= 0;
    if (liquidado) {
      prestamo.estado = EstadoPrestamo.LIQUIDADO;
      prestamo.proximoPagoEn = null;
    } else {
      prestamo.proximoPagoEn = siguienteFechaPago(
        prestamo.proximoPagoEn ?? new Date(),
      );
    }

    await manager.save(Prestamo, prestamo);

    const transaccion = manager.create(Transaccion, {
      tipo: TipoTransaccion.PAGO_PRESTAMO,
      monto,
      estado: EstadoTransaccion.EXITOSA,
      canal: contexto.canal,
      cuentaOrigen: cuenta,
      descripcion: `Pago de préstamo ${generarFolio(prestamo.id)}`,
    });
    await manager.save(Transaccion, transaccion);

    return { prestamo, cuenta, monto, interes, capitalAmortizado, liquidado };
  }

  private async avisarPago(
    contexto: ContextoPrestamo,
    resultado: {
      prestamo: Prestamo;
      cuenta: Cuenta;
      monto: number;
      liquidado: boolean;
    },
  ) {
    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: resultado.liquidado ? 'PRESTAMO_LIQUIDADO' : 'PRESTAMO_PAGO',
      entidadAfectada: 'Prestamo',
      entidadId: resultado.prestamo.id,
      canal: contexto.canal,
      detalle: `Monto ${resultado.monto}, capital pendiente ${resultado.prestamo.capitalPendiente}`,
    });

    const mensaje = resultado.liquidado
      ? `Su préstamo ${generarFolio(resultado.prestamo.id)} quedó liquidado. Pago final de ${resultado.monto.toFixed(2)}.`
      : `Pago de ${resultado.monto.toFixed(2)} aplicado al préstamo ${generarFolio(resultado.prestamo.id)}. Saldo pendiente: ${resultado.prestamo.capitalPendiente.toFixed(2)}.`;

    await this.notificationsService.registrar(
      contexto.cuentaId,
      mensaje,
      undefined,
      { enviarCorreo: true },
    );
  }

  async pagar(
    contexto: ContextoPrestamo,
    prestamoId: string,
    dto: PagoPrestamoDto,
  ) {
    const resultado = await this.dataSource.transaction((manager) =>
      this.aplicarPago(manager, contexto, prestamoId, dto.monto),
    );

    await this.avisarPago(contexto, resultado);

    return {
      pagado: true,
      mensaje: resultado.liquidado
        ? `Préstamo liquidado con un pago de ${resultado.monto.toFixed(2)}.`
        : `Pago de ${resultado.monto.toFixed(2)} aplicado correctamente.`,
      montoPagado: resultado.monto,
      interesCubierto: resultado.interes,
      capitalAmortizado: resultado.capitalAmortizado,
      saldoCuenta: resultado.cuenta.saldo,
      prestamo: this.presentar(resultado.prestamo),
    };
  }

  async pagarVarios(contexto: ContextoPrestamo, dto: PagoMultipleDto) {
    const identificadores = dto.pagos.map((item) => item.prestamoId);
    if (new Set(identificadores).size !== identificadores.length) {
      throw new BadRequestException(
        'No puede incluir el mismo préstamo dos veces en la misma operación.',
      );
    }

    const resultados = await this.dataSource.transaction(async (manager) => {
      const aplicados: Array<
        Awaited<ReturnType<LoansService['aplicarPago']>>
      > = [];
      for (const item of dto.pagos) {
        aplicados.push(
          await this.aplicarPago(
            manager,
            contexto,
            item.prestamoId,
            item.monto,
          ),
        );
      }
      return aplicados;
    });

    for (const resultado of resultados) {
      await this.avisarPago(contexto, resultado);
    }

    const total = this.redondear(
      resultados.reduce((suma, item) => suma + item.monto, 0),
    );

    return {
      pagado: true,
      mensaje: `Se aplicaron ${resultados.length} pagos por un total de ${total.toFixed(2)}.`,
      totalPagado: total,
      saldoCuenta: resultados[resultados.length - 1].cuenta.saldo,
      prestamos: resultados.map((item) => this.presentar(item.prestamo)),
    };
  }

  async listarPropios(cuentaId: string) {
    const prestamos = await this.prestamoRepository.find({
      where: { cuenta: { id: cuentaId } },
      order: { creadoEn: 'DESC' },
      take: 50,
    });

    return prestamos.map((prestamo) => this.presentar(prestamo));
  }

  private async registrarRechazo(
    contexto: ContextoPrestamo,
    cuenta: Cuenta,
    monto: number,
    plazoMeses: number,
    limite: number,
    nivel: NivelTarjeta | null,
    tasaAnual: number,
    motivo: string,
  ): Promise<void> {
    try {
      const rechazado = this.prestamoRepository.create({
        cuenta,
        monto,
        plazoMeses,
        tasaAnual,
        pagoMensual: 0,
        totalAPagar: 0,
        estado: EstadoPrestamo.RECHAZADO,
        nivelReferencia: nivel,
        limiteAlSolicitar: limite,
        canal: contexto.canal,
        motivoRechazo: motivo,
      });
      await this.prestamoRepository.save(rechazado);
    } catch (error) {
      this.logger.error(
        'No se pudo registrar la solicitud rechazada',
        error instanceof Error ? error.stack : String(error),
      );
    }

    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: 'PRESTAMO_RECHAZADO',
      entidadAfectada: 'Cuenta',
      entidadId: cuenta.id,
      canal: contexto.canal,
      detalle: `Monto ${monto}, limite ${limite}: ${motivo}`,
    });

    await this.notificationsService.registrar(
      cuenta.id,
      `Su solicitud de préstamo por ${monto.toFixed(2)} fue rechazada. ${motivo}`,
    );
  }

  async solicitar(contexto: ContextoPrestamo, dto: SolicitarPrestamoDto) {
    const monto = this.redondear(dto.monto);
    const plazoMeses = dto.plazoMeses ?? 12;

    const evaluacion = await this.evaluar(contexto.cuentaId);
    const { cuenta, perfil, limite } = evaluacion;

    if (!PLAZOS_DISPONIBLES.includes(plazoMeses)) {
      throw new BadRequestException(
        `El plazo debe ser uno de los siguientes: ${PLAZOS_DISPONIBLES.join(', ')} meses.`,
      );
    }

    if (!evaluacion.elegible) {
      const motivo = evaluacion.motivos.join(' ');
      await this.registrarRechazo(
        contexto,
        cuenta,
        monto,
        plazoMeses,
        limite,
        perfil.nivel,
        perfil.tasaAnual,
        motivo,
      );
      throw new ConflictException(motivo);
    }

    if (monto < MONTO_MINIMO) {
      const motivo = `El préstamo mínimo es de ${MONTO_MINIMO.toFixed(2)}.`;
      await this.registrarRechazo(
        contexto,
        cuenta,
        monto,
        plazoMeses,
        limite,
        perfil.nivel,
        perfil.tasaAnual,
        motivo,
      );
      throw new BadRequestException(motivo);
    }

    if (monto > limite) {
      const motivo = `El monto solicitado supera su límite. Puede solicitar como máximo ${limite.toFixed(2)}.`;
      await this.registrarRechazo(
        contexto,
        cuenta,
        monto,
        plazoMeses,
        limite,
        perfil.nivel,
        perfil.tasaAnual,
        motivo,
      );
      throw new ConflictException(motivo);
    }

    const pagoMensual = calcularPagoMensual(
      monto,
      plazoMeses,
      perfil.tasaAnual,
    );
    const totalAPagar = this.redondear(pagoMensual * plazoMeses);

    const resultado = await this.dataSource.transaction(async (manager) => {
      const bloqueada = await manager.findOne(Cuenta, {
        where: { id: contexto.cuentaId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!bloqueada) {
        throw new NotFoundException('Cuenta no encontrada');
      }

      bloqueada.saldo = this.redondear(bloqueada.saldo + monto);
      await manager.save(Cuenta, bloqueada);

      const prestamo = manager.create(Prestamo, {
        cuenta: bloqueada,
        monto,
        plazoMeses,
        tasaAnual: perfil.tasaAnual,
        pagoMensual,
        totalAPagar,
        estado: EstadoPrestamo.APROBADO,
        nivelReferencia: perfil.nivel,
        limiteAlSolicitar: limite,
        canal: contexto.canal,
        capitalPendiente: monto,
        totalPagado: 0,
        interesesPagados: 0,
        pagosRealizados: 0,
        proximoPagoEn: siguienteFechaPago(new Date()),
      });
      await manager.save(Prestamo, prestamo);

      const transaccion = manager.create(Transaccion, {
        tipo: TipoTransaccion.PRESTAMO,
        monto,
        estado: EstadoTransaccion.EXITOSA,
        canal: contexto.canal,
        cuentaDestino: bloqueada,
        descripcion: `Préstamo a ${plazoMeses} meses`,
      });
      await manager.save(Transaccion, transaccion);

      return { cuenta: bloqueada, prestamo, transaccion };
    });

    await this.auditService.registrar({
      usuarioId: contexto.usuarioId,
      accion: 'PRESTAMO_APROBADO',
      entidadAfectada: 'Prestamo',
      entidadId: resultado.prestamo.id,
      canal: contexto.canal,
      detalle: `Monto ${monto}, plazo ${plazoMeses}, tasa ${perfil.tasaAnual}, limite ${limite}`,
    });

    await this.notificationsService.registrar(
      contexto.cuentaId,
      `Su préstamo por ${monto.toFixed(2)} a ${plazoMeses} meses fue aprobado y depositado en su cuenta. Pago mensual: ${pagoMensual.toFixed(2)}.`,
      undefined,
      { enviarCorreo: true },
    );

    this.logger.log(
      `Prestamo ${resultado.prestamo.id} aprobado para la cuenta ${contexto.cuentaId}`,
    );

    return {
      aprobada: true,
      mensaje: `Préstamo por ${monto.toFixed(2)} aprobado y depositado en su cuenta.`,
      saldoResultante: resultado.cuenta.saldo,
      prestamo: this.presentar(resultado.prestamo),
    };
  }
}
