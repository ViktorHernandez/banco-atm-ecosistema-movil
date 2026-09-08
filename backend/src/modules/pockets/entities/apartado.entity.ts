import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Cuenta } from '../../accounts/entities/cuenta.entity';

@Entity('apartados')
export class Apartado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  monto: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  metaMonto?: number | null;

  @Column({ type: 'varchar', length: 30, default: 'ahorro' })
  icono: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'cuenta_id', type: 'uuid', nullable: true })
  cuentaId: string;

  @ManyToOne(() => Cuenta)
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: Cuenta;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadoEn: Date;
}
