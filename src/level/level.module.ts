import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LevelService } from './level.service';
import { LevelController } from './level.controller';
import { Level, LevelSchema } from './dto/level.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { Role, RoleSchema } from 'src/roles/dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Module({
    imports: [MongooseModule.forFeature(
        [
            { name: Level.name, schema: LevelSchema },
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]
    )],
    providers: [LevelService, AuthGuard, RolesGuard],
    controllers: [LevelController],
})
export class LevelModule { }