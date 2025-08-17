import { Get, Put, Post, Body, Param, Query, Delete, HttpCode, UsePipes, HttpStatus, Controller, UploadedFile, UseInterceptors, ValidationPipe, HttpException, Res, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './users.service';
import { AllUsersWithStatsPropsDto, CreateUserDto, DeleteMultipleUsersDto, UpdateDto, UpdateUserForAdminDto } from './dto/users.dto';
import { uploadToFirebase } from '../utils/uploadToFirebase';
import { AuthService } from '../auth/auth.service';
import { Response } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class UsersController {
    private readonly uploadOptions = {
        maxSizeInMB: 5,
        allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
    };

    constructor(private readonly usersService: UserService, private readonly authService: AuthService) { }

    @Get('id/:id')
    @HttpCode(HttpStatus.OK)
    async findUserById(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Get('username')
    @HttpCode(HttpStatus.OK)
    async findUserByUsername(@Query('username') username: string) {
        if (!username) {
            throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
        }
        return this.usersService.findByUsername(username);
    }

    @Put('update/:id')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('image'))
    async update(@Param('id') id: string, @Body() body: UpdateDto, @Res() res: Response, @UploadedFile() file?: Express.Multer.File) {
        const imageUrl = file ? await uploadToFirebase(file, `users/${Date.now()}-${file.originalname}`, this.uploadOptions) : process.env.DEFAULT_USER_IMAGE;
        return this.usersService.update(id, { ...body, image: imageUrl }, res)
    }

    @Put('delete-image/:id')
    @HttpCode(HttpStatus.OK)
    async deleteImage(@Param('id') id: string) {
        return this.usersService.deleteImage(id);
    }

    @Delete('delete/:id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        return this.usersService.delete(id);
    }

    @Get('profiles')
    @HttpCode(HttpStatus.OK)
    async rankings(@Query() query: AllUsersWithStatsPropsDto) {
        return this.usersService.rankings(query);
    }

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('image'))
    async createForAdmin(@Body() body: CreateUserDto, @UploadedFile() file?: Express.Multer.File) {
        const imageUrl = file ? await uploadToFirebase(file, `users/${Date.now()}-${file.originalname}`, this.uploadOptions) : process.env.DEFAULT_USER_IMAGE;
        return this.usersService.createForAdmin({ ...body, image: imageUrl });
    }

    @Put('update/for/admin/:id')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('image'))
    async updateForAdmin(@Param('id') id: string, @Body() body: UpdateUserForAdminDto, @UploadedFile() file?: Express.Multer.File) {
        const imageUrl = file ? await uploadToFirebase(file, `users/${Date.now()}-${file.originalname}`, this.uploadOptions) : process.env.DEFAULT_USER_IMAGE;
        return this.usersService.updateForAdmin(id, { ...body, image: imageUrl });
    }

    @Get('list/for/admin')
    @HttpCode(HttpStatus.OK)
    async findAllForAdmin(@Query() query: AllUsersWithStatsPropsDto) {
        return this.usersService.findAllForAdmin(query);
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: DeleteMultipleUsersDto) {
        return await this.usersService.deleteMultiple(body.ids);
    }
}