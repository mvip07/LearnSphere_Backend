import { Module } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AnswerController } from './answer.controller';
import { Answer, AnswerSchema } from './dto/answer.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { Question, QuestionSchema } from 'src/question/dto/question.schema';
import { Role, RoleSchema } from 'src/roles/dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Module({
    imports: [MongooseModule.forFeature([
        { name: Answer.name, schema: AnswerSchema },
        { name: Question.name, schema: QuestionSchema },
        { name: User.name, schema: UserSchema },
        { name: Role.name, schema: RoleSchema },
        { name: Permission.name, schema: PermissionSchema },

    ])],
    controllers: [AnswerController],
    providers: [AnswerService, AuthGuard, RolesGuard],
    exports: [AnswerService],
})
export class AnswerModule { }