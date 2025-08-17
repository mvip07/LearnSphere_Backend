import { Controller, Post, Get, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { DeleteMultipleTopicDto, TopicsDto, TopicsQueryDto, UpdateTopicsDto } from './dto/topics.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('topic')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TopicsController {
    constructor(private readonly topicService: TopicsService) { }

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: TopicsDto) {
        return await this.topicService.create(body);
    }

    @Get('list')
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() query: TopicsQueryDto) {
        return await this.topicService.findAll(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findById(@Param('id') id: string) {
        return await this.topicService.findById(id);
    }

    @Put('update/:id')
    @HttpCode(HttpStatus.OK)
    async update(@Param('id') id: string, @Body() body: UpdateTopicsDto) {
        return await this.topicService.update(id, body);
    }

    @Delete('delete/:id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        return await this.topicService.delete(id);
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: DeleteMultipleTopicDto) {
        return await this.topicService.deleteMultiple(body.ids);
    }
}