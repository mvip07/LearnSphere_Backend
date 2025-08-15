import { Controller, Post, Get, Put, Delete, Body, Param, HttpCode, HttpStatus, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { MessageService } from './messages.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/messages.dto';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('messages')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MessageController {
    constructor(private readonly messageService: MessageService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createMessageDto: CreateMessageDto) {
        return await this.messageService.create(createMessageDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    async findAll() {
        return await this.messageService.findAll();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findOne(@Param('id') id: string) {
        return await this.messageService.findOne(id);
    }

    @Get(':sender/:receiver')
    @HttpCode(HttpStatus.OK)
    async getMessages(@Param('sender') sender: string, @Param('receiver') receiver: string) {
        return await this.messageService.getMessages(sender, receiver);
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    async update(@Param('id') id: string, @Body() updateMessageDto: UpdateMessageDto) {
        return await this.messageService.update(id, updateMessageDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        return await this.messageService.delete(id);
    }

    @Get('chats/users/:userId')
    @HttpCode(HttpStatus.OK)
    async findUserById(@Param('userId') userId: string) {
        return await this.messageService.getUserChatList(userId);
    }
}