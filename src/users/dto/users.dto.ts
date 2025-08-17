import { ArrayNotEmpty, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';
import { Match } from '../../decorators/match.decorator';

export class BaseUserDto {
    @IsString({ message: 'First name must be a string' })
    @IsNotEmpty({ message: 'First name is required' })
    @MinLength(2, { message: 'First name must be at least 2 characters' })
    @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
    @Matches(/^[a-zA-Z\s-]+$/, { message: 'First name can only contain letters, spaces, or hyphens' })
    @Transform(({ value }) => value.trim())
    firstname: string;

    @IsString({ message: 'Last name must be a string' })
    @IsNotEmpty({ message: 'Last name is required' })
    @MinLength(2, { message: 'Last name must be at least 2 characters' })
    @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
    @Matches(/^[a-zA-Z\s-]+$/, { message: 'Last name can only contain letters, spaces, or hyphens' })
    @Transform(({ value }) => value.trim())
    lastname: string;

    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    @MaxLength(100, { message: 'Email cannot exceed 100 characters' })
    @Transform(({ value }) => value.toLowerCase().trim())
    email: string;

    @IsString({ message: 'Username must be a string' })
    @IsNotEmpty({ message: 'Username is required' })
    @MinLength(4, { message: 'Username must be at least 4 characters' })
    @MaxLength(20, { message: 'Username cannot exceed 20 characters' })
    @Matches(/^[a-zA-Z0-9_.-]+$/, { message: 'Username can only contain letters, numbers, underscores, hyphens, or dots' })
    @Transform(({ value }) => value.trim())
    username: string;
}

export class CreateUserDto extends BaseUserDto {
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @MaxLength(20, { message: 'Password cannot exceed 20 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/, { message: 'Password must include one uppercase letter, one lowercase letter, and one special character' })
    password: string;

    @IsString({ message: 'Confirm password must be a string' })
    @IsNotEmpty({ message: 'Confirm password is required' })
    @Match('password', { message: 'Confirm password must match password' })
    confirmPassword: string;

    @IsOptional()
    @IsString({ message: 'Bio must be a string' })
    @MinLength(10, { message: 'Bio must be at least 10 characters' })
    @MaxLength(1500, { message: 'Bio cannot exceed 1500 characters' })
    @Transform(({ value }) => value?.trim())
    bio?: string;

    @IsOptional()
    @IsString({ message: 'Image must be a string' })
    @Transform(({ value }) => value?.trim())
    image?: string;

    @IsBoolean({ message: 'Block must be a boolean' })
    @IsNotEmpty({ message: 'Block status is required' })
    block: boolean;

    @IsBoolean({ message: 'Is verified must be a boolean' })
    @IsNotEmpty({ message: 'Verification status is required' })
    isVerified: boolean;

    @IsOptional()
    @IsMongoId({ each: true, message: 'Each role must be a valid MongoDB ObjectId' })
    roles?: string[];
}

export class UpdateDto extends BaseUserDto {
    @IsOptional()
    @IsString({ message: 'Bio must be a string' })
    @MinLength(10, { message: 'Bio must be at least 10 characters' })
    @MaxLength(1500, { message: 'Bio cannot exceed 1500 characters' })
    @Transform(({ value }) => value?.trim())
    bio?: string;

    @IsOptional()
    @IsString({ message: 'Image must be a string' })
    @Transform(({ value }) => value?.trim())
    image?: string;
}

export class UpdateUserForAdminDto extends BaseUserDto {
    @IsOptional()
    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @MaxLength(20, { message: 'Password cannot exceed 20 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/, { message: 'Password must include one uppercase letter, one lowercase letter, and one special character' })
    @Transform(({ value, obj }) => (obj.confirmPassword && !value ? undefined : value))
    password?: string;

    @IsOptional()
    @IsString({ message: 'Confirm password must be a string' })
    @Match('password', { message: 'Confirm password must match password' })
    @Transform(({ value, obj }) => (obj.password && !value ? undefined : value))
    confirmPassword?: string;

    @IsOptional()
    @IsString({ message: 'Bio must be a string' })
    @MinLength(10, { message: 'Bio must be at least 10 characters' })
    @MaxLength(1500, { message: 'Bio cannot exceed 1500 characters' })
    @Transform(({ value }) => value?.trim())
    bio?: string;

    @IsOptional()
    @IsString({ message: 'Image must be a string' })
    @Transform(({ value }) => value?.trim())
    image?: string;

    @IsBoolean({ message: 'Block must be a boolean' })
    @IsNotEmpty({ message: 'Block status is required' })
    block: boolean;

    @IsBoolean({ message: 'Is verified must be a boolean' })
    @IsNotEmpty({ message: 'Verification status is required' })
    isVerified: boolean;

    @IsNotEmpty({ message: 'Roles are required' })
    @IsMongoId({ each: true, message: 'Each role must be a valid MongoDB ObjectId' })
    roles: string[];
}

export class AllUsersWithStatsPropsDto {
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
    @IsString({ message: 'Search must be a string' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
    sortBy?: string;

    @IsOptional()
    @IsIn(['true', 'false', 'all'], { message: 'Block must be true, false, or all' })
    block?: string;

    @IsOptional()
    @IsIn(['true', 'false', 'all'], { message: 'Is verified must be true, false, or all' })
    isVerified?: string;

    @IsOptional()
    @IsString({ message: 'Roles must be a comma-separated list of IDs' })
    @Transform(({ value }) => typeof value === 'string' ? value.split(',').map((id) => id.trim()).filter((id) => id.match(/^[0-9a-fA-F]{24}$/)).join(',') : '')
    roles?: string;

    @IsOptional()
    @IsIn(['asc', 'desc', 'all'], { message: 'Total coins must be asc, desc, or all' })
    totalCoins?: string;

    @IsOptional()
    @IsIn(['asc', 'desc', 'all'], { message: 'Followers must be asc, desc, or all' })
    followers?: string;

    @IsOptional()
    @IsIn(['asc', 'desc', 'all'], { message: 'Following must be asc, desc, or all' })
    following?: string;
}

export class DeleteMultipleUsersDto {
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