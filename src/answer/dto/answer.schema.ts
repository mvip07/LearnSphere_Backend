import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { Question } from 'src/question/dto/question.schema';

export type AnswerDocument = HydratedDocument<Answer>;

@Schema({ timestamps: true })
export class Answer {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: true, minlength: 8, maxlength: 8, match: /^[A-Z0-9]{8}$/, index: true })
    quizId: string;

    @Prop({
        type: [
            {
                questionId: { type: Types.ObjectId, ref: Question.name, required: true },
                userAnswers: { type: [String], required: true },
                isCorrect: { type: Boolean, required: true },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        required: true,
    })
    answers: {
        questionId: Types.ObjectId;
        userAnswers: string[];
        isCorrect: boolean;
        timestamp: Date;
    }[];

    @Prop({ default: Date.now() })
    createdAt: Date;

    @Prop({ default: Date.now() })
    updatedAt: Date;
}

export const AnswerSchema = SchemaFactory.createForClass(Answer);