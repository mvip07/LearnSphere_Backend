import { Multer } from 'multer';
import { Express } from 'express';
import * as admin from 'firebase-admin';
import { HttpException, HttpStatus } from '@nestjs/common';

interface ValidateFileOptions {
    allowedTypes: string[];
    maxSizeInMB: number;
}

const validateFile = (file: Express.Multer.File, options: ValidateFileOptions) => {
    const { allowedTypes, maxSizeInMB } = options;

    if (!allowedTypes.includes(file.mimetype)) {
        throw new HttpException(`Unallowed file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`, HttpStatus.BAD_REQUEST);
    }

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
        throw new HttpException(`The file size is too large: ${fileSizeInMB.toFixed(2)}MB. Maximum allowed: ${maxSizeInMB}MB`, HttpStatus.BAD_REQUEST);
    }
};

export const uploadToFirebase = async (file: Express.Multer.File, destFileName: string, options: ValidateFileOptions): Promise<string> => {
    try {
        validateFile(file, options);
        const bucket = admin.storage().bucket();
        const fullFileName = `${process.env.FIREBASE_PROJECT_NAME}/${destFileName}`;
        const fileUpload = bucket.file(fullFileName);

        const metadata = {
            contentType: file.mimetype,
        };

        await fileUpload.save(file.buffer, {
            metadata,
            resumable: false,
        });

        const [signedUrl] = await fileUpload.getSignedUrl({
            action: 'read',
            expires: '2100-01-01T00:00:00Z',
        });

        return signedUrl;
    } catch (error) {
        throw new HttpException(`Error uploading to Firebase: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
};