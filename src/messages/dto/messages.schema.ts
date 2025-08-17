import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/dto/users.schema';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    sender: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
    receiver: Types.ObjectId;

    @Prop({ required: true, trim: true, maxlength: 1000 })
    text: string;

    @Prop({ default: false })
    isUpdated: boolean;

    @Prop({ default: Date.now() })
    createdAt: Date;

    @Prop({ default: Date.now() })
    updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);