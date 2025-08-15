import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role, RoleSchema } from './dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

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