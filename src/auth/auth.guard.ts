import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const user = request?.query.user as any;

        if (!user) {
            throw new UnauthorizedException('User not authenticated');
        }

        const isAdmin = user.roles?.some((role: string | { name: string }) =>
            typeof role === 'string' ? role === 'Admin' : role.name === 'Admin',
        );

        if (!isAdmin) {
            throw new UnauthorizedException('Admin access required');
        }

        return true;
    }
}