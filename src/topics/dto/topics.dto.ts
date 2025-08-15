import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, IsMongoId, Matches, IsArray, ArrayNotEmpty, IsInt, Min } from 'class-validator';

export class TopicsDto {
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    @MinLength(3, { message: 'Title must be at least 3 characters long' })
    @MaxLength(50, { message: 'Title must not exceed 50 characters' })
    @Matches(/^[a-zA-Z0-9\s-]+$/, { message: 'Title can only contain letters, numbers, spaces, or hyphens' })
    title: string;

    @IsNotEmpty({ message: 'Category ID is required' })
    @IsMongoId({ message: 'Invalid Category ID format' })
    categoryId: string;
}

export class UpdateTopicsDto {
    @IsOptional()
    @IsString({ message: 'Title must be a string' })
    @MinLength(3, { message: 'Title must be at least 3 characters long' })
    @MaxLength(50, { message: 'Title must not exceed 50 characters' })
    @Matches(/^[a-zA-Z0-9\s-]+$/, { message: 'Title can only contain letters, numbers, spaces, or hyphens' })
    title?: string;

    @IsOptional()
    @IsMongoId({ message: 'Invalid Category ID format' })
    categoryId?: string;
}

export class TopicsQueryDto {
    @IsOptional()
    @IsInt({ message: 'Page must be an integer' })
    @Min(1, { message: 'Page must be at least 1' })
    @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
    page?: number;

    @IsOptional()
    @IsInt({ message: 'Limit must be an integer' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Transform(({ value }) => (value ? parseInt(value, 10) : 5))
    limit?: number;

    @IsOptional()
    @IsString({ message: 'Search must be a string' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
    search?: string;

    @IsOptional()
    @IsMongoId({ message: 'Invalid Category ID format' })
    categoryId?: string;
}

export class DeleteMultipleTopicDto {
    @IsArray({ message: 'IDs must be an array' })
    @ArrayNotEmpty({ message: 'IDs array cannot be empty' })
    @IsMongoId({ each: true, message: 'Each ID must be a valid ObjectId' })
    ids: string[];
}

export interface ChangeHistory {
    field: string;
    oldValue: any;
    newValue: any;
    changedAt: Date;
}