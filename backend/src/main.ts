import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = config.get<number>('port')!;
  const apiPrefix = config.get<string>('apiPrefix')!;
  const corsOrigin = config.get<string[]>('corsOrigin')!;

  app.setGlobalPrefix(apiPrefix);

  // crossOriginResourcePolicy is relaxed so the Swagger UI assets load cleanly
  // when the API and the SPA sit on different ports in development.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip unknown keys, and reject outright rather than silently ignoring
      // them — a typo'd field name should fail loudly, not vanish.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LearnLoop API')
    .setDescription(
      'Video Learning + Interactive Quiz Builder.\n\n' +
        '**Getting started:** call `POST /api/auth/login` with one of the seeded accounts, ' +
        'then click **Authorize** and paste the `accessToken`.\n\n' +
        'All successful responses are wrapped as `{ success: true, data, meta? }`; ' +
        'errors come back as `{ success: false, statusCode, message, errors?, path, timestamp }`.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  logger.log(`API      → http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger  → http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`CORS     → ${corsOrigin.join(', ')}`);
}

void bootstrap();
