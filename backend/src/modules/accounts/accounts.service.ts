import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { RolUsuario } from '../users/enums/rol-usuario.enum';
import { enmascararNumero } from '../../common/utils/enmascarar.util';
import {
  esFechaValida,
  finDelDia,
  inicioDelDia,
  normalizarZona,
} from '../../common/utils/zona-horaria.util';
import { Transaccion } from '../transactions/entities/transaccion.entity';
import { TipoTransaccion } from '../transactions/enums/tipo-transaccion.enum';
import { Cuenta } from './entities/cuenta.entity';

export interface FiltrosMovimientos {
  desde?: string;
  hasta?: string;
  tipo?: TipoTransaccion;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    private readonly configService: ConfigService,
  ) {}

  private get zonaHoraria(): string {
    return normalizarZona(this.configService.get<string>('APP_TIMEZONE'));
  }

  async obtenerPorId(cuentaId: string): Promise<Cuenta> {
    const cuenta = await this.cuentaRepository.findOne({
      where: { id: cuentaId },
      relations: { usuario: true },
    });

    if (!cuenta) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    return cuenta;
  }

  async resumen(cuentaId: string) {
    const cuenta = await this.obtenerPorId(cuentaId);

    return {
      id: cuenta.id,
      numeroCuenta: cuenta.numeroCuenta,
      numeroCuentaEnmascarado: enmascararNumero(cuenta.numeroCuenta),
      saldo: cuenta.saldo,
      titular: cuenta.usuario?.nombreCompleto ?? null,
      creadaEn: cuenta.creadaEn,
    };
  }

  async saldo(cuentaId: string) {
    const cuenta = await this.obtenerPorId(cuentaId);

    return {
      cuentaId: cuenta.id,
      numeroCuenta: enmascararNumero(cuenta.numeroCuenta),
      saldo: cuenta.saldo,
      consultadoEn: new Date().toISOString(),
    };
  }

  async listarPorUsuario(usuarioId: string) {
    const cuentas = await this.cuentaRepository.find({
      where: { usuario: { id: usuarioId } },
      order: { creadaEn: 'ASC' },
    });

    return cuentas.map((cuenta) => ({
      id: cuenta.id,
      numeroCuenta: cuenta.numeroCuenta,
      numeroCuentaEnmascarado: enmascararNumero(cuenta.numeroCuenta),
      saldo: cuenta.saldo,
      creadaEn: cuenta.creadaEn,
    }));
  }

  async verificarPropiedad(
    cuentaIdSolicitada: string,
    usuarioId: string,
    rol: RolUsuario,
  ): Promise<void> {
    if (rol === RolUsuario.ADMINISTRADOR) {
      return;
    }

    const cuenta = await this.cuentaRepository.findOne({
      where: { id: cuentaIdSolicitada },
      relations: { usuario: true },
    });

    if (!cuenta || cuenta.usuario?.id !== usuarioId) {
      throw new ForbiddenException('No puede consultar cuentas de terceros');
    }
  }

  private construirRangoFecha(desde?: string, hasta?: string) {
    const zona = this.zonaHoraria;

    const inicio =
      desde && esFechaValida(desde) ? inicioDelDia(desde, zona) : null;
    const fin = hasta && esFechaValida(hasta) ? finDelDia(hasta, zona) : null;

    if (inicio && fin) {
      return Between(inicio, fin);
    }
    if (inicio) {
      return MoreThanOrEqual(inicio);
    }
    if (fin) {
      return LessThanOrEqual(fin);
    }
    return null;
  }

  async movimientos(
    cuentaId: string,
    limite = 20,
    filtros: FiltrosMovimientos = {},
  ) {
    await this.obtenerPorId(cuentaId);

    const comunes: FindOptionsWhere<Transaccion> = {};
    const rangoFecha = this.construirRangoFecha(filtros.desde, filtros.hasta);

    if (rangoFecha) {
      comunes.fecha = rangoFecha;
    }

    if (filtros.tipo) {
      comunes.tipo = filtros.tipo;
    }

    const transacciones = await this.transaccionRepository.find({
      where: [
        { ...comunes, cuentaOrigen: { id: cuentaId } },
        { ...comunes, cuentaDestino: { id: cuentaId } },
      ],
      relations: { cuentaOrigen: true, cuentaDestino: true },
      order: { fecha: 'DESC' },
      take: limite,
    });

    return transacciones.map((transaccion) => {
      const esOrigen = transaccion.cuentaOrigen?.id === cuentaId;
      const esDestino = transaccion.cuentaDestino?.id === cuentaId;

      let signo: 'CARGO' | 'ABONO' = 'CARGO';
      if (esDestino && !esOrigen) {
        signo = 'ABONO';
      }

      return {
        id: transaccion.id,
        tipo: transaccion.tipo,
        estado: transaccion.estado,
        canal: transaccion.canal,
        monto: transaccion.monto,
        signo,
        descripcion: transaccion.descripcion ?? null,
        contraparte: esOrigen
          ? transaccion.cuentaDestino
            ? enmascararNumero(transaccion.cuentaDestino.numeroCuenta)
            : null
          : transaccion.cuentaOrigen
            ? enmascararNumero(transaccion.cuentaOrigen.numeroCuenta)
            : null,
        fecha: transaccion.fecha,
      };
    });
  }
}
