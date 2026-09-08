import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Canal } from '../../common/enums/canal.enum';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Usuario } from '../users/entities/usuario.entity';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger('Perfil');

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  private async obtener(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  private async cuentaDe(usuarioId: string): Promise<Cuenta | null> {
    return this.cuentaRepository.findOne({
      where: { usuario: { id: usuarioId } },
    });
  }

  private async registrarCambio(
    usuario: Usuario,
    canal: Canal,
    accion: string,
    descripcion: string,
    correoDestino: string,
  ): Promise<void> {
    await this.auditService.registrar({
      usuarioId: usuario.id,
      accion,
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal,
      detalle: descripcion,
    });

    const cuenta = await this.cuentaDe(usuario.id);
    if (cuenta) {
      await this.notificationsService.registrar(cuenta.id, descripcion);
    }

    if (correoDestino && usuario.correoVerificado) {
      void this.mailService.cambioDePerfil(
        correoDestino,
        usuario.nombreCompleto,
        descripcion,
      );
    }
  }

  async consultar(usuarioId: string, canal: Canal) {
    const usuario = await this.obtener(usuarioId);
    const cuenta = await this.cuentaDe(usuarioId);

    return {
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.correo,
      telefono: usuario.telefono ?? null,
      correoVerificado: usuario.correoVerificado,
      rol: usuario.rol,
      canal,
      creadoEn: usuario.creadoEn,
      cuentaId: cuenta?.id ?? null,
    };
  }

  async actualizar(
    usuarioId: string,
    canal: Canal,
    dto: ActualizarPerfilDto,
  ) {
    const usuario = await this.obtener(usuarioId);
    const correoAnterior = usuario.correo;
    const cambios: string[] = [];

    if (
      dto.nombreCompleto &&
      dto.nombreCompleto.trim() !== usuario.nombreCompleto
    ) {
      usuario.nombreCompleto = dto.nombreCompleto.trim();
      cambios.push('nombre');
    }

    if (dto.telefono && dto.telefono.trim() !== (usuario.telefono ?? '')) {
      usuario.telefono = dto.telefono.trim();
      cambios.push('teléfono');
    }

    let correoCambiado = false;
    if (dto.correo) {
      const correo = dto.correo.toLowerCase().trim();

      if (correo !== usuario.correo) {
        const ocupado = await this.usuarioRepository.findOne({
          where: { correo },
        });

        if (ocupado && ocupado.id !== usuarioId) {
          throw new ConflictException('Ya existe un usuario con ese correo');
        }

        usuario.correo = correo;
        correoCambiado = true;
        cambios.push('correo electrónico');
      }
    }

    if (!cambios.length) {
      throw new BadRequestException('No indicó ningún dato que modificar');
    }

    await this.usuarioRepository.save(usuario);

    const descripcion = `Se actualizó su ${cambios.join(', ')} en Banco ATM.`;

    await this.registrarCambio(
      usuario,
      canal,
      'PERFIL_ACTUALIZADO',
      descripcion,
      usuario.correo,
    );

    if (correoCambiado && usuario.correoVerificado) {
      void this.mailService.cambioDePerfil(
        correoAnterior,
        usuario.nombreCompleto,
        `El correo asociado a su cuenta de Banco ATM cambió a ${usuario.correo}. Si no reconoce este cambio, comuníquese con el banco de inmediato.`,
      );
    }

    this.logger.log(
      `Perfil actualizado (${cambios.join(', ')}) para el usuario ${usuarioId}`,
    );

    return {
      actualizado: true,
      cambios,
      mensaje: descripcion,
      perfil: await this.consultar(usuarioId, canal),
    };
  }

  async cambiarPassword(
    usuarioId: string,
    canal: Canal,
    dto: CambiarPasswordDto,
  ) {
    const usuario = await this.obtener(usuarioId);

    const valida = await bcrypt.compare(
      dto.passwordActual,
      usuario.passwordHash,
    );

    if (!valida) {
      await this.auditService.registrar({
        usuarioId: usuario.id,
        accion: 'CAMBIO_PASSWORD_FALLIDO',
        entidadAfectada: 'Usuario',
        entidadId: usuario.id,
        canal,
        detalle: 'Contrasena actual incorrecta',
      });
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    if (dto.passwordNueva !== dto.passwordConfirmacion) {
      throw new BadRequestException(
        'La confirmación no coincide con la nueva contraseña',
      );
    }

    if (dto.passwordNueva === dto.passwordActual) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    usuario.passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    await this.usuarioRepository.save(usuario);

    await this.registrarCambio(
      usuario,
      canal,
      'CAMBIO_PASSWORD_EXITOSO',
      'Se cambió la contraseña de su banca en línea.',
      usuario.correo,
    );

    this.logger.log(`Contrasena actualizada para el usuario ${usuarioId}`);

    return {
      actualizado: true,
      mensaje:
        'Su contraseña se actualizó correctamente. Úsela la próxima vez que entre.',
    };
  }
}
