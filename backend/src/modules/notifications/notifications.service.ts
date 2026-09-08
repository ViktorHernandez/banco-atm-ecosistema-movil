import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { MailService } from '../mail/mail.service';
import { Notificacion } from './entities/notificacion.entity';
import { CategoriaNotificacion } from './enums/categoria-notificacion.enum';
import { RealtimeService } from './realtime.service';
import { PushService } from '../push/push.service';

export interface OpcionesNotificacion {
  enviarCorreo?: boolean;
  categoria?: CategoriaNotificacion;
  mensajeEn?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notificaciones');

  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly mailService: MailService,
    private readonly realtimeService: RealtimeService,
    private readonly pushService: PushService,
  ) {}

  private deducirCategoria(mensaje: string): CategoriaNotificacion {
    const texto = mensaje.toLowerCase();
    if (texto.includes('préstamo') || texto.includes('prestamo')) {
      return CategoriaNotificacion.PRESTAMO;
    }
    if (texto.includes('tarjeta')) {
      return CategoriaNotificacion.TARJETA;
    }
    if (texto.includes('contraseña') || texto.includes('sesión')) {
      return CategoriaNotificacion.SEGURIDAD;
    }
    if (
      texto.includes('correo') ||
      texto.includes('teléfono') ||
      texto.includes('nombre') ||
      texto.includes('perfil')
    ) {
      return CategoriaNotificacion.PERFIL;
    }
    if (
      texto.includes('retiro') ||
      texto.includes('depósito') ||
      texto.includes('transferencia') ||
      texto.includes('pago')
    ) {
      return CategoriaNotificacion.MOVIMIENTO;
    }
    return CategoriaNotificacion.GENERAL;
  }

  private presentar(notificacion: Notificacion) {
    return {
      id: notificacion.id,
      mensaje: notificacion.mensaje,
      categoria: notificacion.categoria ?? CategoriaNotificacion.GENERAL,
      leida: Boolean(notificacion.leida),
      leidaEn: notificacion.leidaEn ?? null,
      creadaEn: notificacion.creadaEn,
    };
  }

  async registrar(
    cuentaId: string,
    mensaje: string,
    manager?: EntityManager,
    opciones: OpcionesNotificacion = {},
  ): Promise<void> {
    const repositorio = manager
      ? manager.getRepository(Notificacion)
      : this.notificacionRepository;

    const categoria = opciones.categoria ?? this.deducirCategoria(mensaje);
    let guardada: Notificacion | null = null;

    try {
      const notificacion = repositorio.create({
        cuenta: { id: cuentaId } as never,
        mensaje,
        categoria,
        leida: false,
      });
      guardada = await repositorio.save(notificacion);
      this.logger.log(`Notificacion generada para cuenta ${cuentaId}`);
    } catch (error) {
      this.logger.error(
        `No se pudo generar la notificacion para la cuenta ${cuentaId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    if (guardada) {
      const noLeidas = await this.contarNoLeidas(cuentaId).catch(() => 0);
      this.realtimeService.emitir(cuentaId, {
        tipo: 'notificacion',
        datos: {
          ...this.presentar(guardada),
          noLeidas,
        },
      });

      void this.pushService
        .enviarACuenta(cuentaId, {
          mensaje,
          mensajeEn: opciones.mensajeEn,
          categoria,
          notificacionId: guardada.id,
          noLeidas,
        })
        .catch((error: unknown) => {
          this.logger.error(
            `No se pudo entregar la notificacion push de la cuenta ${cuentaId}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
    }

    if (opciones.enviarCorreo) {
      void this.enviarPorCorreo(cuentaId, mensaje);
    }
  }

  private async enviarPorCorreo(
    cuentaId: string,
    mensaje: string,
  ): Promise<void> {
    try {
      const cuenta = await this.cuentaRepository.findOne({
        where: { id: cuentaId },
        relations: { usuario: true },
      });

      const usuario = cuenta?.usuario;
      if (!usuario?.correo || !usuario.correoVerificado) {
        return;
      }

      await this.mailService.avisoOperacion(
        usuario.correo,
        usuario.nombreCompleto,
        mensaje,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo enviar por correo el aviso de la cuenta ${cuentaId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async listarPorCuenta(cuentaId: string, limite = 50) {
    const notificaciones = await this.notificacionRepository.find({
      where: { cuenta: { id: cuentaId } },
      order: { creadaEn: 'DESC' },
      take: limite,
    });

    return notificaciones.map((notificacion) => this.presentar(notificacion));
  }

  async contarNoLeidas(cuentaId: string): Promise<number> {
    return this.notificacionRepository.count({
      where: { cuenta: { id: cuentaId }, leida: false },
    });
  }

  async resumen(cuentaId: string) {
    return {
      noLeidas: await this.contarNoLeidas(cuentaId),
      total: await this.notificacionRepository.count({
        where: { cuenta: { id: cuentaId } },
      }),
    };
  }

  async marcarLeida(cuentaId: string, notificacionId: string) {
    const notificacion = await this.notificacionRepository.findOne({
      where: { id: notificacionId, cuenta: { id: cuentaId } },
    });

    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (!notificacion.leida) {
      notificacion.leida = true;
      notificacion.leidaEn = new Date();
      await this.notificacionRepository.save(notificacion);
    }

    const noLeidas = await this.contarNoLeidas(cuentaId);
    this.realtimeService.emitir(cuentaId, {
      tipo: 'lectura',
      datos: { id: notificacion.id, noLeidas },
    });

    return { ...this.presentar(notificacion), noLeidas };
  }

  async marcarVariasLeidas(cuentaId: string, identificadores?: string[]) {
    const condicion = identificadores?.length
      ? { cuenta: { id: cuentaId }, id: In(identificadores), leida: false }
      : { cuenta: { id: cuentaId }, leida: false };

    const pendientes = await this.notificacionRepository.find({
      where: condicion,
    });

    const momento = new Date();
    pendientes.forEach((notificacion) => {
      notificacion.leida = true;
      notificacion.leidaEn = momento;
    });

    if (pendientes.length) {
      await this.notificacionRepository.save(pendientes);
    }

    const noLeidas = await this.contarNoLeidas(cuentaId);
    this.realtimeService.emitir(cuentaId, {
      tipo: 'lectura',
      datos: { marcadas: pendientes.length, noLeidas },
    });

    return { marcadas: pendientes.length, noLeidas };
  }
}
