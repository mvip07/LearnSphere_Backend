import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { Topic, TopicSchema } from './dto/topics.schema';
import { Category, CategorySchema } from 'src/category/dto/category.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { Role, RoleSchema } from 'src/roles/dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Topic.name, schema: TopicSchema },
            { name: Category.name, schema: CategorySchema },
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]),
    ],
    providers: [TopicsService, AuthGuard, RolesGuard],
    controllers: [TopicsController],
})
export class TopicsModule { }