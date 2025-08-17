import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role, RoleSchema } from './dto/roles.schema';
import { Permission, PermissionSchema } from '../permissions/dto/permissions.schema';
import { User, UserSchema } from '../users/dto/users.schema';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]),
    ],
    controllers: [RolesController],
    providers: [RolesService, AuthGuard, RolesGuard],
})
export class RolesModule { }