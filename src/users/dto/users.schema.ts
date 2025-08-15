import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { Role } from 'src/roles/dto/roles.schema';

export type UsersDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop({
        trim: true,
        type: String,
        required: [true, 'First Name is required'],
        maxlength: [50, 'First Name must not exceed 50 characters'],
        minlength: [2, 'First Name must be at least 2 characters long'],
        match: [/^[a-zA-Z\s-]+$/, 'First Name can only contain letters, spaces, or hyphens'],
    })
    firstname: string;

    @Prop({
        trim: true,
        default: '',
        type: String,
        maxlength: [1500, 'Bio must not exceed 1500 characters'],
    })
    bio: string;

    @Prop({
        type: String,
        default: process.env.DEFAULT_USER_IMAGE,
    })
    image: string;

    @Prop({
        trim: true,
        type: String,
        required: [true, 'Last Name is required'],
        maxlength: [50, 'Last Name must not exceed 50 characters'],
        minlength: [2, 'Last Name must be at least 2 characters long'],
        match: [/^[a-zA-Z\s-]+$/, 'Last Name can only contain letters, spaces, or hyphens'],
    })
    lastname: string;

    @Prop({
        trim: true,
        index: true,
        type: String,
        unique: true,
        lowercase: true,
        required: [true, 'Email is required'],
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    })
    email: string;

    @Prop({
        trim: true,
        type: String,
        unique: true,
        required: [true, 'Username is required'],
        maxlength: [20, 'Username must not exceed 20 characters'],
        minlength: [4, 'Username must be at least 4 characters long'],
        match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, or hyphens'],
        index: true,
    })
    username: string;

    @Prop({
        type: String,
        required: [
            function () {
                return this.authMethod === 'form';
            },
            'Password is required for form authentication',
        ],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false,
    })
    password: string | null;

    @Prop({
        type: Boolean,
        default: false,
    })
    block: boolean;

    @Prop({
        default: [],
        type: [{ type: Types.ObjectId, ref: Role.name }],
    })
    roles: Types.ObjectId[];

    @Prop({
        type: Boolean,
        default: false,
    })
    isVerified: boolean;

    @Prop({
        type: String,
        default: null,
    })
    verificationCode: string | null;

    @Prop({
        type: Date,
        default: null,
    })
    verificationExpiresAt: Date | null;

    @Prop({
        type: String,
        default: null,
    })
    resetToken: string | null;

    @Prop({
        type: Date,
        default: null,
    })
    resetTokenExpiresAt: Date | null;

    @Prop({
        type: String,
        default: 'form',
        enum: ['google', 'form', 'admin'],
        required: [true, 'Authentication method is required'],
    })
    authMethod: 'google' | 'form' | 'admin';

    @Prop({
        type: Date,
        default: null,
    })
    usernameChangedAt: Date | null;

    @Prop({
        type: Date,
        default: null,
    })
    emailChangedAt: Date | null;

    @Prop({ default: Date.now() })
    createdAt: Date;

    @Prop({ default: Date.now() })
    updatedAt: Date;

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
}

export const UserSchema = SchemaFactory.createForClass(User);