import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface ResultadoEsquema {
  pendientes: number;
  aplicadas: string[];
  ejecutadas: boolean;
}

export async function verificarEsquema(
  dataSource: DataSource,
  configService: ConfigService,
  logger: Logger,
): Promise<ResultadoEsquema> {
  if (!dataSource.isInitialized) {
    return { pendientes: 0, aplicadas: [], ejecutadas: false };
  }

  let hayPendientes = false;
  try {
    hayPendientes = await dataSource.showMigrations();
  } catch (error) {
    logger.error(
      `No fue posible comprobar el estado de las migraciones: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { pendientes: 0, aplicadas: [], ejecutadas: false };
  }

  if (!hayPendientes) {
    logger.log('Esquema de base de datos al dia.');
    return { pendientes: 0, aplicadas: [], ejecutadas: false };
  }

  const automatico =
    (configService.get<string>('DB_AUTO_MIGRATE') ?? '').trim().toLowerCase() ===
    'true';

  if (!automatico) {
    logger.error('==================================================================');
    logger.error('HAY MIGRACIONES SIN APLICAR EN LA BASE DE DATOS.');
    logger.error('El codigo espera columnas y tablas que todavia no existen, asi');
    logger.error('que algunos endpoints responderan con error 500.');
    logger.error('Ejecute, desde la carpeta backend:');
    logger.error('    npm run migration:run');
    logger.error('==================================================================');
    return { pendientes: 1, aplicadas: [], ejecutadas: false };
  }

  logger.warn('DB_AUTO_MIGRATE activo: aplicando migraciones pendientes.');

  try {
    const aplicadas = await dataSource.runMigrations({ transaction: 'each' });
    const nombres = aplicadas.map((migracion) => migracion.name);

    if (nombres.length) {
      logger.log(`Migraciones aplicadas: ${nombres.join(', ')}`);
    } else {
      logger.log('No habia migraciones pendientes por aplicar.');
    }

    return {
      pendientes: 0,
      aplicadas: nombres,
      ejecutadas: true,
    };
  } catch (error) {
    logger.error(
      `Fallo al aplicar las migraciones: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return { pendientes: 1, aplicadas: [], ejecutadas: false };
  }
}
