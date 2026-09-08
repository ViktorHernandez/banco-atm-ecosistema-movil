import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Cuenta } from '../../accounts/entities/cuenta.entity';
import { EstadoTarjeta } from '../enums/estado-tarjeta.enum';
import { MotivoBloqueo } from '../enums/motivo-bloqueo.enum';
import { NivelTarjeta } from '../enums/nivel-tarjeta.enum';
import { TipoTarjeta } from '../enums/tipo-tarjeta.enum';

@Entity('tarjetas')
export class Tarjeta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  numeroTarjeta: string;

  @Column({ type: 'varchar' })
  pinHash: string;

  @Column({ type: 'varchar', length: 4 })
  cvv: string;

  @Column({ name: 'expiraEn', type: 'date' })
  expiraEn: string;

  @Column({ type: 'enum', enum: EstadoTarjeta, default: EstadoTarjeta.ACTIVA })
  estado: EstadoTarjeta;

  @Column({ type: 'int', default: 0 })
  intentosFallidos: number;

  @Column({
    name: 'motivoBloqueo',
    type: 'enum',
    enum: MotivoBloqueo,
    nullable: true,
  })
  motivoBloqueo?: MotivoBloqueo | null;

  @Column({ type: 'enum', enum: TipoTarjeta, default: TipoTarjeta.DEBITO })
  tipo: TipoTarjeta;

  @Column({ type: 'enum', enum: NivelTarjeta, nullable: true })
  nivel?: NivelTarjeta | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  limiteCredito?: number | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  creditoUtilizado?: number | null;

  @ManyToOne(() => Cuenta)
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: Cuenta;

  @CreateDateColumn({ type: 'timestamptz' })
  emitidaEn: Date;
}
