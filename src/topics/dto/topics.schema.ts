import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { Category } from '../../category/dto/category.schema';

export type TopicsDocument = HydratedDocument<Topic>;

@Schema({ timestamps: true })
export class Topic {
    @Prop({
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long'],
        maxlength: [50, 'Title must not exceed 50 characters'],
        match: [/^[a-zA-Z0-9\s-]+$/, 'Title can only contain letters, numbers, spaces, or hyphens'],
        index: true,
    })
    title: string;

    @Prop({ type: Types.ObjectId, ref: Category.name, required: true, index: true })
    categoryId: Types.ObjectId;

    @Prop({
        type: [{
            field: String,
            oldValue: MongooseSchema.Types.Mixed,
            newValue: MongooseSchema.Types.Mixed,
            changedAt: Date
        }],
        default: []
    })
    changeHistory: Array<{
        field: string;
        oldValue: any;
        newValue: any;
        changedAt: Date;
    }>;

    @Prop({ default: Date.now() })
    createdAt: Date;

    @Prop({ default: Date.now() })
    updatedAt: Date;
}

export const TopicSchema = SchemaFactory.createForClass(Topic);