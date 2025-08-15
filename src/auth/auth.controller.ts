import { Response } from 'express';
import { Body, Controller, HttpCode, HttpStatus, Param, Post, Res, UsePipes, ValidationPipe } from '@nestjs/common';

import { AuthService } from './auth.service';
import { ConfirmVerificationCodeDto, LoginDto, ResetPasswordDto, SendVerificationCodeDto, UsersDto } from './dto/auth.dto';

@Controller('auth')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('google')
    @HttpCode(HttpStatus.OK)
    async googleLogin(@Body('code') code: string, @Res() res: Response) {
        return this.authService.handleGoogle(code, res);
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() body: UsersDto) {
        return await this.authService.register(body);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginDto) {
        return await this.authService.login(body);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body('email') email: string) {
        return await this.authService.forgotPassword(email);
    }

    @Post('reset-password/:token')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() body: ResetPasswordDto, @Param('token') token: string) {
        return await this.authService.resetPassword(body, token);
    }

    @Post('send/verification/code')
    @HttpCode(HttpStatus.OK)
    async sendVerificationCode(@Body() body: SendVerificationCodeDto) {
        return await this.authService.sendVerificationCode(body);
    }

    @Post('confirm/verification/code')
    @HttpCode(HttpStatus.OK)
    async confirmVerificationCode(@Body() body: ConfirmVerificationCodeDto) {
        return await this.authService.confirmVerificationCode(body);
    }
}   