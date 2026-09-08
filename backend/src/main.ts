import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { verificarEsquema } from './database/verificar-esquema';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import helmet from 'helmet';

function normalizarOrigenes(
  valor: string | undefined,
  logger: Logger,
): string[] | null {
  if (!valor || !valor.trim()) {
    return null;
  }

  const origenes = valor
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      if (item === '*') {
        return item;
      }
      if (/^https?:\/\//i.test(item)) {
        return item.replace(/\/+$/, '');
      }

      const corregido = item.startsWith('//')
        ? `http:${item}`
        : `http://${item}`;

      logger.warn(
        `El origen CORS "${item}" no incluia esquema. Se interpretara como "${corregido}". ` +
          'Corrija CORS_ORIGIN en el archivo .env para evitar ambiguedades.',
      );

      return corregido.replace(/\/+$/, '');
    });

  return origenes.length > 0 ? Array.from(new Set(origenes)) : null;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  try {
    await verificarEsquema(app.get(DataSource), configService, logger);
  } catch (error) {
    logger.error(
      `No fue posible verificar el esquema: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const origenes = normalizarOrigenes(
    configService.get<string>('CORS_ORIGIN'),
    logger,
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.disable('x-powered-by');

  app.enableCors({
    origin: origenes ?? true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  if (origenes) {
    logger.log(`Origenes CORS autorizados: ${origenes.join(', ')}`);
  } else {
    logger.warn('CORS_ORIGIN no esta definido: se aceptara cualquier origen');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const configuracionSwagger = new DocumentBuilder()
    .setTitle('API Bancaria - Ecosistema Banco ATM')
    .setDescription(
      'API comun consumida por el ATM, la aplicacion movil y el portal web (RNF-01 / HU-BE-09)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documento = SwaggerModule.createDocument(app, configuracionSwagger);
  SwaggerModule.setup('docs', app, documento);

  if (configService.get<string>('SERVE_ATM') === 'true') {
    const rutaAtm = resolve(process.cwd(), '..', 'atm-client');
    if (existsSync(rutaAtm)) {
      app.useStaticAssets(rutaAtm, { prefix: '/atm' });
      logger.log(`Interfaz ATM servida desde ${rutaAtm} en /atm`);
    } else {
      logger.warn(`No se encontro la carpeta del ATM en ${rutaAtm}`);
    }
  }

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`API escuchando en el puerto ${port}`);
  logger.log(`Documentacion disponible en /docs`);
}

bootstrap();
