import { Controller, Post, Get, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { DeleteMultiplePermissionsDto, FindAllQueryDto, PermissionDto, UpdatePermissionDto } from './dto/permissions.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('permission')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PermissionsController {
    constructor(private readonly permissionService: PermissionsService) { }

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: PermissionDto) {
        return await this.permissionService.create(body);
    }

    @Get('list')
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() query: FindAllQueryDto) {
        return await this.permissionService.findAll(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findById(@Param('id') id: string) {
        return await this.permissionService.findById(id)
    }

    @Put('update/:id')
    @HttpCode(HttpStatus.OK)
    async update(@Param('id') id: string, @Body() body: UpdatePermissionDto) {
        return await this.permissionService.update(id, body);
    }

    @Delete('delete/:id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        return await this.permissionService.delete(id);
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: DeleteMultiplePermissionsDto) {
        return await this.permissionService.deleteMultiple(body.ids);
    }
}