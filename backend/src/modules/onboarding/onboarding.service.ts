import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager } from 'typeorm';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { Tarjeta } from '../cards/entities/tarjeta.entity';
import { EstadoTarjeta } from '../cards/enums/estado-tarjeta.enum';
import { TipoTarjeta } from '../cards/enums/tipo-tarjeta.enum';
import { Usuario } from '../users/entities/usuario.entity';
import { calcularVigencia, generarCvv } from '../../common/utils/tarjeta.util';

export interface ResultadoApertura {
  creada: boolean;
  cuenta: Cuenta;
  numeroTarjeta?: string;
  pinInicial?: string;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger('Apertura');

  private static readonly PREFIJO_CUENTA = '20';
  private static readonly PREFIJO_TARJETA = '4100';
  private static readonly SALDO_INICIAL = 0;

  constructor(private readonly dataSource: DataSource) {}

  private digitos(longitud: number): string {
    let valor = '';
    for (let i = 0; i < longitud; i += 1) {
      valor += Math.floor(Math.random() * 10).toString();
    }
    return valor;
  }

  private async numeroCuentaDisponible(
    manager: EntityManager,
  ): Promise<string> {
    for (let intento = 0; intento < 30; intento += 1) {
      const numero = OnboardingService.PREFIJO_CUENTA + this.digitos(8);
      const existente = await manager.findOne(Cuenta, {
        where: { numeroCuenta: numero },
      });
      if (!existente) {
        return numero;
      }
    }
    throw new Error('No fue posible generar un numero de cuenta disponible');
  }

  private async numeroTarjetaDisponible(
    manager: EntityManager,
  ): Promise<string> {
    for (let intento = 0; intento < 30; intento += 1) {
      const numero = OnboardingService.PREFIJO_TARJETA + this.digitos(12);
      const existente = await manager.findOne(Tarjeta, {
        where: { numeroTarjeta: numero },
      });
      if (!existente) {
        return numero;
      }
    }
    throw new Error('No fue posible generar un numero de tarjeta disponible');
  }

  async abrirCuentaSiNoExiste(usuarioId: string): Promise<ResultadoApertura> {
    return this.dataSource.transaction(async (manager) => {
      const usuario = await manager.findOne(Usuario, {
        where: { id: usuarioId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!usuario) {
        throw new Error(`Usuario ${usuarioId} no encontrado`);
      }

      const existente = await manager.findOne(Cuenta, {
        where: { usuario: { id: usuarioId } },
        relations: { usuario: true },
      });

      if (existente) {
        return { creada: false, cuenta: existente };
      }

      const numeroCuenta = await this.numeroCuentaDisponible(manager);
      const cuenta = manager.create(Cuenta, {
        numeroCuenta,
        saldo: OnboardingService.SALDO_INICIAL,
        usuario,
      });
      await manager.save(Cuenta, cuenta);

      const numeroTarjeta = await this.numeroTarjetaDisponible(manager);
      const pinInicial = this.digitos(4);

      await manager.save(
        Tarjeta,
        manager.create(Tarjeta, {
          numeroTarjeta,
          pinHash: await bcrypt.hash(pinInicial, 10),
          cvv: generarCvv(),
          expiraEn: calcularVigencia(),
          estado: EstadoTarjeta.ACTIVA,
          intentosFallidos: 0,
          tipo: TipoTarjeta.DEBITO,
          cuenta,
        }),
      );

      this.logger.log(
        `Cuenta ${numeroCuenta} abierta para el usuario ${usuarioId}`,
      );

      return { creada: true, cuenta, numeroTarjeta, pinInicial };
    });
  }
}
