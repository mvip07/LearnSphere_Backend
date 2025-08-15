import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type PermissionsDocument = HydratedDocument<Permission>;

@Schema({ timestamps: true })
export class Permission {
    @Prop({
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name must not exceed 50 characters'],
        match: [/^[a-zA-Z0-9\s-]+$/, 'Name can only contain letters, numbers, spaces, or hyphens'],
        index: true,
    })
    name: string;

    @Prop({
        type: String,
        required: [true, 'Path is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Path must be at least 2 characters long'],
        maxlength: [150, 'Path must not exceed 150 characters'],
    })
    path: string;

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

export const PermissionSchema = SchemaFactory.createForClass(Permission);