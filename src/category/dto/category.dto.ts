import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength, IsOptional, IsInt, Min } from 'class-validator';

export class CategoryDto {
    @IsNotEmpty({ message: 'Title is required' })
    @IsString({ message: 'Title must be a string' })
    @MaxLength(20, { message: 'Title must not exceed 20 characters' })
    @MinLength(2, { message: 'Title must be at least 2 characters long' })
    title: string;

    @IsOptional()
    @IsNotEmpty({ message: 'No image detected — please select or upload one' })
    @IsString({ message: 'Image must be a string' })
    image?: string;
}

export class UpdateCategoryDto {
    @IsOptional()
    @IsString({ message: 'Title must be a string' })
    @MaxLength(20, { message: 'Title must not exceed 20 characters' })
    @MinLength(2, { message: 'Title must be at least 2 characters long' })
    title?: string;

    @IsOptional()
    @IsString({ message: 'Image must be a string' })
    image?: string;
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

export interface ChangeHistory {
    field: string;
    oldValue: any;
    newValue: any;
    changedAt: Date;
}