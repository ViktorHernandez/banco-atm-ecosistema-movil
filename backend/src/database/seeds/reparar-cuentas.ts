import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { OnboardingService } from '../../modules/onboarding/onboarding.service';
import { MailService } from '../../modules/mail/mail.service';
import { AuditService } from '../../modules/audit/audit.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { Usuario } from '../../modules/users/entities/usuario.entity';
import { RolUsuario } from '../../modules/users/enums/rol-usuario.enum';
import { Canal } from '../../common/enums/canal.enum';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function reparar() {
  const logger = new Logger('ReparacionCuentas');
  const simulacion = process.argv.includes('--simular');
  const enviarCorreo = process.argv.includes('--con-correo');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const usuarioRepository = app.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );
    const onboardingService = app.get(OnboardingService);
    const mailService = app.get(MailService);
    const auditService = app.get(AuditService);
    const notificationsService = app.get(NotificationsService);

    const candidatos = await usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoin('cuentas', 'cuenta', 'cuenta.usuario_id = usuario.id')
      .where('usuario.rol = :rol', { rol: RolUsuario.CLIENTE })
      .andWhere('usuario.correoVerificado = true')
      .andWhere('usuario.activo = true')
      .andWhere('cuenta.id IS NULL')
      .getMany();

    if (!candidatos.length) {
      logger.log('No hay clientes verificados sin cuenta bancaria.');
      return;
    }

    logger.log(
      `Clientes verificados sin cuenta bancaria: ${candidatos.length}`,
    );

    if (simulacion) {
      candidatos.forEach((usuario) => {
        logger.log(`  [simulacion] ${usuario.correo}`);
      });
      logger.log('Ejecucion en modo simulacion: no se creo ninguna cuenta.');
      return;
    }

    let creadas = 0;
    let omitidas = 0;
    let fallidas = 0;

    for (const usuario of candidatos) {
      try {
        const apertura = await onboardingService.abrirCuentaSiNoExiste(
          usuario.id,
        );

        if (!apertura.creada) {
          omitidas += 1;
          logger.log(
            `  ${usuario.correo}: ya tenia la cuenta ${apertura.cuenta.numeroCuenta}`,
          );
          continue;
        }

        creadas += 1;
        logger.log(
          `  ${usuario.correo}: cuenta ${apertura.cuenta.numeroCuenta} creada`,
        );

        await auditService.registrar({
          usuarioId: usuario.id,
          accion: 'CUENTA_ABIERTA_POR_REPARACION',
          entidadAfectada: 'Cuenta',
          entidadId: apertura.cuenta.id,
          canal: Canal.WEB,
          detalle: `Cuenta ${apertura.cuenta.numeroCuenta} creada por reparacion de altas anteriores`,
        });

        await notificationsService.registrar(
          apertura.cuenta.id,
          `Su cuenta ${apertura.cuenta.numeroCuenta} quedó abierta y su tarjeta de débito fue emitida.`,
        );

        if (enviarCorreo) {
          await mailService.cuentaAbierta(
            usuario.correo,
            usuario.nombreCompleto,
            apertura.cuenta.numeroCuenta,
            apertura.numeroTarjeta as string,
            apertura.pinInicial as string,
          );
        }
      } catch (error) {
        fallidas += 1;
        logger.error(
          `  ${usuario.correo}: no fue posible abrir la cuenta`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    logger.log(
      `Resultado: ${creadas} creadas, ${omitidas} ya existentes, ${fallidas} con error.`,
    );

    if (!enviarCorreo && creadas > 0) {
      logger.warn(
        'No se enviaron correos. Use --con-correo si desea avisar a los titulares.',
      );
    }
  } finally {
    await app.close();
  }
}

reparar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
