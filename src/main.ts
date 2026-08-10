import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as nestjsZod from 'nestjs-zod';
import { join } from 'path';
import { AppModule } from './app.module';
import { UploadsService } from './modules/uploads/uploads.service';

// Make Swagger understand Zod DTOs (function name has varied across versions).
const patchSwagger =
  (nestjsZod as any).patchNestJsSwagger || (nestjsZod as any).patchNestjsSwagger;
if (patchSwagger) patchSwagger();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3000;

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });

  // Serve uploaded files (payment proofs, QR, room photos) at /files/*
  const uploads = app.get(UploadsService);
  app.useStaticAssets(join(process.cwd(), uploads.uploadDir), {
    prefix: '/files/',
  });

  // ─── Swagger / OpenAPI ───────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SCC 2 API')
    .setDescription(
      'Backend for the SCC venue booking app — auth, rooms, add-ons, inquiries, tokenized payment links, settings and dashboard.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SCC API running on http://localhost:${port}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
