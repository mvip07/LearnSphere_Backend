import { Transform } from 'class-transformer';
import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ArrayNotEmpty, Matches, IsInt, Min } from 'class-validator';

export class RolesDto {
    @IsNotEmpty({ message: 'Name is required' })
    @IsString({ message: 'Name must be a string' })
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    @MaxLength(50, { message: 'Name must not exceed 50 characters' })
    @Matches(/^[a-zA-Z0-9\s-]+$/, { message: 'Name can only contain letters, numbers, spaces, or hyphens' })
    name: string;

    @IsArray({ message: 'Permissions must be an array' })
    @ArrayNotEmpty({ message: 'Permissions cannot be empty' })
    @IsMongoId({ each: true, message: 'Each permission must be a valid ObjectId' })
    permissions: string[];
}

export class UpdateRolesDto {
    @IsOptional()
    @IsString({ message: 'Name must be a string' })
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    @MaxLength(50, { message: 'Name must not exceed 50 characters' })
    @Matches(/^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z0-9\s-]+$/, { message: 'Name must contain at least 2 letters and can only include letters, numbers, spaces, or hyphens' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    name?: string;

    @IsOptional()
    @IsArray({ message: 'Permissions must be an array' })
    @ArrayNotEmpty({ message: 'Permissions cannot be empty' })
    @IsMongoId({ each: true, message: 'Each permission must be a valid ObjectId' })
    permissions?: string[];
}

export class UpdatePermissionsDto {
    @IsArray({ message: 'Permissions must be an array' })
    @ArrayNotEmpty({ message: 'Permissions cannot be empty' })
    @IsMongoId({ each: true, message: 'Each permission must be a valid ObjectId' })
    permissions: string[];
}

export class DeleteMultipleRolesDto {
    @IsArray({ message: 'IDs must be an array' })
    @ArrayNotEmpty({ message: 'IDs array cannot be empty' })
    @IsMongoId({ each: true, message: 'Each ID must be a valid ObjectId' })
    ids: string[];
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
    oldValue: string | string[];
    newValue: string | string[];
    changedAt: Date;
}