import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { AppService } from './app.service';
import { FollowService } from './follow/follow.service';
import { AnswerService } from './answer/answer.service';
import { AppController } from './app.controller';

import { AuthModule } from './auth/auth.module';
import { LevelModule } from './level/level.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { FollowModule } from './follow/follow.module';
import { TopicsModule } from './topics/topics.module';
import { AnswerModule } from './answer/answer.module';
import { QuestionModule } from './question/question.module';
import { CategoryModule } from './category/category.module';
import { MessagesModule } from './messages/messages.module';
import { PermissionsModule } from './permissions/permissions.module';

import { Role, RoleSchema } from './roles/dto/roles.schema';
import { User, UserSchema } from './users/dto/users.schema';
import { Level, LevelSchema } from './level/dto/level.schema';
import { Topic, TopicSchema } from './topics/dto/topics.schema';
import { Follow, FollowSchema } from './follow/dto/follow.schema';
import { Answer, AnswerSchema } from './answer/dto/answer.schema';
import { Category, CategorySchema } from './category/dto/category.schema';
import { Question, QuestionSchema } from './question/dto/question.schema';
import { Permission, PermissionSchema } from './permissions/dto/permissions.schema';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>("MONGODB_URL")
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Follow.name, schema: FollowSchema },
            { name: Answer.name, schema: AnswerSchema },
            { name: Level.name, schema: LevelSchema },
            { name: Topic.name, schema: TopicSchema },
            { name: Category.name, schema: CategorySchema },
            { name: Question.name, schema: QuestionSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]),

        RolesModule,
        UsersModule,
        LevelModule,
        FollowModule,
        AnswerModule,
        TopicsModule,
        CategoryModule,
        QuestionModule,
        MessagesModule,
        AuthModule,
        PermissionsModule,
    ],
    controllers: [AppController],
    providers: [AppService, FollowService, AnswerService, AuthGuard, RolesGuard],
})
export class AppModule { }