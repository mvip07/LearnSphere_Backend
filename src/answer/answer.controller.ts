import { Controller, Post, Get, Body, Param, HttpStatus, HttpCode, Delete, UseGuards } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { CreateAnswerDto } from './dto/answer.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('answers')
@UseGuards(AuthGuard, RolesGuard)
export class AnswerController {
    constructor(private readonly answerService: AnswerService) { }

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    async submitAnswer(@Body() body: CreateAnswerDto) {
        return await this.answerService.createAnswers(body);
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: { ids: string[] }) {
        return await this.answerService.deleteMultiple(body.ids);
    }

    // @Get('/user/:userId')
    // @UseGuards(AuthGuard)
    // @HttpCode(HttpStatus.OK)
    // async getUserAnswers(@Param('userId') userId: string) {
    //     return await this.answerService.getUserAnswers(userId);
    // }

    // @Get('/check/:userId/:questionId')
    // @HttpCode(HttpStatus.OK)
    // async checkAnswer(@Param('userId') userId: string, @Param('questionId') questionId: string) {
    //     return await this.answerService.checkIfAnswered(userId, questionId);
    // }
}