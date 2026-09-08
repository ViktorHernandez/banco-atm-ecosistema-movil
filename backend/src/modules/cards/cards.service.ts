import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Canal } from '../../common/enums/canal.enum';
import { enmascararNumero } from '../../common/utils/enmascarar.util';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CATALOGO_NIVELES,
  calcularLineaCredito,
  nivelRecomendado,
  obtenerNivel,
} from './data/catalogo-niveles';
import { CambiarPinDto } from './dto/cambiar-pin.dto';
import { SolicitarCreditoDto } from './dto/solicitar-credito.dto';
import { Tarjeta } from './entities/tarjeta.entity';
import { EstadoTarjeta } from './enums/estado-tarjeta.enum';
import { MotivoBloqueo } from './enums/motivo-bloqueo.enum';
import { NivelTarjeta } from './enums/nivel-tarjeta.enum';
import { TipoTarjeta } from './enums/tipo-tarjeta.enum';
import { calcularVigencia, generarCvv } from '../../common/utils/tarjeta.util';

@Injectable()
export class CardsService {
  private readonly logger = new Logger('Tarjetas');

  static readonly MAX_TARJETAS_CREDITO = 3;

  constructor(
    @InjectRepository(Tarjeta)
    private readonly tarjetaRepository: Repository<Tarjeta>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  private async obtenerDebito(cuentaId: string): Promise<Tarjeta> {
    const tarjeta = await this.tarjetaRepository.findOne({
      where: { cuenta: { id: cuentaId }, tipo: TipoTarjeta.DEBITO },
      relations: { cuenta: { usuario: true } },
    });

    if (!tarjeta) {
      throw new NotFoundException('La cuenta no tiene una tarjeta de débito asociada');
    }

    return tarjeta;
  }

  private async obtenerPorIdYCuenta(
    tarjetaId: string,
    cuentaId: string,
  ): Promise<Tarjeta> {
    const tarjeta = await this.tarjetaRepository.findOne({
      where: { id: tarjetaId, cuenta: { id: cuentaId } },
      relations: { cuenta: { usuario: true } },
    });

    if (!tarjeta) {
      throw new NotFoundException('Tarjeta no encontrada');
    }

    return tarjeta;
  }

  private presentar(tarjeta: Tarjeta) {
    const definicion = tarjeta.nivel ? obtenerNivel(tarjeta.nivel) : undefined;
    const limite = tarjeta.limiteCredito ?? null;
    const utilizado = tarjeta.creditoUtilizado ?? 0;

    return {
      id: tarjeta.id,
      numeroTarjeta: enmascararNumero(tarjeta.numeroTarjeta),
      tipo: tarjeta.tipo,
      nivel: tarjeta.nivel ?? null,
      nombreNivel: definicion?.nombre ?? null,
      color: definicion?.color ?? 'debito',
      beneficios: definicion?.beneficios ?? [],
      anualidad: definicion?.anualidad ?? null,
      limiteCredito: limite,
      creditoUtilizado: tarjeta.tipo === TipoTarjeta.CREDITO ? utilizado : null,
      creditoDisponible:
        tarjeta.tipo === TipoTarjeta.CREDITO && limite !== null
          ? Math.round((limite - utilizado) * 100) / 100
          : null,
      estado: tarjeta.estado,
      motivoBloqueo: tarjeta.motivoBloqueo ?? null,
      intentosFallidos: tarjeta.intentosFallidos,
      titular: tarjeta.cuenta?.usuario?.nombreCompleto ?? null,
      emitidaEn: tarjeta.emitidaEn,
    };
  }

  async consultarPropia(cuentaId: string) {
    return this.presentar(await this.obtenerDebito(cuentaId));
  }

  async listarPropias(cuentaId: string) {
    const tarjetas = await this.tarjetaRepository.find({
      where: { cuenta: { id: cuentaId } },
      relations: { cuenta: { usuario: true } },
      order: { tipo: 'ASC', emitidaEn: 'ASC' },
    });

    return tarjetas.map((tarjeta) => this.presentar(tarjeta));
  }

  async detallePropia(cuentaId: string, tarjetaId: string) {
    const tarjeta = await this.tarjetaRepository.findOne({
      where: { id: tarjetaId },
      relations: { cuenta: { usuario: true } },
    });

    if (!tarjeta) {
      throw new NotFoundException('Tarjeta no encontrada');
    }

    if (!tarjeta.cuenta || tarjeta.cuenta.id !== cuentaId) {
      throw new ForbiddenException(
        'Solo el titular puede consultar los datos completos de la tarjeta.',
      );
    }

    if (!tarjeta.cuenta.usuario?.activo) {
      throw new ForbiddenException(
        'La cuenta asociada a esta tarjeta no está activa.',
      );
    }

    return {
      ...this.presentar(tarjeta),
      numeroCompleto: tarjeta.numeroTarjeta,
      cvv: tarjeta.cvv,
      expiraEn: tarjeta.expiraEn,
      numeroCuenta: tarjeta.cuenta.numeroCuenta,
    };
  }

  async catalogoCredito(cuentaId: string) {
    const cuenta = await this.cuentaRepository.findOne({
      where: { id: cuentaId },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    const existentes = await this.tarjetaRepository.find({
      where: { cuenta: { id: cuentaId }, tipo: TipoTarjeta.CREDITO },
    });
    const nivelesContratados = existentes.map((tarjeta) => tarjeta.nivel);

    const recomendada = nivelRecomendado(cuenta.saldo);

    return {
      saldoActual: cuenta.saldo,
      nivelRecomendado: recomendada?.nivel ?? null,
      tarjetasContratadas: nivelesContratados.length,
      maximoTarjetas: CardsService.MAX_TARJETAS_CREDITO,
      niveles: CATALOGO_NIVELES.map((definicion) => {
        const alcanza = cuenta.saldo >= definicion.saldoMinimo;
        return {
          nivel: definicion.nivel,
          nombre: definicion.nombre,
          saldoMinimo: definicion.saldoMinimo,
          anualidad: definicion.anualidad,
          color: definicion.color,
          beneficios: definicion.beneficios,
          lineaMaxima: definicion.lineaMaxima,
          alcanzaRequisito: alcanza,
          faltante: alcanza
            ? 0
            : Math.round((definicion.saldoMinimo - cuenta.saldo) * 100) / 100,
          lineaEstimada: alcanza
            ? calcularLineaCredito(cuenta.saldo, definicion)
            : null,
          recomendada: recomendada?.nivel === definicion.nivel,
          yaContratada: nivelesContratados.includes(definicion.nivel),
        };
      }),
    };
  }

  private async generarNumeroTarjeta(prefijo: string): Promise<string> {
    for (let intento = 0; intento < 25; intento += 1) {
      const cuerpo = Math.floor(Math.random() * 1_000_000_000_000)
        .toString()
        .padStart(12, '0');
      const numero = `${prefijo}${cuerpo}`;

      const existente = await this.tarjetaRepository.findOne({
        where: { numeroTarjeta: numero },
      });

      if (!existente) {
        return numero;
      }
    }

    throw new ConflictException(
      'No fue posible generar un número de tarjeta disponible. Intente de nuevo.',
    );
  }

  async solicitarCredito(
    cuentaId: string,
    usuarioId: string,
    canal: Canal,
    dto: SolicitarCreditoDto,
  ) {
    const cuenta = await this.cuentaRepository.findOne({
      where: { id: cuentaId },
      relations: { usuario: true },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    const contratadas = await this.tarjetaRepository.find({
      where: { cuenta: { id: cuentaId }, tipo: TipoTarjeta.CREDITO },
    });

    if (contratadas.length >= CardsService.MAX_TARJETAS_CREDITO) {
      throw new ConflictException(
        `Ya cuenta con el máximo de ${CardsService.MAX_TARJETAS_CREDITO} tarjetas de crédito.`,
      );
    }

    const recomendada = nivelRecomendado(cuenta.saldo);
    const nivelPedido: NivelTarjeta | undefined =
      dto.nivel ?? recomendada?.nivel;

    if (!nivelPedido) {
      const minimo = CATALOGO_NIVELES[0];
      const faltante =
        Math.round((minimo.saldoMinimo - cuenta.saldo) * 100) / 100;

      await this.registrarRechazo(
        cuenta,
        usuarioId,
        canal,
        minimo.nombre,
        minimo.saldoMinimo,
        faltante,
      );

      throw new ConflictException(
        `Solicitud rechazada por liquidez insuficiente. La tarjeta ${minimo.nombre} requiere un saldo mínimo de ${minimo.saldoMinimo.toFixed(2)} y su cuenta tiene ${cuenta.saldo.toFixed(2)}. Le faltan ${faltante.toFixed(2)}.`,
      );
    }

    const definicion = obtenerNivel(nivelPedido);
    if (!definicion) {
      throw new BadRequestException('El nivel de tarjeta no es valido');
    }

    if (contratadas.some((tarjeta) => tarjeta.nivel === definicion.nivel)) {
      throw new ConflictException(
        `Ya cuenta con una tarjeta de crédito ${definicion.nombre}.`,
      );
    }

    if (cuenta.saldo < definicion.saldoMinimo) {
      const faltante =
        Math.round((definicion.saldoMinimo - cuenta.saldo) * 100) / 100;

      await this.registrarRechazo(
        cuenta,
        usuarioId,
        canal,
        definicion.nombre,
        definicion.saldoMinimo,
        faltante,
      );

      throw new ConflictException(
        `Solicitud rechazada por liquidez insuficiente. La tarjeta ${definicion.nombre} requiere un saldo mínimo de ${definicion.saldoMinimo.toFixed(2)} y su cuenta tiene ${cuenta.saldo.toFixed(2)}. Le faltan ${faltante.toFixed(2)}.`,
      );
    }

    const linea = calcularLineaCredito(cuenta.saldo, definicion);
    const numero = await this.generarNumeroTarjeta('5000');

    const pinInicial = cuenta.numeroCuenta.slice(-4);

    const tarjeta = this.tarjetaRepository.create({
      numeroTarjeta: numero,
      pinHash: await bcrypt.hash(pinInicial, 10),
      cvv: generarCvv(),
      expiraEn: calcularVigencia(),
      estado: EstadoTarjeta.ACTIVA,
      intentosFallidos: 0,
      tipo: TipoTarjeta.CREDITO,
      nivel: definicion.nivel,
      limiteCredito: linea,
      creditoUtilizado: 0,
      cuenta,
    });

    await this.tarjetaRepository.save(tarjeta);

    await this.auditService.registrar({
      usuarioId,
      accion: 'TARJETA_CREDITO_APROBADA',
      entidadAfectada: 'Tarjeta',
      entidadId: tarjeta.id,
      canal,
      detalle: `Nivel ${definicion.nivel}, linea ${linea}, saldo al solicitar ${cuenta.saldo}`,
    });

    await this.notificationsService.registrar(
      cuentaId,
      `Su solicitud de tarjeta de crédito ${definicion.nombre} fue aprobada. Línea autorizada: ${linea.toFixed(2)}.`,
      undefined,
      { enviarCorreo: false },
    );

    if (cuenta.usuario?.correo && cuenta.usuario.correoVerificado) {
      void this.mailService.tarjetaAprobada(
        cuenta.usuario.correo,
        cuenta.usuario.nombreCompleto,
        definicion.nombre,
        linea,
        enmascararNumero(numero),
      );
    }

    this.logger.log(
      `Tarjeta de credito ${definicion.nivel} aprobada para la cuenta ${cuentaId}`,
    );

    tarjeta.cuenta = cuenta;

    return {
      aprobada: true,
      mensaje: `Tarjeta de crédito ${definicion.nombre} aprobada con una línea de ${linea.toFixed(2)}.`,
      pinInicial,
      tarjeta: this.presentar(tarjeta),
    };
  }

  private async registrarRechazo(
    cuenta: Cuenta,
    usuarioId: string,
    canal: Canal,
    nombreNivel: string,
    minimo: number,
    faltante: number,
  ): Promise<void> {
    await this.auditService.registrar({
      usuarioId,
      accion: 'TARJETA_CREDITO_RECHAZADA',
      entidadAfectada: 'Cuenta',
      entidadId: cuenta.id,
      canal,
      detalle: `Liquidez insuficiente para ${nombreNivel}: minimo ${minimo}, saldo ${cuenta.saldo}`,
    });

    await this.notificationsService.registrar(
      cuenta.id,
      `Su solicitud de tarjeta de crédito ${nombreNivel} fue rechazada por liquidez insuficiente. Requiere un saldo mínimo de ${minimo.toFixed(2)} y le faltan ${faltante.toFixed(2)}.`,
      undefined,
      { enviarCorreo: false },
    );
  }

  async bloquearPropia(
    cuentaId: string,
    usuarioId: string,
    canal: Canal,
    tarjetaId?: string,
  ) {
    const tarjeta = tarjetaId
      ? await this.obtenerPorIdYCuenta(tarjetaId, cuentaId)
      : await this.obtenerDebito(cuentaId);

    if (tarjeta.estado === EstadoTarjeta.BLOQUEADA) {
      throw new ConflictException('La tarjeta ya se encuentra bloqueada');
    }

    tarjeta.estado = EstadoTarjeta.BLOQUEADA;
    tarjeta.motivoBloqueo = MotivoBloqueo.CLIENTE;
    await this.tarjetaRepository.save(tarjeta);

    await this.auditService.registrar({
      usuarioId,
      accion: 'TARJETA_BLOQUEADA_POR_CLIENTE',
      entidadAfectada: 'Tarjeta',
      entidadId: tarjeta.id,
      canal,
      detalle: `Tipo ${tarjeta.tipo}`,
    });

    await this.notificationsService.registrar(
      cuentaId,
      `Su tarjeta ${enmascararNumero(tarjeta.numeroTarjeta)} fue bloqueada a solicitud suya.`,
      undefined,
      { enviarCorreo: true },
    );

    this.logger.log(`Tarjeta ${tarjeta.id} bloqueada por el cliente`);

    return this.presentar(tarjeta);
  }

  async desbloquearPropia(
    cuentaId: string,
    usuarioId: string,
    canal: Canal,
    tarjetaId?: string,
  ) {
    const tarjeta = tarjetaId
      ? await this.obtenerPorIdYCuenta(tarjetaId, cuentaId)
      : await this.obtenerDebito(cuentaId);

    if (tarjeta.estado !== EstadoTarjeta.BLOQUEADA) {
      throw new ConflictException('La tarjeta no se encuentra bloqueada');
    }

    if (tarjeta.motivoBloqueo !== MotivoBloqueo.CLIENTE) {
      throw new ConflictException(
        'Solo puede desbloquear una tarjeta que usted mismo bloqueo. Contacte a su banco.',
      );
    }

    tarjeta.estado = EstadoTarjeta.ACTIVA;
    tarjeta.motivoBloqueo = null;
    tarjeta.intentosFallidos = 0;
    await this.tarjetaRepository.save(tarjeta);

    await this.auditService.registrar({
      usuarioId,
      accion: 'TARJETA_DESBLOQUEADA_POR_CLIENTE',
      entidadAfectada: 'Tarjeta',
      entidadId: tarjeta.id,
      canal,
    });

    await this.notificationsService.registrar(
      cuentaId,
      `Su tarjeta ${enmascararNumero(tarjeta.numeroTarjeta)} fue desbloqueada correctamente.`,
      undefined,
      { enviarCorreo: true },
    );

    return this.presentar(tarjeta);
  }

  async cambiarPin(
    cuentaId: string,
    usuarioId: string,
    canal: Canal,
    dto: CambiarPinDto,
  ) {
    const tarjeta = await this.obtenerDebito(cuentaId);

    if (tarjeta.estado !== EstadoTarjeta.ACTIVA) {
      throw new ConflictException(
        'Solo puede cambiar el PIN de una tarjeta activa',
      );
    }

    const pinValido = await bcrypt.compare(dto.pinActual, tarjeta.pinHash);

    if (!pinValido) {
      await this.auditService.registrar({
        usuarioId,
        accion: 'CAMBIO_PIN_FALLIDO',
        entidadAfectada: 'Tarjeta',
        entidadId: tarjeta.id,
        canal,
        detalle: 'PIN actual incorrecto',
      });
      throw new UnauthorizedException('El PIN actual es incorrecto');
    }

    if (dto.pinActual === dto.pinNuevo) {
      throw new BadRequestException(
        'El nuevo PIN debe ser diferente al PIN actual',
      );
    }

    tarjeta.pinHash = await bcrypt.hash(dto.pinNuevo, 10);
    await this.tarjetaRepository.save(tarjeta);

    await this.auditService.registrar({
      usuarioId,
      accion: 'CAMBIO_PIN_EXITOSO',
      entidadAfectada: 'Tarjeta',
      entidadId: tarjeta.id,
      canal,
    });

    await this.notificationsService.registrar(
      cuentaId,
      'El PIN de su tarjeta fue actualizado.',
      undefined,
      { enviarCorreo: true },
    );

    return { mensaje: 'PIN actualizado correctamente' };
  }

  async listarTodas() {
    const tarjetas = await this.tarjetaRepository.find({
      where: { cuenta: { usuario: { activo: true } } },
      relations: { cuenta: { usuario: true } },
      order: { emitidaEn: 'ASC' },
    });

    return tarjetas.map((tarjeta) => ({
      ...this.presentar(tarjeta),
      cuenta: tarjeta.cuenta
        ? {
            id: tarjeta.cuenta.id,
            numeroCuenta: tarjeta.cuenta.numeroCuenta,
            titular: tarjeta.cuenta.usuario?.nombreCompleto ?? null,
          }
        : null,
    }));
  }

  async actualizarEstadoComoAdministrador(
    tarjetaId: string,
    estado: EstadoTarjeta,
    administradorId: string,
  ) {
    const tarjeta = await this.tarjetaRepository.findOne({
      where: { id: tarjetaId },
      relations: { cuenta: { usuario: true } },
    });

    if (!tarjeta) {
      throw new NotFoundException('Tarjeta no encontrada');
    }

    tarjeta.estado = estado;
    tarjeta.motivoBloqueo =
      estado === EstadoTarjeta.BLOQUEADA ? MotivoBloqueo.ADMINISTRADOR : null;

    if (estado === EstadoTarjeta.ACTIVA) {
      tarjeta.intentosFallidos = 0;
    }

    await this.tarjetaRepository.save(tarjeta);

    await this.auditService.registrar({
      usuarioId: administradorId,
      accion: 'ESTADO_TARJETA_ACTUALIZADO_POR_ADMIN',
      entidadAfectada: 'Tarjeta',
      entidadId: tarjeta.id,
      canal: Canal.WEB,
      detalle: `Nuevo estado: ${estado}`,
    });

    if (tarjeta.cuenta) {
      await this.notificationsService.registrar(
        tarjeta.cuenta.id,
        `El estado de su tarjeta ${enmascararNumero(tarjeta.numeroTarjeta)} fue actualizado a ${estado} por el banco.`,
        undefined,
        { enviarCorreo: true },
      );
    }

    return this.presentar(tarjeta);
  }
}
