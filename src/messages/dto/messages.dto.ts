import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
    @IsMongoId({ message: 'Invalid Sender ID format' })
    @IsNotEmpty({ message: 'Sender ID is required' })
    sender: string;

    @IsMongoId({ message: 'Invalid Receiver ID format' })
    @IsNotEmpty({ message: 'Receiver ID is required' })
    receiver: string;

    @IsString({ message: 'Text must be a string' })
    @IsNotEmpty({ message: 'Text is required' })
    @MinLength(1, { message: 'Text must be at least 1 character long' })
    @MaxLength(1000, { message: 'Text must not exceed 1000 characters' })
    text: string;
}

export class UpdateMessageDto {
    @IsString({ message: 'Text must be a string' })
    @IsOptional()
    @MinLength(1, { message: 'Text must be at least 1 character long' })
    @MaxLength(1000, { message: 'Text must not exceed 1000 characters' })
    text?: string;
}