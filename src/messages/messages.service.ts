import { Model, Types } from 'mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Message, MessageDocument } from './dto/messages.schema';
import { User, UsersDocument } from 'src/users/dto/users.schema';
import { CreateMessageDto, UpdateMessageDto } from './dto/messages.dto';

@Injectable()
export class MessageService {
    constructor(
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
        @InjectModel(User.name) private userModel: Model<UsersDocument>,
    ) { }

    private formatMessage(message: MessageDocument) {
        return {
            id: message._id.toString(),
            sender: message.sender.toString(),
            receiver: message.receiver.toString(),
            text: message.text,
            isUpdated: message.isUpdated,
            createdAt: message.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: message.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
        };
    }

    async create(createMessageDto: CreateMessageDto) {
        try {
            const { sender, receiver } = createMessageDto;
            if (sender === receiver) {
                throw new HttpException('Cannot send message to yourself', HttpStatus.BAD_REQUEST);
            }

            const senderId = new Types.ObjectId(sender);
            const receiverId = new Types.ObjectId(receiver);

            const [senderUser, receiverUser] = await Promise.all([
                this.userModel.findById(senderId).lean(),
                this.userModel.findById(receiverId).lean(),
            ]);

            if (!senderUser || !receiverUser) {
                throw new HttpException('Sender or Receiver not found', HttpStatus.NOT_FOUND);
            }

            const newMessage = await this.messageModel.create({
                ...createMessageDto,
                sender: senderId,
                receiver: receiverId,
            });

            return this.formatMessage(newMessage);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to send message',
                error.status || HttpStatus.BAD_REQUEST,
            );
        }
    }

    async findAll() {
        try {
            const messages = await this.messageModel
                .find()
                .populate('sender receiver', 'firstname lastname email')
                .select('sender receiver text isUpdated createdAt updatedAt')
                .lean();
            return messages.map((msg) => ({
                ...this.formatMessage(msg as any),
                sender: {
                    id: msg.sender._id.toString(),
                    firstname: msg.sender,
                    lastname: msg.sender,
                    email: msg.sender,
                },
                receiver: {
                    id: msg.receiver._id.toString(),
                    firstname: msg.receiver,
                    lastname: msg.receiver,
                    email: msg.receiver,
                },
            }));
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to fetch messages',
                error.status || HttpStatus.BAD_REQUEST,
            );
        }
    }

    async findOne(id: string) {
        try {
            const message = await this.messageModel
                .findById(id)
                .populate('sender receiver', 'firstname lastname email')
                .select('sender receiver text isUpdated createdAt updatedAt')
                .lean();

            if (!message) {
                throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
            }

            return {
                ...this.formatMessage(message as any),
                sender: {
                    id: message.sender._id.toString(),
                    firstname: message.sender,
                    lastname: message.sender,
                    email: message.sender,
                },
                receiver: {
                    id: message.receiver._id.toString(),
                    firstname: message.receiver,
                    lastname: message.receiver,
                    email: message.receiver,
                },
            };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to fetch message',
                error.status || HttpStatus.BAD_REQUEST,
            );
        }
    }

    async getMessages(senderId: string, receiverId: string) {
        try {
            const messages = await this.messageModel
                .find({
                    $or: [
                        { sender: new Types.ObjectId(senderId), receiver: new Types.ObjectId(receiverId) },
                        { sender: new Types.ObjectId(receiverId), receiver: new Types.ObjectId(senderId) },
                    ]
                }).sort({ createdAt: 1 }).exec()

            return messages.map((msg) => ({
                ...this.formatMessage(msg as any),
                sender: msg.sender._id.toString(),
                receiver: msg.receiver._id.toString(),
            }));

        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to fetch messages',
                error.status || HttpStatus.BAD_REQUEST,
            );
        }
    }

    async update(id: string, updateMessageDto: UpdateMessageDto) {
        try {
            const updatedMessage = await this.messageModel
                .findByIdAndUpdate(
                    id,
                    { ...updateMessageDto, isUpdated: true, updatedAt: new Date() },
                    { new: true, runValidators: true },
                )
                .select('sender receiver text isUpdated createdAt updatedAt')
                .lean();

            if (!updatedMessage) {
                throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
            }

            return this.formatMessage(updatedMessage);
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to update message',
                error.status || HttpStatus.BAD_REQUEST,
            );
        }
    }

    async delete(id: string) {
        try {
            const result = await this.messageModel.findByIdAndDelete(id).lean();

            if (!result) {
                throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
            }

            return { message: 'Message deleted successfully' };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to delete message',
                error.status || HttpStatus.BAD_REQUEST,
            );
        }
    }

    async getChatPartnerss(userId: string) {
        const messages = this.messageModel.findById(userId).populate('sender receiver')
        return messages;
    }

    async getUserChatList(userId: string) {
        const messages = await this.messageModel.find({ $or: [{ sender: new Types.ObjectId(userId) }, { receiver: new Types.ObjectId(userId) }] }).sort({ createdAt: -1 }).lean().exec();

        const chatUsersMap = new Map<string, {
            userId: string;
            firstname: string;
            lastname: string;
            image: string;
            lastMessage: string;
        }>();

        const userIds = new Set<string>();
        messages.forEach((msg) => {
            const chatUserId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
            userIds.add(chatUserId);
        });

        const users = await this.userModel
            .find({ _id: { $in: Array.from(userIds) } }, 'firstname lastname image')
            .lean()
            .exec();

        const userMap = new Map(users.map(user => [user._id.toString(), user]));

        messages.forEach((msg) => {
            const chatUserId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();

            if (!chatUsersMap.has(chatUserId)) {
                const userInfo = userMap.get(chatUserId) || { firstname: '', lastname: '', image: '' };

                chatUsersMap.set(chatUserId, {
                    userId: chatUserId,
                    image: userInfo.image,
                    lastMessage: msg.text,
                    lastname: userInfo.lastname,
                    firstname: userInfo.firstname,
                });
            }
        });

        return Array.from(chatUsersMap.values());
    }
}