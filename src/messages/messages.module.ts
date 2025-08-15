import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageService } from './messages.service';
import { MessageController } from './messages.controller';
import { Message, MessageSchema } from './dto/messages.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { ChatGateway } from 'src/chat/chat.geteway';
import { Role, RoleSchema } from 'src/roles/dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Message.name, schema: MessageSchema },
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]),
    ],
    controllers: [MessageController],
    providers: [MessageService, ChatGateway, AuthGuard, RolesGuard],
})
export class MessagesModule { }