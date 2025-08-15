import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type LevelDocument = HydratedDocument<Level>;

@Schema({ timestamps: true })
export class Level {
    @Prop({
        type: String,
        required: [true, 'Title is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Title must be at least 3 characters long'],
        maxlength: [15, 'Title must not exceed 15 characters'],
        match: [/^[a-zA-Z0-9\s-]+$/, 'Title can only contain letters, numbers, spaces, or hyphens'],
        index: true,
    })
    title: string;

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

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;
}

export const LevelSchema = SchemaFactory.createForClass(Level);