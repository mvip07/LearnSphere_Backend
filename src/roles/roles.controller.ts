import { Controller, Post, Get, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesDto, UpdateRolesDto, UpdatePermissionsDto, DeleteMultipleRolesDto, FindAllQueryDto } from './dto/roles.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('role')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RolesController {
    constructor(private readonly roleService: RolesService) { }

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: RolesDto) {
        return await this.roleService.create(body);
    }

    @Get('list')
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() query: FindAllQueryDto) {
        return await this.roleService.findAll(query);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async findById(@Param('id') id: string) {
        return await this.roleService.findById(id)
    }

    @Put('update/:id')
    @HttpCode(HttpStatus.OK)
    async update(@Param('id') id: string, @Body() body: UpdateRolesDto) {
        return await this.roleService.update(id, body);
    }

    @Put('update-permissions/:id')
    @HttpCode(HttpStatus.OK)
    async updatePermission(@Param('id') id: string, @Body() body: UpdatePermissionsDto) {
        return await this.roleService.updatePermissionInRole(id, body.permissions);
    }

    @Delete('delete/:id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        return await this.roleService.delete(id);
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: DeleteMultipleRolesDto) {
        return await this.roleService.deleteMultiple(body.ids);
    }
}