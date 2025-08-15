import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { Level } from 'src/level/dto/level.schema';
import { Topic } from 'src/topics/dto/topics.schema';
import { Category } from 'src/category/dto/category.schema';
import { QuestionType } from './question.dto';

export type QuestionDocument = HydratedDocument<Question>;

@Schema({ timestamps: true })
export class Question {
    @Prop({
        type: {
            en: { type: String, required: true, trim: true },
            ru: { type: String, required: true, trim: true },
            uz: { type: String, required: true, trim: true },
        },
        required: true,
    })
    question: {
        en: string;
        ru: string;
        uz: string;
    };

    @Prop({ type: Types.ObjectId, ref: Level.name, required: true, index: true })
    level: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Category.name, required: true, index: true })
    category: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Topic.name, required: true, index: true })
    topic: Types.ObjectId;

    @Prop({ required: true, min: 5 })
    time: number;

    @Prop({ required: true, min: 1 })
    coins: number;

    @Prop({
        type: String,
        required: true,
        enum: Object.values(QuestionType),
        index: true,
    })
    type: QuestionType;

    @Prop({
        type: [{ text: { type: String, required: true }, isCorrect: { type: Boolean, required: true } }],
        validate: {
            validator: function (options: { text: string; isCorrect: boolean }[]) {
                return this.type === QuestionType.MultipleChoice ? options.length >= 2 : true;
            },
            message: 'Multiple-choice questions require at least 2 options',
        },
    })
    options?: { _id?: Types.ObjectId; text: string; isCorrect: boolean }[];

    @Prop({
        type: [String],
        required: function () {
            return [QuestionType.Input, QuestionType.Image, QuestionType.Video, QuestionType.Audio].includes(this.type);
        },
    })
    correctAnswers?: string[];

    @Prop({
        type: {
            image: { type: String },
            video: { type: String },
            audio: { type: String },
        },
        required: function () {
            return [QuestionType.Image, QuestionType.Video, QuestionType.Audio].includes(this.type);
        },
    })
    media?: {
        image?: string;
        video?: string;
        audio?: string;
    };

    @Prop({
        type: [{ position: { type: Number, required: true }, correctAnswers: { type: [String], required: true } }],
        validate: {
            validator: function (blanks: { position: number; correctAnswers: string[] }[]) {
                return this.type === QuestionType.FillInTheBlank ? blanks.length > 0 : true;
            },
            message: 'Fill-in-the-blank questions require at least 1 blank',
        },
    })
    blanks?: { _id?: Types.ObjectId; position: number; correctAnswers: string[] }[];

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

export const QuestionSchema = SchemaFactory.createForClass(Question);