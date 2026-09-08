import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Canal } from '../../../common/enums/canal.enum';
import { Cuenta } from '../../accounts/entities/cuenta.entity';
import { NivelTarjeta } from '../../cards/enums/nivel-tarjeta.enum';
import { EstadoPrestamo } from '../enums/estado-prestamo.enum';

@Entity('prestamos')
export class Prestamo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cuenta)
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: Cuenta;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  monto: number;

  @Column({ type: 'int' })
  plazoMeses: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: decimalTransformer,
  })
  tasaAnual: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  pagoMensual: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalAPagar: number;

  @Column({ type: 'enum', enum: EstadoPrestamo })
  estado: EstadoPrestamo;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  capitalPendiente: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  totalPagado: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  interesesPagados: number;

  @Column({ type: 'int', default: 0 })
  pagosRealizados: number;

  @Column({ type: 'timestamptz', nullable: true })
  proximoPagoEn?: Date | null;

  @Column({ type: 'enum', enum: NivelTarjeta, nullable: true })
  nivelReferencia?: NivelTarjeta | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: decimalTransformer,
  })
  limiteAlSolicitar: number;

  @Column({ type: 'enum', enum: Canal })
  canal: Canal;

  @Column({ type: 'varchar', nullable: true })
  motivoRechazo?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}
