import { Controller, Get, Param, HttpCode, UseGuards, UsePipes, ValidationPipe, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get('cabinet/:id')
    @HttpCode(HttpStatus.OK)
    async cabinet(@Param('id') id: string) {
        return await this.appService.cabinet(id);
    }
}