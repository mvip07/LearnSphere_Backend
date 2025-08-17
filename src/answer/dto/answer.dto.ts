import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class AnswerItemDto {
    @IsMongoId({ message: 'questionId invalid format' })
    @IsNotEmpty({ message: 'questionId is required' })
    questionId: string;

    @IsArray({ message: 'userAnswers must be an array' })
    @IsNotEmpty({ message: 'userAnswers cannot be empty' })
    @IsString({ each: true, message: 'userAnswers must contain strings' })
    userAnswers: string[];

    @IsDateString({}, { message: 'timestamp must be a valid ISO date string' })
    @IsOptional()
    timestamp?: string;
}

export class CreateAnswerDto {
    @IsMongoId({ message: 'userId invalid format' })
    @IsNotEmpty({ message: 'userId is required' })
    userId: string;

    @IsArray({ message: 'answers must be an array' })
    @ValidateNested({ each: true })
    @Type(() => AnswerItemDto)
    answers: AnswerItemDto[];
}

type PopulatedCategory = { _id: Types.ObjectId; title: string; image: string };
type PopulatedLevel = { _id: Types.ObjectId; title: string };
type PopulatedTopic = { _id: Types.ObjectId; title: string };

type PopulatedQuestion = {
    _id: Types.ObjectId;
    question: Record<string, string>;
    type: string;
    coins: number;
    correctAnswers: string[];
    blanks: string[];
    options: string[];
    media: { image: string | null, video: string | null, audio: string | null };
    category?: PopulatedCategory | Types.ObjectId;
    level?: PopulatedLevel | Types.ObjectId;
    topic?: PopulatedTopic | Types.ObjectId;
};

export type PopulatedAnswer = {
    _id: Types.ObjectId;
    quizId: string;
    createdAt: Date;
    answers: {
        questionId: PopulatedQuestion | Types.ObjectId;
        userAnswers: string[];
        isCorrect: boolean;
        timestamp: Date;
    }[];
};
