import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cuenta } from '../../accounts/entities/cuenta.entity';
import { CategoriaNotificacion } from '../enums/categoria-notificacion.enum';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cuenta)
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: Cuenta;

  @Column({ type: 'varchar' })
  mensaje: string;

  @Column({
    type: 'enum',
    enum: CategoriaNotificacion,
    default: CategoriaNotificacion.GENERAL,
  })
  categoria: CategoriaNotificacion;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  leidaEn?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadaEn: Date;
}
