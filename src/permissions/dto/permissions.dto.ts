import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, Matches, IsArray, ArrayNotEmpty, IsMongoId, IsInt, Min } from 'class-validator';

export class PermissionDto {
	@IsString({ message: 'Name must be a string' })
	@IsNotEmpty({ message: 'Name is required' })
	@MinLength(2, { message: 'Name must be at least 2 characters long' })
	@MaxLength(50, { message: 'Name must not exceed 50 characters' })
	@Matches(/^[a-zA-Z0-9\s-]+$/, { message: 'Name can only contain letters, numbers, spaces, or hyphens' })
	name: string;

	@IsString({ message: 'Path must be a string' })
	@IsNotEmpty({ message: 'Path is required' })
	@MinLength(2, { message: 'Path must be at least 2 characters long' })
	@MaxLength(150, { message: 'Path must not exceed 150 characters' })
	path: string;
}

export class UpdatePermissionDto {
	@IsString({ message: 'Name must be a string' })
	@IsOptional()
	@MinLength(2, { message: 'Name must be at least 2 characters long' })
	@MaxLength(50, { message: 'Name must not exceed 50 characters' })
	@Matches(/^[a-zA-Z0-9\s-]+$/, { message: 'Name can only contain letters, numbers, spaces, or hyphens' })
	name?: string;

	@IsString({ message: 'Path must be a string' })
	@IsOptional()
	@MinLength(2, { message: 'Path must be at least 2 characters long' })
	@MaxLength(150, { message: 'Path must not exceed 150 characters' })
	path?: string;
}

export class DeleteMultiplePermissionsDto {
	@IsArray({ message: 'IDs must be an array' })
	@ArrayNotEmpty({ message: 'IDs array cannot be empty' })
	@IsMongoId({ each: true, message: 'Each ID must be a valid ObjectId' })
	ids: string[];
}

export interface ChangeHistory {
	field: string;
	oldValue: string | string[];
	newValue: string | string[];
	changedAt: Date;
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