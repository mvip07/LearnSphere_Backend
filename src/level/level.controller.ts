import { Controller, Post, Get, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { LevelService } from './level.service';
import { FindAllQueryDto, LevelDto, UpdateLevelDto } from './dto/level.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('level')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class LevelController {
    constructor(private readonly levelService: LevelService) { }

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: LevelDto) {
        return await this.levelService.create(body);
    }

    @Get('list')
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() query: FindAllQueryDto) {
        return await this.levelService.findAll(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findById(@Param('id') id: string) {
        return await this.levelService.findById(id);
    }

    @Put('update/:id')
    @HttpCode(HttpStatus.OK)
    async update(@Param('id') id: string, @Body() body: UpdateLevelDto) {
        return await this.levelService.update(id, body);
    }

    @Delete('delete/:id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        return await this.levelService.delete(id);
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: { ids: string[] }) {
        return await this.levelService.deleteMultiple(body.ids);
    }
}