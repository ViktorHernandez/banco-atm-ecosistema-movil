import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import {
  construirUri,
  generarSecreto,
  verificarCodigo,
} from '../../common/utils/totp.util';
import * as QRCode from 'qrcode';
import { Usuario } from '../users/entities/usuario.entity';
import { AuditService } from '../audit/audit.service';
import { Canal } from '../../common/enums/canal.enum';

export class SecretoTotpIlegible extends Error {
  constructor() {
    super('El secreto TOTP no se puede descifrar con la clave actual.');
    this.name = 'SecretoTotpIlegible';
  }
}

const EMISOR = 'Banco ATM';
const CODIGOS_RECUPERACION = 8;

@Injectable()
export class TotpService {
  private readonly logger = new Logger('SegundoFactor');

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  private avisoClaveEmitido = false;

  private clave(): Buffer {
    const propia = this.configService.get<string>('TOTP_ENCRYPTION_KEY');
    const respaldo = this.configService.get<string>('JWT_SECRET');
    const secreto = propia ?? respaldo ?? '';

    if (!secreto) {
      throw new Error(
        'Falta TOTP_ENCRYPTION_KEY o JWT_SECRET para proteger el secreto TOTP.',
      );
    }

    if (!propia && !this.avisoClaveEmitido) {
      this.avisoClaveEmitido = true;
      this.logger.warn(
        'TOTP_ENCRYPTION_KEY no esta definida y se deriva la clave de JWT_SECRET. ' +
          'Definir o cambiar cualquiera de las dos variables invalida los secretos TOTP ya guardados ' +
          'y obliga a los usuarios a volver a vincular su aplicacion autenticadora.',
      );
    }

    return createHash('sha256').update(secreto).digest();
  }

  private cifrar(valor: string): string {
    const iv = randomBytes(12);
    const cifrador = createCipheriv('aes-256-gcm', this.clave(), iv);
    const cifrado = Buffer.concat([
      cifrador.update(valor, 'utf8'),
      cifrador.final(),
    ]);
    const etiqueta = cifrador.getAuthTag();

    return [
      iv.toString('base64'),
      etiqueta.toString('base64'),
      cifrado.toString('base64'),
    ].join('.');
  }

  private descifrar(valor: string): string {
    const partes = valor.split('.');

    if (partes.length !== 3) {
      throw new SecretoTotpIlegible();
    }

    const descifrador = createDecipheriv(
      'aes-256-gcm',
      this.clave(),
      Buffer.from(partes[0], 'base64'),
    );
    descifrador.setAuthTag(Buffer.from(partes[1], 'base64'));

    try {
      return Buffer.concat([
        descifrador.update(Buffer.from(partes[2], 'base64')),
        descifrador.final(),
      ]).toString('utf8');
    } catch {
      throw new SecretoTotpIlegible();
    }
  }

  private async obtener(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  private generarCodigosRecuperacion(): string[] {
    const codigos: string[] = [];

    for (let i = 0; i < CODIGOS_RECUPERACION; i += 1) {
      const bruto = randomBytes(5).toString('hex').toUpperCase();
      codigos.push(`${bruto.slice(0, 5)}-${bruto.slice(5, 10)}`);
    }

    return codigos;
  }

  private secretoLegible(usuario: Usuario): boolean {
    if (!usuario.totpSecreto) {
      return false;
    }

    try {
      this.descifrar(usuario.totpSecreto);
      return true;
    } catch (error) {
      if (error instanceof SecretoTotpIlegible) {
        return false;
      }
      throw error;
    }
  }

  async estado(usuarioId: string) {
    const usuario = await this.obtener(usuarioId);
    const requiereRevinculacion =
      usuario.totpActivo === true && !this.secretoLegible(usuario);

    return {
      activo: usuario.totpActivo === true,
      requiereRevinculacion,
      configuracionPendiente: Boolean(
        usuario.totpSecreto && !usuario.totpActivo,
      ),
      activadoEn: usuario.totpActivadoEn ?? null,
      codigosDisponibles: usuario.totpCodigosRecuperacion
        ? (JSON.parse(usuario.totpCodigosRecuperacion) as string[]).length
        : 0,
    };
  }

  async iniciar(usuarioId: string) {
    const usuario = await this.obtener(usuarioId);

    if (usuario.totpActivo && this.secretoLegible(usuario)) {
      throw new ConflictException(
        'El segundo factor ya está activo. Desactívelo antes de configurar otro dispositivo.',
      );
    }

    if (usuario.totpActivo) {
      usuario.totpActivo = false;
      usuario.totpActivadoEn = null;
      this.logger.warn(
        `Se reinicia la vinculacion del usuario ${usuarioId} porque su secreto TOTP no es legible.`,
      );
    }

    const secreto = generarSecreto();

    usuario.totpSecreto = this.cifrar(secreto);
    usuario.totpActivo = false;
    await this.usuarioRepository.save(usuario);

    const uri = construirUri(secreto, usuario.correo, EMISOR);

    return {
      secreto,
      uri,
      qr: await QRCode.toDataURL(uri),
    };
  }

  async confirmar(usuarioId: string, codigo: string) {
    const usuario = await this.obtener(usuarioId);

    if (!usuario.totpSecreto) {
      throw new BadRequestException(
        'Primero debe iniciar la configuración del segundo factor.',
      );
    }

    if (usuario.totpActivo) {
      throw new ConflictException('El segundo factor ya está activo.');
    }

    let valido = false;

    try {
      valido = await this.validarCodigo(
        this.descifrar(usuario.totpSecreto),
        codigo,
      );
    } catch (error) {
      if (!(error instanceof SecretoTotpIlegible)) {
        throw error;
      }

      throw new BadRequestException(
        'La configuración anterior ya no es válida. Vuelva a iniciar la vinculación de su aplicación autenticadora.',
      );
    }

    if (!valido) {
      throw new BadRequestException(
        'El código no es válido. Compruebe la hora de su dispositivo e inténtelo de nuevo.',
      );
    }

    const codigos = this.generarCodigosRecuperacion();

    usuario.totpActivo = true;
    usuario.totpActivadoEn = new Date();
    usuario.totpCodigosRecuperacion = JSON.stringify(
      await Promise.all(codigos.map((valor) => bcrypt.hash(valor, 10))),
    );
    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId,
      accion: 'TOTP_ACTIVADO',
      entidadAfectada: 'Usuario',
      entidadId: usuarioId,
      canal: Canal.WEB,
    });

    this.logger.log(`Segundo factor activado para el usuario ${usuarioId}`);

    return { activo: true, codigosRecuperacion: codigos };
  }

  async desactivar(usuarioId: string, password: string) {
    const usuario = await this.obtener(usuarioId);

    if (!usuario.totpActivo) {
      throw new ConflictException('El segundo factor no está activo.');
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValido) {
      throw new BadRequestException('La contraseña no es correcta.');
    }

    usuario.totpActivo = false;
    usuario.totpSecreto = null;
    usuario.totpActivadoEn = null;
    usuario.totpCodigosRecuperacion = null;
    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId,
      accion: 'TOTP_DESACTIVADO',
      entidadAfectada: 'Usuario',
      entidadId: usuarioId,
      canal: Canal.WEB,
    });

    return { activo: false };
  }

  private async validarCodigo(
    secreto: string,
    codigo: string,
  ): Promise<boolean> {
    const limpio = String(codigo ?? '').replace(/\s+/g, '');

    if (!/^\d{6}$/.test(limpio)) {
      return false;
    }

    return verificarCodigo(secreto, limpio);
  }

  async verificarSegundoFactor(
    usuario: Usuario,
    codigo: string,
  ): Promise<boolean> {
    if (!usuario.totpActivo || !usuario.totpSecreto) {
      return true;
    }

    const limpio = String(codigo ?? '').trim();

    if (!limpio) {
      return false;
    }

    try {
      if (
        await this.validarCodigo(this.descifrar(usuario.totpSecreto), limpio)
      ) {
        return true;
      }
    } catch (error) {
      if (!(error instanceof SecretoTotpIlegible)) {
        throw error;
      }

      this.logger.error(
        `El secreto TOTP del usuario ${usuario.id} no se puede descifrar con la clave actual. ` +
          'Solo se aceptaran codigos de recuperacion hasta que vuelva a vincular su aplicacion.',
      );
    }

    return this.consumirCodigoRecuperacion(usuario, limpio);
  }

  private async consumirCodigoRecuperacion(
    usuario: Usuario,
    codigo: string,
  ): Promise<boolean> {
    if (!usuario.totpCodigosRecuperacion) {
      return false;
    }

    const almacenados = JSON.parse(
      usuario.totpCodigosRecuperacion,
    ) as string[];

    for (let i = 0; i < almacenados.length; i += 1) {
      if (await bcrypt.compare(codigo.toUpperCase(), almacenados[i])) {
        almacenados.splice(i, 1);
        usuario.totpCodigosRecuperacion = JSON.stringify(almacenados);
        await this.usuarioRepository.save(usuario);

        await this.auditService.registrar({
          usuarioId: usuario.id,
          accion: 'TOTP_CODIGO_RECUPERACION_USADO',
          entidadAfectada: 'Usuario',
          entidadId: usuario.id,
          canal: Canal.WEB,
          detalle: `Quedan ${almacenados.length} codigos`,
        });

        return true;
      }
    }

    return false;
  }
}
