import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { Usuario } from '../users/entities/usuario.entity';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { Canal } from '../../common/enums/canal.enum';

const MINUTOS_VIGENCIA = 30;
const SEGUNDOS_ENTRE_SOLICITUDES = 60;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger('Recuperacion');

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  private generarCodigo(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private normalizar(correo: string): string {
    return String(correo ?? '')
      .toLowerCase()
      .trim();
  }

  async solicitar(correo: string, idioma?: string) {
    const respuesta = {
      solicitado: true,
      mensaje:
        'Si el correo corresponde a una cuenta activa, le enviamos un código para restablecer su contraseña.',
    };

    const usuario = await this.usuarioRepository.findOne({
      where: { correo: this.normalizar(correo) },
    });

    if (!usuario || !usuario.activo || !usuario.correoVerificado) {
      return respuesta;
    }

    if (usuario.recuperacionSolicitadaEn) {
      const transcurrido =
        Date.now() - new Date(usuario.recuperacionSolicitadaEn).getTime();

      if (transcurrido < SEGUNDOS_ENTRE_SOLICITUDES * 1000) {
        return respuesta;
      }
    }

    const codigo = this.generarCodigo();

    usuario.recuperacionHash = await bcrypt.hash(codigo, 10);
    usuario.recuperacionExpira = new Date(
      Date.now() + MINUTOS_VIGENCIA * 60 * 1000,
    );
    usuario.recuperacionSolicitadaEn = new Date();

    if (idioma === 'es' || idioma === 'en') {
      usuario.idioma = idioma;
    }

    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId: usuario.id,
      accion: 'RECUPERACION_SOLICITADA',
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal: Canal.WEB,
    });

    void this.mailService.recuperacionPassword(
      usuario.correo,
      usuario.nombreCompleto,
      codigo,
      MINUTOS_VIGENCIA,
      usuario.idioma ?? 'es',
    );

    this.logger.log(`Codigo de recuperacion emitido para ${usuario.id}`);

    return respuesta;
  }

  async restablecer(correo: string, codigo: string, password: string) {
    const invalido = new BadRequestException(
      'El código no es válido o ya expiró. Solicite uno nuevo.',
    );

    const usuario = await this.usuarioRepository.findOne({
      where: { correo: this.normalizar(correo) },
    });

    if (
      !usuario ||
      !usuario.activo ||
      !usuario.recuperacionHash ||
      !usuario.recuperacionExpira
    ) {
      throw invalido;
    }

    if (new Date(usuario.recuperacionExpira).getTime() < Date.now()) {
      usuario.recuperacionHash = null;
      usuario.recuperacionExpira = null;
      await this.usuarioRepository.save(usuario);
      throw invalido;
    }

    const valido = await bcrypt.compare(
      String(codigo ?? '').trim(),
      usuario.recuperacionHash,
    );

    if (!valido) {
      await this.auditService.registrar({
        usuarioId: usuario.id,
        accion: 'RECUPERACION_FALLIDA',
        entidadAfectada: 'Usuario',
        entidadId: usuario.id,
        canal: Canal.WEB,
      });
      throw invalido;
    }

    usuario.passwordHash = await bcrypt.hash(password, 10);
    usuario.recuperacionHash = null;
    usuario.recuperacionExpira = null;
    usuario.recuperacionSolicitadaEn = null;
    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId: usuario.id,
      accion: 'RECUPERACION_COMPLETADA',
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal: Canal.WEB,
    });

    void this.mailService.cambioDePerfil(
      usuario.correo,
      usuario.nombreCompleto,
      'Su contraseña de banca en línea fue restablecida correctamente.',
    );

    return {
      restablecido: true,
      mensaje:
        'Su contraseña fue actualizada. Ya puede entrar con la nueva contraseña.',
    };
  }
}
