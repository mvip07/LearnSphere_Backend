import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageService } from '../messages/messages.service';

@WebSocketGateway({
    cors: {
        origin: ["http://localhost:3000", process.env.FRONTEND_URL], credentials: true,
    },
})
export class ChatGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly messagesService: MessageService) { }

    private onlineUsers = new Map<string, string>();

    @SubscribeMessage('getChatList')
    async handleGetChatList(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        const chatList = await this.messagesService.getUserChatList(userId);
        client.emit('chatList', chatList);
    }

    @SubscribeMessage('message')
    async handleMessage(@MessageBody() data: { sender: string; receiver: string; text: string }, @ConnectedSocket() client: Socket) {
        const createdMessage = await this.messagesService.create(data);
        this.server.to(data.sender).emit('message', createdMessage);
        this.server.to(data.receiver).emit('message', createdMessage);

        const senderChatList = await this.messagesService.getUserChatList(data.sender);
        const receiverChatList = await this.messagesService.getUserChatList(data.receiver);

        this.server.to(data.sender).emit('chatList', senderChatList);
        this.server.to(data.receiver).emit('chatList', receiverChatList);
    }

    @SubscribeMessage('typing')
    handleTyping(@MessageBody() data: { sender: string; receiver: string; isTyping: boolean }, @ConnectedSocket() client: Socket) {
        this.server.to(data.receiver).emit('typing', {
            sender: data.sender,
            isTyping: data.isTyping,
        });
    }

    handleDisconnect(client: Socket) {
        for (const [userId, socketId] of this.onlineUsers.entries()) {
            if (socketId === client.id) {
                this.onlineUsers.delete(userId);
                break;
            }
        }

        this.server.emit("usersOnline", Array.from(this.onlineUsers.keys()));
    }

    @SubscribeMessage("status")
    handleStatus(@MessageBody() data: { user: string; status: "online" | "offline" }, @ConnectedSocket() client: Socket) {
        if (data.status === "online") {
            this.onlineUsers.set(data.user, client.id);
        } else {
            this.onlineUsers.delete(data.user);
        }

        this.server.emit("usersOnline", Array.from(this.onlineUsers.keys()));
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
        client.join(userId);
    }
}