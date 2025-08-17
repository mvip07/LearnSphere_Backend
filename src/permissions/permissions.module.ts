import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission, PermissionSchema } from './dto/permissions.schema';
import { User, UserSchema } from '../users/dto/users.schema';
import { Role, RoleSchema } from '../roles/dto/roles.schema';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Module({
    imports: [MongooseModule.forFeature(
        [
            { name: Permission.name, schema: PermissionSchema },
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ])
    ],
    providers: [PermissionsService, AuthGuard, RolesGuard],
    controllers: [PermissionsController],
})
export class PermissionsModule { }