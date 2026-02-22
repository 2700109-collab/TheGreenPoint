import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Fastify plugins
  await app.register(fastifyCookie);

  // Section 9.2 — Security Headers (Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://*.amazonaws.com'],
        connectSrc: [
          "'self'",
          'https://api.ncts.gov.za',
          ...(process.env.NODE_ENV === 'development'
            ? ['http://localhost:*']
            : []),
        ],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true, // RC-910: Enable HSTS preload for .gov.za domain
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

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

  // Section 9.2 — CORS with strict whitelist
  const resolvedOrigins = resolveCorsOrigins();
  const logger = new Logger('Bootstrap');
  logger.log(`CORS origins: ${JSON.stringify(resolvedOrigins)}`);
  app.enableCors({
    origin: resolvedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'], // RC-911: HEAD + PUT added
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Tenant-Id', 'X-Correlation-Id'],
  });

  // RC-908: Only expose Swagger UI in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NCTS API')
      .setDescription(
        'National Cannabis Tracking System — Seed-to-Sale Digital Infrastructure API',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & authorization')
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
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`🌿 NCTS API running on http://localhost:${port}`);
  logger.log(`📄 Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();

/**
 * RC-909: Resolve and validate CORS origins.
 * Trims whitespace, rejects '*' and malformed URLs.
 */
function resolveCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    const origins = envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    // Reject wildcard — must use explicit origins
    if (origins.includes('*')) {
      throw new Error('CORS_ORIGINS must not contain "*". Use explicit origins.');
    }

    // Validate each origin is a valid URL
    for (const origin of origins) {
      try {
        new URL(origin);
      } catch {
        throw new Error(`Invalid CORS origin: "${origin}". Must be a valid URL.`);
      }
    }

    return origins;
  }

  // Defaults
  return process.env.NODE_ENV === 'production'
    ? [
        'https://ncts.gov.za',
        'https://admin.ncts.gov.za',
        'https://verify.ncts.gov.za',
      ]
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
      ];
}
