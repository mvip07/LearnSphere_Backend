import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/dto/users.schema';

export type FollowDocument = HydratedDocument<Follow>;

@Schema({ timestamps: true })
export class Follow {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    follower: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    following: Types.ObjectId;

    @Prop({ default: Date.now() })
    createdAt: Date;

    @Prop({ default: Date.now() })
    updatedAt: Date;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);