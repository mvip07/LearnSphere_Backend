import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength, Matches, IsOptional, IsInt, Min } from 'class-validator';

export class LevelDto {
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    @MinLength(3, { message: 'Title must be at least 3 characters long' })
    @MaxLength(15, { message: 'Title must not exceed 15 characters' })
    @Matches(/^[a-zA-Z0-9\s-]+$/, { message: 'Title can only contain letters, numbers, spaces, or hyphens' })
    title: string;
}

export class UpdateLevelDto {
    @IsOptional()
    @IsString({ message: 'Title must be a string' })
    @MinLength(3, { message: 'Title must be at least 3 characters long' })
    @MaxLength(15, { message: 'Title must not exceed 15 characters' })
    @Matches(/^[a-zA-Z0-9\s-]+$/, { message: 'Title can only contain letters, numbers, spaces, or hyphens' })
    title?: string;
}

export class FindAllQueryDto {
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
}