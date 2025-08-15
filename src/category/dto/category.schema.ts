import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
    @Prop({ required: true, trim: true, unique: true })
    title: string;

    @Prop({ required: true })
    image: string;

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

export const CategorySchema = SchemaFactory.createForClass(Category);