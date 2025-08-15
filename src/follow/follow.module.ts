import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { Follow, FollowSchema } from './dto/follow.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { Role, RoleSchema } from 'src/roles/dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Follow.name, schema: FollowSchema },
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]),
    ],
    providers: [FollowService, AuthGuard, RolesGuard],
    controllers: [FollowController],
    exports: [FollowService],
})
export class FollowModule { }