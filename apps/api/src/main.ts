import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // API versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    credentials: true,
  });

  // OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('NCTS API')
    .setDescription(
      'National Cannabis Tracking System — Seed-to-Sale Digital Infrastructure API',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .addTag('facilities', 'Facility management')
    .addTag('plants', 'Plant registration & lifecycle')
    .addTag('batches', 'Batch management')
    .addTag('harvests', 'Harvest management')
    .addTag('lab-results', 'Lab results & Certificates of Analysis')
    .addTag('transfers', 'Transfer & chain of custody')
    .addTag('sales', 'Sales recording')
    .addTag('regulatory', 'Regulatory dashboards & compliance')
    .addTag('verification', 'Public product verification')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🌿 NCTS API running on http://localhost:${port}`);
  console.log(`📄 Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
