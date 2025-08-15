import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { User, UsersDocument } from 'src/users/dto/users.schema';
import { Role, RolesDocument } from 'src/roles/dto/roles.schema';
import { Permission, PermissionsDocument } from 'src/permissions/dto/permissions.schema';

interface CustomRequest extends Request {
    user?: any;
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @InjectModel(User.name) private readonly userModel: Model<UsersDocument>,
        @InjectModel(Role.name) private readonly roleModel: Model<RolesDocument>,
        @InjectModel(Permission.name) private readonly permissionModel: Model<PermissionsDocument>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req: CustomRequest = context.switchToHttp().getRequest();
        const userId = req.user?.userId || req.user?.sub;

        if (!userId) {
            throw new ForbiddenException('User ID is missing');
        }

        const user = await this.userModel.findById(userId).populate('roles').lean();
        if (!user || !user.roles.length) {
            throw new ForbiddenException('No roles assigned');
        }

        const userRoles = await this.roleModel.find({ _id: { $in: user.roles } }).lean();

        const permissionIds = userRoles.flatMap(role => role.permissions || []);

        const permissions = await this.permissionModel.find({ _id: { $in: permissionIds } }, { path: 1, _id: 0 }).lean();

        const allPermissions: string[] = permissions.map(p => p.path);
        const requestPath = req.route?.path || req.url;
        const frontendPath = (req.headers['frontend-path'] as string || '').replace(/^\/(uz|ru|en)(?=\/|$)/, '').replace(/\/[0-9a-fA-F]{24}(?=\/|$)/, '/:id') || '/';

        const matched = allPermissions.includes(requestPath) && allPermissions.includes(frontendPath) && allPermissions.includes("/question/multiple-create")
        if (!matched) {
            throw new ForbiddenException(`Access denied for route: ${requestPath}`);
        }

        return true;
    }
}