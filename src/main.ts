import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, BadRequestException, ValidationError } from '@nestjs/common';
import { join } from 'path';
import * as admin from 'firebase-admin';

import { AppModule } from './app.module';

async function bootstrap() {
    try {
        const app = await NestFactory.create<NestExpressApplication>(AppModule);
        const configService = app.get(ConfigService);

        app.enableCors({
            origin: [process.env.FRONTEND_URL, "http://localhost:3000"],
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            credentials: true,
        });

        const firebaseConfig = {
            credential: admin.credential.cert({
                projectId: process.env.PROJECT_ID,
                privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
                clientEmail: process.env.CLIENT_EMAIL,
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        };

        admin.initializeApp(firebaseConfig);

        try {
            await admin.storage().bucket().getFiles();
            console.log('✅ Firebase storage ulandi');
        } catch (err) {
            console.error('❌ Bucket topilmadi:', err.message);
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
                                    errorResponse[`${error.property}.${child.property}`] = Object.values(child.constraints);
                                }
                            });
                        }
                    });

                    if (Object.keys(errorResponse).length > 0) {
                        return new BadRequestException({
                            statusCode: 400,
                            errors: errorResponse,
                            message: 'Invalid input data',
                        });
                    }
                    return new BadRequestException({
                        statusCode: 400,
                        message: 'Unexpected validation error occurred',
                    });
                },
            }),
        );

        const port = process.env.PORT || configService.get<number>('PORT') || 8000;
        await app.listen(port);
    } catch (err) {
        console.error('❌ Bootstrapda xato:', err);
    }
}

bootstrap();