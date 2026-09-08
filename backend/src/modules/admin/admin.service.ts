import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Canal } from '../../common/enums/canal.enum';
import { Tarjeta } from '../cards/entities/tarjeta.entity';
import { EstadoTarjeta } from '../cards/enums/estado-tarjeta.enum';
import { MotivoBloqueo } from '../cards/enums/motivo-bloqueo.enum';
import { RolUsuario } from '../users/enums/rol-usuario.enum';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { enmascararNumero } from '../../common/utils/enmascarar.util';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { AuditService } from '../audit/audit.service';
import { Transaccion } from '../transactions/entities/transaccion.entity';
import { EstadoTransaccion } from '../transactions/enums/estado-transaccion.enum';
import { Usuario } from '../users/entities/usuario.entity';
import { calcularVigencia, generarCvv } from '../../common/utils/tarjeta.util';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly logger = new Logger('Administracion');

  async listarUsuarios() {
    const usuarios = await this.usuarioRepository.find({
      where: { activo: true },
      order: { creadoEn: 'ASC' },
    });

    const cuentas = await this.cuentaRepository.find({
      where: { usuario: { activo: true } },
      relations: { usuario: true },
    });

    return usuarios.map((usuario) => {
      const cuenta = cuentas.find((item) => item.usuario?.id === usuario.id);
      return {
        id: usuario.id,
        nombreCompleto: usuario.nombreCompleto,
        correo: usuario.correo,
        telefono: usuario.telefono ?? null,
        correoVerificado: usuario.correoVerificado,
        estadoCuenta: usuario.correoVerificado ? 'ACTIVA' : 'PENDIENTE',
        puedeEliminarse: usuario.rol === RolUsuario.CLIENTE,
        rol: usuario.rol,
        creadoEn: usuario.creadoEn,
        cuenta: cuenta
          ? {
              id: cuenta.id,
              numeroCuenta: cuenta.numeroCuenta,
              saldo: cuenta.saldo,
            }
          : null,
      };
    });
  }

  async obtenerUsuario(usuarioId: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const cuenta = await this.cuentaRepository.findOne({
      where: { usuario: { id: usuarioId } },
    });

    return {
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      correo: usuario.correo,
      telefono: usuario.telefono ?? null,
      correoVerificado: usuario.correoVerificado,
      estadoCuenta: usuario.correoVerificado ? 'ACTIVA' : 'PENDIENTE',
      rol: usuario.rol,
      creadoEn: usuario.creadoEn,
      cuenta: cuenta
        ? {
            id: cuenta.id,
            numeroCuenta: cuenta.numeroCuenta,
            saldo: cuenta.saldo,
          }
        : null,
    };
  }

  async crearCliente(dto: CrearUsuarioDto, administradorId: string) {
    const correo = dto.correo.toLowerCase().trim();

    const correoExistente = await this.usuarioRepository.findOne({
      where: { correo },
    });
    if (correoExistente) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const cuentaExistente = await this.cuentaRepository.findOne({
      where: { numeroCuenta: dto.numeroCuenta },
    });
    if (cuentaExistente) {
      throw new ConflictException('Ya existe una cuenta con ese número');
    }

    const resultado = await this.dataSource.transaction(async (manager) => {
      const tarjetaExistente = await manager.findOne(Tarjeta, {
        where: { numeroTarjeta: dto.numeroTarjeta },
      });
      if (tarjetaExistente) {
        throw new ConflictException('Ya existe una tarjeta con ese número');
      }

      const usuario = manager.create(Usuario, {
        nombreCompleto: dto.nombreCompleto,
        correo,
        telefono: dto.telefono ?? null,
        passwordHash: await bcrypt.hash(dto.password, 10),
        rol: RolUsuario.CLIENTE,
        correoVerificado: true,
      });
      await manager.save(Usuario, usuario);

      const cuenta = manager.create(Cuenta, {
        numeroCuenta: dto.numeroCuenta,
        saldo: dto.saldoInicial ?? 0,
        usuario,
      });
      await manager.save(Cuenta, cuenta);

      const tarjeta = manager.create(Tarjeta, {
        numeroTarjeta: dto.numeroTarjeta,
        pinHash: await bcrypt.hash(dto.pin, 10),
        cvv: generarCvv(),
        expiraEn: calcularVigencia(),
        estado: EstadoTarjeta.ACTIVA,
        intentosFallidos: 0,
        cuenta,
      });
      await manager.save(Tarjeta, tarjeta);

      return { usuario, cuenta, tarjeta };
    });

    await this.auditService.registrar({
      usuarioId: administradorId,
      accion: 'CLIENTE_CREADO_POR_ADMIN',
      entidadAfectada: 'Usuario',
      entidadId: resultado.usuario.id,
      canal: Canal.WEB,
      detalle: `Cuenta ${dto.numeroCuenta}`,
    });

    return {
      id: resultado.usuario.id,
      nombreCompleto: resultado.usuario.nombreCompleto,
      correo: resultado.usuario.correo,
      rol: resultado.usuario.rol,
      cuenta: {
        id: resultado.cuenta.id,
        numeroCuenta: resultado.cuenta.numeroCuenta,
        saldo: resultado.cuenta.saldo,
      },
      tarjeta: {
        id: resultado.tarjeta.id,
        numeroTarjeta: enmascararNumero(resultado.tarjeta.numeroTarjeta),
        estado: resultado.tarjeta.estado,
      },
    };
  }

  async actualizarUsuario(
    usuarioId: string,
    dto: ActualizarUsuarioDto,
    administradorId: string,
  ) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.correo) {
      const correo = dto.correo.toLowerCase().trim();
      const ocupado = await this.usuarioRepository.findOne({ where: { correo } });
      if (ocupado && ocupado.id !== usuarioId) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
      usuario.correo = correo;
    }

    if (dto.nombreCompleto) {
      usuario.nombreCompleto = dto.nombreCompleto;
    }

    if (dto.telefono) {
      usuario.telefono = dto.telefono.trim();
    }

    if (dto.password) {
      usuario.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId: administradorId,
      accion: 'USUARIO_ACTUALIZADO_POR_ADMIN',
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal: Canal.WEB,
      detalle: dto.password
        ? 'Datos actualizados incluyendo restablecimiento de contrasena'
        : 'Datos de identidad actualizados',
    });

    return this.obtenerUsuario(usuario.id);
  }

  async cambiarRol(
    usuarioId: string,
    dto: CambiarRolDto,
    administradorId: string,
  ) {
    if (usuarioId === administradorId) {
      throw new BadRequestException(
        'No puede cambiar su propio rol. Pídalo a otro administrador.',
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!usuario.correoVerificado) {
      throw new ConflictException(
        'El usuario todavía no ha verificado su correo. No es posible asignarle un rol hasta que active su cuenta.',
      );
    }

    if (usuario.rol === dto.rol) {
      throw new ConflictException(
        `El usuario ya tiene el perfil ${dto.rol}.`,
      );
    }

    if (
      usuario.rol === RolUsuario.ADMINISTRADOR &&
      dto.rol === RolUsuario.CLIENTE
    ) {
      const administradores = await this.usuarioRepository.count({
        where: { rol: RolUsuario.ADMINISTRADOR },
      });

      if (administradores <= 1) {
        throw new ConflictException(
          'No es posible quitar el último administrador del sistema.',
        );
      }
    }

    const rolAnterior = usuario.rol;
    usuario.rol = dto.rol;
    await this.usuarioRepository.save(usuario);

    await this.auditService.registrar({
      usuarioId: administradorId,
      accion: 'ROL_USUARIO_MODIFICADO',
      entidadAfectada: 'Usuario',
      entidadId: usuario.id,
      canal: Canal.WEB,
      detalle: `${rolAnterior} -> ${dto.rol}`,
    });

    const descripcion =
      dto.rol === RolUsuario.ADMINISTRADOR
        ? 'Su usuario recibió el perfil de Administrador en Banco ATM.'
        : 'Su usuario volvió al perfil de Cliente en Banco ATM.';

    const cuenta = await this.cuentaRepository.findOne({
      where: { usuario: { id: usuario.id } },
    });

    if (cuenta) {
      await this.notificationsService.registrar(cuenta.id, descripcion);
    }

    if (usuario.correoVerificado) {
      void this.mailService.cambioDePerfil(
        usuario.correo,
        usuario.nombreCompleto,
        descripcion,
      );
    }

    this.logger.log(
      `Rol de ${usuario.id} cambiado de ${rolAnterior} a ${dto.rol} por ${administradorId}`,
    );

    return {
      actualizado: true,
      rolAnterior,
      rolNuevo: dto.rol,
      mensaje: descripcion,
      usuario: await this.obtenerUsuario(usuario.id),
    };
  }

  async eliminarCliente(usuarioId: string, administradorId: string) {
    if (usuarioId === administradorId) {
      throw new BadRequestException(
        'No puede eliminar su propia cuenta desde el panel administrativo.',
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      throw new ConflictException(
        'Solo es posible eliminar cuentas de clientes. Cambie primero el perfil a Cliente.',
      );
    }

    if (!usuario.activo) {
      throw new ConflictException('Esta cuenta ya fue eliminada.');
    }

    const correo = usuario.correo;
    const nombre = usuario.nombreCompleto;

    const cuentas = await this.cuentaRepository.find({
      where: { usuario: { id: usuarioId } },
    });

    const idsCuentas = cuentas.map((cuenta) => cuenta.id);

    let avisoEnviado = false;
    try {
      avisoEnviado = await this.mailService.cuentaEliminada(correo, nombre);
    } catch {
      avisoEnviado = false;
    }

    const resumen = await this.dataSource.transaction(async (manager) => {
      let tarjetas = 0;
      let prestamos = 0;
      let notificaciones = 0;
      let transaccionesDesvinculadas = 0;
      let transaccionesEliminadas = 0;

      const contar = (resultado: unknown): number =>
        Array.isArray(resultado) && typeof resultado[1] === 'number'
          ? resultado[1]
          : 0;

      if (idsCuentas.length) {
        notificaciones = contar(
          await manager.query(
            'DELETE FROM notificaciones WHERE cuenta_id = ANY($1::uuid[])',
            [idsCuentas],
          ),
        );

        tarjetas = contar(
          await manager.query(
            'DELETE FROM tarjetas WHERE cuenta_id = ANY($1::uuid[])',
            [idsCuentas],
          ),
        );

        prestamos = contar(
          await manager.query(
            'DELETE FROM prestamos WHERE cuenta_id = ANY($1::uuid[])',
            [idsCuentas],
          ),
        );

        transaccionesEliminadas = contar(
          await manager.query(
            `DELETE FROM transacciones
             WHERE (cuenta_origen_id = ANY($1::uuid[]) OR cuenta_origen_id IS NULL)
               AND (cuenta_destino_id = ANY($1::uuid[]) OR cuenta_destino_id IS NULL)
               AND (cuenta_origen_id IS NOT NULL OR cuenta_destino_id IS NOT NULL)`,
            [idsCuentas],
          ),
        );

        transaccionesDesvinculadas =
          contar(
            await manager.query(
              'UPDATE transacciones SET cuenta_origen_id = NULL WHERE cuenta_origen_id = ANY($1::uuid[])',
              [idsCuentas],
            ),
          ) +
          contar(
            await manager.query(
              'UPDATE transacciones SET cuenta_destino_id = NULL WHERE cuenta_destino_id = ANY($1::uuid[])',
              [idsCuentas],
            ),
          );

        await manager.query('DELETE FROM cuentas WHERE id = ANY($1::uuid[])', [
          idsCuentas,
        ]);
      }

      await manager.query(
        'UPDATE registros_auditoria SET usuario_id = NULL WHERE usuario_id = $1',
        [usuarioId],
      );

      await manager.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);

      return {
        tarjetas,
        prestamos,
        notificaciones,
        transaccionesDesvinculadas,
        transaccionesEliminadas,
      };
    });

    await this.auditService.registrar({
      usuarioId: administradorId,
      accion: 'USUARIO_ELIMINADO',
      entidadAfectada: 'Usuario',
      entidadId: usuarioId,
      canal: Canal.WEB,
      detalle: `Eliminacion definitiva de ${nombre}; ${cuentas.length} cuentas, ${resumen.tarjetas} tarjetas, ${resumen.prestamos} prestamos`,
    });

    this.logger.log(
      `Usuario ${usuarioId} eliminado por ${administradorId}: ` +
        `${cuentas.length} cuentas, ${resumen.tarjetas} tarjetas, ${resumen.prestamos} prestamos, ` +
        `${resumen.notificaciones} avisos, ${resumen.transaccionesEliminadas} transacciones propias eliminadas, ` +
        `${resumen.transaccionesDesvinculadas} transacciones compartidas desvinculadas`,
    );

    return {
      eliminado: true,
      mensaje: `La cuenta de ${nombre} fue eliminada.`,
      avisoEnviado,
      cuentasEliminadas: cuentas.length,
      tarjetasEliminadas: resumen.tarjetas,
      prestamosEliminados: resumen.prestamos,
      transaccionesConservadas: resumen.transaccionesDesvinculadas,
    };
  }

  async reporteOperaciones() {
    const transacciones = await this.transaccionRepository.find({
      relations: { cuentaOrigen: true, cuentaDestino: true },
      order: { fecha: 'DESC' },
      take: 200,
    });

    const porTipo: Record<string, { cantidad: number; montoTotal: number }> = {};
    const porCanal: Record<string, number> = {};
    let exitosas = 0;
    let fallidas = 0;
    let montoOperado = 0;

    for (const transaccion of transacciones) {
      const tipo = transaccion.tipo;
      porTipo[tipo] = porTipo[tipo] ?? { cantidad: 0, montoTotal: 0 };
      porTipo[tipo].cantidad += 1;

      porCanal[transaccion.canal] = (porCanal[transaccion.canal] ?? 0) + 1;

      if (transaccion.estado === EstadoTransaccion.EXITOSA) {
        exitosas += 1;
        porTipo[tipo].montoTotal += transaccion.monto;
        montoOperado += transaccion.monto;
      } else if (transaccion.estado === EstadoTransaccion.FALLIDA) {
        fallidas += 1;
      }
    }

    const totalUsuarios = await this.usuarioRepository.count({
      where: { activo: true },
    });
    const totalCuentas = await this.cuentaRepository.count({
      where: { usuario: { activo: true } },
    });

    return {
      generadoEn: new Date().toISOString(),
      totales: {
        usuarios: totalUsuarios,
        cuentas: totalCuentas,
        transaccionesAnalizadas: transacciones.length,
        exitosas,
        fallidas,
        montoOperado: Math.round(montoOperado * 100) / 100,
      },
      porTipo,
      porCanal,
      ultimasOperaciones: transacciones.slice(0, 20).map((transaccion) => ({
        id: transaccion.id,
        tipo: transaccion.tipo,
        estado: transaccion.estado,
        canal: transaccion.canal,
        monto: transaccion.monto,
        origen: transaccion.cuentaOrigen
          ? enmascararNumero(transaccion.cuentaOrigen.numeroCuenta)
          : null,
        destino: transaccion.cuentaDestino
          ? enmascararNumero(transaccion.cuentaDestino.numeroCuenta)
          : null,
        fecha: transaccion.fecha,
      })),
    };
  }

  async listarAuditoria(limite: number) {
    const registros = await this.auditService.listar(limite);

    return registros.map((registro) => ({
      id: registro.id,
      accion: registro.accion,
      canal: registro.canal,
      entidadAfectada: registro.entidadAfectada ?? null,
      entidadId: registro.entidadId ?? null,
      detalle: registro.detalle ?? null,
      usuario: registro.usuario
        ? {
            id: registro.usuario.id,
            nombreCompleto: registro.usuario.nombreCompleto,
          }
        : null,
      fecha: registro.fecha,
    }));
  }
}
