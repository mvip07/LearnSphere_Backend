import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  ValidationPipe,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';
import { join } from 'path';
import * as admin from 'firebase-admin';
import serverless from 'serverless-http';

import { AppModule } from './app.module';

let cachedServer;

async function bootstrapServer() {
  if (cachedServer) return cachedServer;

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Firebase init (faqat 1 marta)
  if (!admin.apps.length) {
    const firebaseConfig = {
      credential: admin.credential.cert({
        projectId: process.env.PROJECT_ID,
        privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.CLIENT_EMAIL,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    };

    admin.initializeApp(firebaseConfig);
  }

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        const errorResponse: Record<string, string[]> = {};

        errors.forEach((error) => {
          if (error.constraints) {
            errorResponse[error.property] = Object.values(error.constraints);
          }
          if (error.children?.length) {
            error.children.forEach((child) => {
              if (child.constraints) {
                errorResponse[`${error.property}.${child.property}`] =
                  Object.values(child.constraints);
              }
            });
          }
        });

        return new BadRequestException({
          statusCode: 400,
          errors: errorResponse,
          message: 'Invalid input data',
        });
      },
    }),
  );

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  cachedServer = serverless(expressApp);

  return cachedServer;
}

export default async function handler(req, res) {
  const server = await bootstrapServer();
  return server(req, res);
}
