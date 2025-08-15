import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { Question, QuestionSchema } from './dto/question.schema';
import { Level, LevelSchema } from 'src/level/dto/level.schema';
import { Category, CategorySchema } from 'src/category/dto/category.schema';
import { Topic, TopicSchema } from 'src/topics/dto/topics.schema';
import { Answer, AnswerSchema } from 'src/answer/dto/answer.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { Role, RoleSchema } from 'src/roles/dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Question.name, schema: QuestionSchema },
            { name: Level.name, schema: LevelSchema },
            { name: Category.name, schema: CategorySchema },
            { name: Topic.name, schema: TopicSchema },
            { name: Answer.name, schema: AnswerSchema },
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]),
    ],
    providers: [QuestionService, AuthGuard, RolesGuard],
    controllers: [QuestionController],
})
export class QuestionModule { }