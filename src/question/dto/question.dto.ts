import { IsString, IsNotEmpty, IsNumber, Min, IsMongoId, IsEnum, IsArray, IsOptional, ValidateNested, IsBoolean, IsUrl, ArrayMinSize, IsEmpty, IsInt, ValidateIf, isMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum QuestionType {
    MultipleChoice = 'multiple-choice',
    Input = 'input',
    FillInTheBlank = 'fill-in-the-blank',
    Image = 'image',
    Video = 'video',
    Audio = 'audio',
}

class LocalizedText {
    @IsString({ message: 'English title must be a string' })
    @IsNotEmpty({ message: 'English title is required' })
    en: string;

    @IsString({ message: 'Russian title must be a string' })
    @IsNotEmpty({ message: 'Russian title is required' })
    ru: string;

    @IsString({ message: 'Uzbek title must be a string' })
    @IsNotEmpty({ message: 'Uzbek title is required' })
    uz: string;
}

class Option {
    @IsString({ message: 'Option text must be a string' })
    @IsNotEmpty({ message: 'Option text is required' })
    text: string;

    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean({ message: 'isCorrect must be a boolean' })
    isCorrect: boolean;
}

class Blank {
    @IsNumber({}, { message: 'Position must be a number' })
    @Min(1, { message: 'Position must be at least 1' })
    position: number;

    @IsArray({ message: 'Correct answers must be an array' })
    @ArrayMinSize(1, { message: 'At least one correct answer is required' })
    @IsString({ each: true, message: 'Each correct answer must be a string' })
    @IsNotEmpty({ each: true, message: 'Each correct answer must not be empty' })
    correctAnswers: string[];
}

export class Media {
    @IsOptional()
    @IsString({ message: 'Image URL must be a string' })
    image?: string | null;

    @IsOptional()
    @IsString({ message: 'Video URL must be a string' })
    video?: string | null;

    @IsOptional()
    @IsString({ message: 'Audio URL must be a string' })
    audio?: string | null;
}

export class CreateQuestionDto {
    @ValidateNested({ message: 'Question title is required' })
    @Type(() => LocalizedText)
    question: LocalizedText;

    @IsMongoId({ message: 'Invalid level ID format' })
    @IsNotEmpty({ message: 'Level ID is required' })
    level: string;

    @IsMongoId({ message: 'Invalid category ID format' })
    @IsNotEmpty({ message: 'Category ID is required' })
    category: string;

    @IsMongoId({ message: 'Invalid topic ID format' })
    @IsNotEmpty({ message: 'Topic ID is required' })
    topic: string;

    @IsNumber({}, { message: 'Time must be a number' })
    @Min(5, { message: 'Time must be at least 5 seconds' })
    time: number;

    @IsNumber({}, { message: 'Coins must be a number' })
    @Min(1, { message: 'Coins must be at least 1' })
    coins: number;

    @IsEnum(QuestionType, { message: 'Invalid question type' })
    type: QuestionType;

    @IsOptional()
    @IsArray({ message: 'Options must be an array' })
    @Type(() => Option)
    options?: Option[];

    @IsOptional()
    @IsArray({ message: 'Correct answers must be an array' })
    @IsString({ each: true, message: 'Each correct answer must be a string' })
    @IsNotEmpty({ each: true, message: 'Each correct answer must not be empty' })
    correctAnswers?: string[];

    @IsOptional()
    @ValidateNested({ message: 'Invalid media format' })
    @Type(() => Media)
    media?: Media;

    @IsOptional()
    @IsArray({ message: 'Blanks must be an array' })
    @ValidateNested({ each: true, message: 'Invalid blank format' })
    @Type(() => Blank)
    blanks?: Blank[];
}

export class UpdateQuestionDto {
    @IsOptional()
    @ValidateNested({ message: 'Question title is required' })
    @Type(() => LocalizedText)
    question: LocalizedText;

    @IsOptional()
    @IsMongoId({ message: 'Invalid level ID format' })
    level?: string;

    @IsOptional()
    @IsMongoId({ message: 'Invalid category ID format' })
    category?: string;

    @IsOptional()
    @IsMongoId({ message: 'Invalid Topic ID format' })
    topic?: string;

    @IsOptional()
    @IsNumber({}, { message: 'Time must be a number' })
    @Min(5, { message: 'Time must be at least 5 seconds' })
    time?: number;

    @IsOptional()
    @IsNumber({}, { message: 'Coins must be a number' })
    @Min(1, { message: 'Coins must be at least 1' })
    coins?: number;

    @IsOptional()
    @IsEnum(QuestionType, { message: 'Invalid question type' })
    type?: QuestionType;

    @IsOptional()
    @IsArray({ message: 'Options must be an array' })
    @ValidateNested({ each: true, message: 'Invalid option format' })
    @Type(() => Option)
    options?: Option[];

    @IsOptional()
    @IsArray({ message: 'Correct answers must be an array' })
    @IsString({ each: true, message: 'Each correct answer must be a string' })
    @IsNotEmpty({ each: true, message: 'Each correct answer must not be empty' })
    correctAnswers?: string[];

    @IsOptional()
    @ValidateNested({ message: 'Invalid media format' })
    @Type(() => Media)
    media?: Media;

    @IsOptional()
    @IsArray({ message: 'Blanks must be an array' })
    @ValidateNested({ each: true, message: 'Invalid blank format' })
    @Type(() => Blank)
    blanks?: Blank[];
}

export class PaginatedQuestionsQuery {
    @IsOptional()
    @IsInt({ message: 'Page must be an integer' })
    @Min(1, { message: 'Page must be at least 1' })
    @Transform(({ value }) => Number(value) || 1)
    page?: number;

    @IsOptional()
    @IsInt({ message: 'Limit must be an integer' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Transform(({ value }) => Number(value) || 5)
    limit?: number;

    @IsOptional()
    @IsString({ message: 'Search must be a string' })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : '')
    search?: string;

    @IsOptional()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]).filter(Boolean))
    @IsMongoId({ each: true, message: 'Invalid category ID format' })
    categoryIds?: [];

    @IsOptional()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]).filter(Boolean))
    @IsMongoId({ each: true, message: 'Invalid topic ID format' })
    topicIds?: [];

    @IsOptional()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]).filter(Boolean))
    @IsMongoId({ each: true, message: 'Invalid level ID format' })
    levelIds?: [];

    @IsOptional()
    @IsEnum(QuestionType, { message: 'Invalid question type' })
    type?: QuestionType;
}

export class FilteredQuestionsQuery {
    @IsOptional()
    @IsMongoId({ message: 'Invalid user ID format' })
    userId?: string;

    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
    @IsMongoId({ each: true, message: 'Invalid category ID format' })
    categoryIds?: string[];

    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
    @IsMongoId({ each: true, message: 'Invalid level ID format' })
    levelIds?: string[];

    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
    @IsMongoId({ each: true, message: 'Invalid topic ID format' })
    topicIds?: string[];
}
