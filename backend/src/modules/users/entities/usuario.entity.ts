import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RolUsuario } from '../enums/rol-usuario.enum';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 25, nullable: true })
  telefono?: string | null;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'enum', enum: RolUsuario })
  rol: RolUsuario;

  @Column({ type: 'boolean', default: true })
  correoVerificado: boolean;

  @Column({ type: 'varchar', length: 12, nullable: true })
  codigoVerificacion?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  codigoVerificacionExpira?: Date | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'varchar', length: 5, default: 'es' })
  idioma: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  recuperacionHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  recuperacionExpira?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  recuperacionSolicitadaEn?: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  totpSecreto?: string | null;

  @Column({ type: 'boolean', default: false })
  totpActivo: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  totpActivadoEn?: Date | null;

  @Column({ type: 'text', nullable: true })
  totpCodigosRecuperacion?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  eliminadoEn?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  eliminadoPor?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}
