import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { Permission } from '../../permissions/dto/permissions.schema';

export type RolesDocument = HydratedDocument<Role>;

@Schema({ timestamps: true })
export class Role {
    @Prop({
        trim: true,
        type: String,
        unique: true,
        required: [true, 'Name is required'],
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name must not exceed 50 characters'],
        match: [/^[a-zA-Z0-9\s-]+$/, 'Name can only contain letters, numbers, spaces, or hyphens'],
    })
    name: string;

    @Prop({ type: [{ type: Types.ObjectId, ref: Permission.name }], default: [] })
    permissions: Types.ObjectId[];

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

export const RoleSchema = SchemaFactory.createForClass(Role);