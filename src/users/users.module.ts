// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from '../auth/auth.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './dto/users.schema';
import { Role, RoleSchema } from '../roles/dto/roles.schema';
import { Follow, FollowSchema } from '../follow/dto/follow.schema';
import { Answer, AnswerSchema } from '../answer/dto/answer.schema';
import { Question, QuestionSchema } from '../question/dto/question.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { AdminGuard } from 'src/auth/auth.guard';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: User.name, schema: UserSchema },
			{ name: Role.name, schema: RoleSchema },
			{ name: Permission.name, schema: PermissionSchema },
			{ name: Follow.name, schema: FollowSchema },
			{ name: Answer.name, schema: AnswerSchema },
			{ name: Question.name, schema: QuestionSchema },

		]),
	],
	controllers: [UsersController],
	providers: [UserService, AuthService, AuthGuard, RolesGuard, AdminGuard],
})
export class UsersModule { }