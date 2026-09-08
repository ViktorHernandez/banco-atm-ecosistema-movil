import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Cuenta } from '../../accounts/entities/cuenta.entity';
import { Usuario } from '../../users/entities/usuario.entity';

@Entity('dispositivos_push')
export class DispositivoPush {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 20, default: 'android' })
  plataforma: string;

  @Column({ type: 'varchar', length: 5, default: 'es' })
  idioma: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  modelo?: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Cuenta, { nullable: true })
  @JoinColumn({ name: 'cuenta_id' })
  cuenta?: Cuenta | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadoEn: Date;
}
