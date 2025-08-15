import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UsersDto {
    @IsString({ message: 'First Name must be a string' })
    @IsNotEmpty({ message: 'First Name is required' })
    @MinLength(2, { message: 'First Name must be at least 2 characters long' })
    @MaxLength(50, { message: 'First Name must not exceed 50 characters' })
    @Matches(/^[a-zA-Z\s-]+$/, { message: 'First Name can only contain letters, spaces, or hyphens' })
    firstname: string;

    @IsString({ message: 'Last Name must be a string' })
    @IsNotEmpty({ message: 'Last Name is required' })
    @MinLength(2, { message: 'Last Name must be at least 2 characters long' })
    @MaxLength(50, { message: 'Last Name must not exceed 50 characters' })
    @Matches(/^[a-zA-Z\s-]+$/, { message: 'Last Name can only contain letters, spaces, or hyphens' })
    lastname: string;

    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    @MaxLength(100, { message: 'Email must not exceed 100 characters' })
    email: string;

    @IsString({ message: 'Username must be a string' })
    @IsNotEmpty({ message: 'Username is required' })
    @MinLength(4, { message: 'Username must be at least 4 characters long' })
    @MaxLength(20, { message: 'Username must not exceed 20 characters' })
    @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Username can only contain letters, numbers, underscores, or hyphens' })
    username: string;

    @IsOptional()
    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(20, { message: 'Password must not exceed 20 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one symbol',
    })
    password?: string;

    @IsOptional()
    @IsString({ message: 'Confirm Password must be a string' })
    @IsNotEmpty({ message: 'Confirm Password is required' })
    @MinLength(8, { message: 'Confirm Password must be at least 8 characters long' })
    @MaxLength(20, { message: 'Confirm Password must not exceed 20 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/, {
        message: 'Confirm Password must contain at least one uppercase letter, one lowercase letter, and one symbol',
    })
    confirmPassword?: string;

    @IsOptional()
    @IsString({ message: 'Auth Method must be a string' })
    @IsIn(['google', 'form'], { message: 'Auth Method must be either "google" or "form"' })
    authMethod?: 'google' | 'form';
}

export class LoginDto {
    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}

export class ConfirmVerificationCodeDto {
    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;

    @IsString({ message: 'Verification Code must be a string' })
    @IsNotEmpty({ message: 'Verification Code is required' })
    @MinLength(6, { message: 'Verification Code must be 6 digits' })
    @MaxLength(6, { message: 'Verification Code must be 6 digits' })
    verificationcode: string;
}

export class ResetPasswordDto {
    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(20, { message: 'Password must not exceed 20 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one symbol',
    })
    password: string;

    @IsString({ message: 'Confirm Password must be a string' })
    @IsNotEmpty({ message: 'Confirm Password is required' })
    @MinLength(8, { message: 'Confirm Password must be at least 8 characters long' })
    @MaxLength(20, { message: 'Confirm Password must not exceed 20 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])/, {
        message: 'Confirm Password must contain at least one uppercase letter, one lowercase letter, and one symbol',
    })
    confirmPassword: string;
}

export class SendVerificationCodeDto {
    @IsString({ message: 'Email must be a string' })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Invalid email format' })
    email: string;
}

export interface EmailData {
    link: string;
    color: string;
    text: string;
    subject: string;
    instructions: string;
    intro: string;
}