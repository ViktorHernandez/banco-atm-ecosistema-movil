import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Canal } from '../../common/enums/canal.enum';
import { AuditService } from '../audit/audit.service';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { Tarjeta } from '../cards/entities/tarjeta.entity';
import { EstadoTarjeta } from '../cards/enums/estado-tarjeta.enum';
import { MotivoBloqueo } from '../cards/enums/motivo-bloqueo.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { RolUsuario } from '../users/enums/rol-usuario.enum';
import { MailService } from '../mail/mail.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { Usuario } from '../users/entities/usuario.entity';
import { LoginAtmDto } from './dto/login-atm.dto';
import { LoginDto } from './dto/login.dto';
import { ReenviarCodigoDto } from './dto/reenviar-codigo.dto';
import { RegistroDto } from './dto/registro.dto';
import { VerificarCorreoDto } from './dto/verificar-correo.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TotpService } from './totp.service';

@Injectable()
export class AuthService {
  static readonly MAX_INTENTOS_FALLIDOS = 3;

  private readonly logger = new Logger('Autenticacion');

  constructor(
    @InjectRepository(Tarjeta)
    private readonly tarjetaRepository: Repository<Tarjeta>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly totpService: TotpService,
    private readonly onboardingService: OnboardingService,
  ) {}

  async loginAtm(dto: LoginAtmDto) {
    const tarjeta = await this.tarjetaRepository.findOne({
      where: { numeroTarjeta: dto.numeroTarjeta },
      relations: {
        cuenta: {
          usuario: true,
        },
      },
    });

    if (!tarjeta) {
      await this.auditService.registrar({
        accion: 'LOGIN_ATM_FALLIDO',
        entidadAfectada: 'Tarjeta',
        canal: Canal.ATM,
        detalle: 'Numero de tarjeta inexistente',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (tarjeta.estado === EstadoTarjeta.BLOQUEADA) {
      throw new ForbiddenException('Tarjeta bloqueada. Contacte a su banco.');
    }

    if (tarjeta.estado === EstadoTarjeta.INACTIVA) {
      throw new ForbiddenException('Tarjeta inactiva.');
    }

    const pinValido = await bcrypt.compare(dto.pin, tarjeta.pinHash);

    if (!pinValido) {
      tarjeta.intentosFallidos += 1;

      if (tarjeta.intentosFallidos >= AuthService.MAX_INTENTOS_FALLIDOS) {
        tarjeta.estado = EstadoTarjeta.BLOQUEADA;
        tarjeta.motivoBloqueo = MotivoBloqueo.INTENTOS_FALLIDOS;
      }

      await this.tarjetaRepository.save(tarjeta);

      const usuarioId = tarjeta.cuenta?.usuario?.id;

      if (tarjeta.estado === EstadoTarjeta.BLOQUEADA) {
        await this.auditService.registrar({
          usuarioId,
          accion: 'TARJETA_BLOQUEADA_POR_INTENTOS',
          entidadAfectada: 'Tarjeta',
          entidadId: tarjeta.id,
          canal: Canal.ATM,
          detalle: `Bloqueo automatico tras ${tarjeta.intentosFallidos} intentos incorrectos de PIN`,
        });
        if (tarjeta.cuenta) {
          await this.notificationsService.registrar(
            tarjeta.cuenta.id,
            'Su tarjeta fue bloqueada automáticamente por intentos incorrectos de PIN.',
          );
        }
        throw new ForbiddenException('Tarjeta bloqueada por intentos fallidos.');
      }

      await this.auditService.registrar({
        usuarioId,
        accion: 'LOGIN_ATM_FALLIDO',
        entidadAfectada: 'Tarjeta',
        entidadId: tarjeta.id,
        canal: Canal.ATM,
        detalle: `PIN incorrecto (intento ${tarjeta.intentosFallidos} de ${AuthService.MAX_INTENTOS_FALLIDOS})`,
      });

      const intentosRestantes =
        AuthService.MAX_INTENTOS_FALLIDOS - tarjeta.intentosFallidos;

      throw new UnauthorizedException(
        `PIN incorrecto. Le quedan ${intentosRestantes} intento(s).`,
      );
    }

    if (tarjeta.intentosFallidos !== 0) {
      tarjeta.intentosFallidos = 0;
      await this.tarjetaRepository.save(tarjeta);
    }

    const usuario = tarjeta.cuenta.usuario;

    const payload: JwtPayload = {
      sub: usuario.id,
      rol: usuario.rol,
      cuentaId: tarjeta.cuenta.id,
      tarjetaId: tarjeta.id,
      canal: Canal.ATM,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.auditService.registrar({
      usuarioId: usuario.id,
      accion: 'LOGIN_ATM_EXITOSO',
      entidadAfectada: 'Tarjeta',
      entidadId: tarjeta.id,
      canal: Canal.ATM,
    });

    this.logger.log(`Sesion ATM iniciada para el usuario ${usuario.id}`);

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nombreCompleto: usuario.nombreCompleto,
        rol: usuario.rol,
      },
      cuenta: {
        id: tarjeta.cuenta.id,
        numeroCuenta: tarjeta.cuenta.numeroCuenta,
      },
      tarjeta: {
        id: tarjeta.id,
        estado: tarjeta.estado,
      },
    };
  }

  async login(dto: LoginDto) {
    const canal = dto.canal ?? Canal.WEB;

    const usuario = await this.usuarioRepository.findOne({
      where: { correo: dto.correo.toLowerCase().trim() },
    });

    if (!usuario) {
      await this.auditService.registrar({
        accion: 'LOGIN_FALLIDO',
        entidadAfectada: 'Usuario',
        canal,
        detalle: 'Correo inexistente',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );

    if (!passwordValido) {
      await this.auditService.registrar({
        usuarioId: usuario.id,
        accion: 'LOGIN_FALLIDO',
        entidadAfectada: 'Usuario',
        entidadId: usuario.id,
        canal,
        detalle: 'Contrasena incorrecta',
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      await this.auditService.registrar({
        usuarioId: usuario.id,
        accion: 'LOGIN_BLOQUEADO_CUENTA_ELIMINADA',
        entidadAfectada: 'Usuario',
        entidadId: usuario.id,
        canal,
        detalle: 'La cuenta fue dada de baja',
      });
      throw new ForbiddenException(
        'Esta cuenta fue eliminada. Si desea volver a operar con el banco, cree una cuenta nueva desde el portal.',
      );
    }

    if (!usuario.correoVerificado) {
      await this.auditService.registrar({
        usuarioId: usuario.id,
        accion: 'LOGIN_BLOQUEADO_SIN_VERIFICAR',
        entidadAfectada: 'Usuario',
        entidadId: usuario.id,
        canal,
        detalle: 'El correo todavia no ha sido verificado',
      });
      throw new ForbiddenException(
        'Su cuenta todavía no está verificada. Revise su correo e introduzca el código de verificación.',
      );
    }

    if (usuario.totpActivo) {
      if (!dto.codigoTotp) {
        return {
          requiereSegundoFactor: true,
          mensaje:
            'Introduzca el código de su aplicación autenticadora para continuar.',
        };
      }

      const segundoFactorValido =
        await this.totpService.verificarSegundoFactor(usuario, dto.codigoTotp);

      if (!segundoFactorValido) {
        await this.auditService.registrar({
          usuarioId: usuario.id,
          accion: 'LOGIN_FALLIDO',
          entidadAfectada: 'Usuario',
          entidadId: usuario.id,
          canal,
          detalle: 'Segundo factor incorrecto',
        });
        throw new UnauthorizedException(
          'El código de verificación no es válido.',
        );
      }
    }

    const cuenta = await this.cuentaRepository.findOne({
      where: { usuario: { id: usuario.id } },
    });

    const payload: JwtPayload = {
      sub: usuario.id,
      rol: usuario.rol,
      canal,
      cuentaId: cuenta?.id,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.auditService.registrar({
      usuarioId: usuario.id,
      accion: 'LOGIN_EXITOSO',
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal,
    });

    if (usuario.correoVerificado) {
      void this.mailService.avisoInicioSesion(
        usuario.correo,
        usuario.nombreCompleto,
        canal,
        new Date(),
      );
    }

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nombreCompleto: usuario.nombreCompleto,
        correo: usuario.correo,
        rol: usuario.rol,
      },
      cuenta: cuenta
        ? { id: cuenta.id, numeroCuenta: cuenta.numeroCuenta }
        : null,
    };
  }

  async perfil(payload: JwtPayload) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: payload.sub },
    });

    if (!usuario) {
      throw new UnauthorizedException('La sesion ya no es valida');
    }

    return {
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.correo,
      telefono: usuario.telefono ?? null,
      correoVerificado: usuario.correoVerificado,
      rol: usuario.rol,
      canal: payload.canal,
      cuentaId: payload.cuentaId ?? null,
      tarjetaId: payload.tarjetaId ?? null,
    };
  }

  private generarCodigo(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private expiracionCodigo(): Date {
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  async registrar(dto: RegistroDto) {
    const correo = dto.correo.toLowerCase().trim();

    const existente = await this.usuarioRepository.findOne({
      where: { correo },
    });

    if (existente) {
      if (!existente.correoVerificado) {
        existente.codigoVerificacion = this.generarCodigo();
        existente.codigoVerificacionExpira = this.expiracionCodigo();
        await this.usuarioRepository.save(existente);

        void this.mailService.codigoVerificacion(
          existente.correo,
          existente.nombreCompleto,
          existente.codigoVerificacion,
        );
      }

      await this.auditService.registrar({
        accion: 'REGISTRO_CORREO_DUPLICADO',
        entidadAfectada: 'Usuario',
        canal: Canal.WEB,
        detalle: 'Intento de registro con un correo ya existente',
      });

      return {
        registrado: true,
        correo,
        envioDeCorreoActivo: this.mailService.habilitado,
        estadoCuenta: 'PENDIENTE',
        mensaje:
          'Le enviamos un código de verificación. Revise su correo para activar la cuenta.',
      };
    }

    const codigo = this.generarCodigo();

    const usuario = this.usuarioRepository.create({
      nombreCompleto: dto.nombreCompleto.trim(),
      correo,
      telefono: dto.telefono.trim(),
      passwordHash: await bcrypt.hash(dto.password, 10),
      rol: RolUsuario.CLIENTE,
      correoVerificado: false,
      codigoVerificacion: codigo,
      codigoVerificacionExpira: this.expiracionCodigo(),
    });

    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId: usuario.id,
      accion: 'REGISTRO_SOLICITADO',
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal: Canal.WEB,
      detalle: 'Alta desde el portal publico, pendiente de verificacion',
    });

    const enviado = await this.mailService.codigoVerificacion(
      correo,
      usuario.nombreCompleto,
      codigo,
    );

    this.logger.log(`Registro pendiente de verificacion para ${correo}`);

    return {
      registrado: true,
      correo,
      correoEnviado: enviado,
      envioDeCorreoActivo: this.mailService.habilitado,
      estadoCuenta: 'PENDIENTE',
      mensaje: enviado
        ? 'Le enviamos un código de verificación. Revise su correo para activar la cuenta.'
        : 'Su registro quedó pendiente de verificación. No fue posible entregar el correo con el código; solicite un código nuevo o contacte al banco.',
    };
  }

  async verificarCorreo(dto: VerificarCorreoDto) {
    const correo = dto.correo.toLowerCase().trim();

    const usuario = await this.usuarioRepository.findOne({
      where: { correo },
    });

    if (!usuario) {
      throw new BadRequestException('El código de verificación no es válido');
    }

    if (usuario.correoVerificado) {
      return {
        verificado: true,
        mensaje: 'Su cuenta ya estaba verificada. Puede iniciar sesión.',
      };
    }

    if (
      !usuario.codigoVerificacion ||
      usuario.codigoVerificacion !== dto.codigo
    ) {
      await this.auditService.registrar({
        usuarioId: usuario.id,
        accion: 'VERIFICACION_FALLIDA',
        entidadAfectada: 'Usuario',
        entidadId: usuario.id,
        canal: Canal.WEB,
        detalle: 'Codigo incorrecto',
      });
      throw new BadRequestException('El código de verificación no es válido');
    }

    if (
      usuario.codigoVerificacionExpira &&
      usuario.codigoVerificacionExpira.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'El código de verificación venció. Solicite uno nuevo.',
      );
    }

    usuario.correoVerificado = true;
    usuario.codigoVerificacion = null;
    usuario.codigoVerificacionExpira = null;
    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId: usuario.id,
      accion: 'CORREO_VERIFICADO',
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal: Canal.WEB,
    });

    this.logger.log(`Correo verificado para ${correo}`);

    const apertura = await this.abrirCuentaDelCliente(usuario);

    return {
      verificado: true,
      cuentaCreada: apertura.creada,
      numeroCuenta: apertura.numeroCuenta,
      mensaje: apertura.numeroCuenta
        ? `Su correo quedó verificado y abrimos su cuenta ${apertura.numeroCuenta}. Ya puede iniciar sesión.`
        : 'Su correo quedó verificado. Ya puede iniciar sesión.',
    };
  }

  private async abrirCuentaDelCliente(usuario: Usuario): Promise<{
    creada: boolean;
    numeroCuenta: string | null;
  }> {
    if (usuario.rol !== RolUsuario.CLIENTE) {
      return { creada: false, numeroCuenta: null };
    }

    try {
      const apertura = await this.onboardingService.abrirCuentaSiNoExiste(
        usuario.id,
      );

      if (!apertura.creada) {
        return { creada: false, numeroCuenta: apertura.cuenta.numeroCuenta };
      }

      await this.auditService.registrar({
        usuarioId: usuario.id,
        accion: 'CUENTA_ABIERTA_AUTOMATICAMENTE',
        entidadAfectada: 'Cuenta',
        entidadId: apertura.cuenta.id,
        canal: Canal.WEB,
        detalle: `Cuenta ${apertura.cuenta.numeroCuenta} tras verificar el correo`,
      });

      await this.notificationsService.registrar(
        apertura.cuenta.id,
        `Su cuenta ${apertura.cuenta.numeroCuenta} quedó abierta y su tarjeta de débito fue emitida.`,
      );

      void this.mailService.cuentaAbierta(
        usuario.correo,
        usuario.nombreCompleto,
        apertura.cuenta.numeroCuenta,
        apertura.numeroTarjeta as string,
        apertura.pinInicial as string,
      );

      return { creada: true, numeroCuenta: apertura.cuenta.numeroCuenta };
    } catch (error) {
      this.logger.error(
        `No fue posible abrir la cuenta del usuario ${usuario.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { creada: false, numeroCuenta: null };
    }
  }

  async reenviarCodigo(dto: ReenviarCodigoDto) {
    const correo = dto.correo.toLowerCase().trim();

    const usuario = await this.usuarioRepository.findOne({
      where: { correo },
    });

    if (usuario && !usuario.correoVerificado) {
      usuario.codigoVerificacion = this.generarCodigo();
      usuario.codigoVerificacionExpira = this.expiracionCodigo();
      await this.usuarioRepository.save(usuario);

      void this.mailService.codigoVerificacion(
        usuario.correo,
        usuario.nombreCompleto,
        usuario.codigoVerificacion,
      );
    }

    return {
      mensaje:
        'Si la cuenta existe y está pendiente de verificación, le enviamos un código nuevo.',
    };
  }

  async logout(payload: JwtPayload) {
    await this.auditService.registrar({
      usuarioId: payload.sub,
      accion: 'CIERRE_SESION',
      entidadAfectada: 'Usuario',
      entidadId: payload.sub,
      canal: payload.canal,
    });

    return { mensaje: 'Sesion finalizada' };
  }
}
