import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { CustomRequest } from './request.interface';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const req: CustomRequest = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('Authorization header missing');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('Token missing in Authorization header');
        }

        try {
            const decoded = jwt.verify(token, this.configService.get<string>('JWT_SECRET'));
            req.user = decoded;
            return true;
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token has expired');
            } else if (err.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Invalid token');
            } else {
                throw new UnauthorizedException('Not authenticated');
            }
        }
    }
}
