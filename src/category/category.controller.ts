import { Get, Put, Body, Post, Query, Param, Delete, UsePipes, HttpCode, Controller, HttpStatus, UploadedFile, ValidationPipe, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { uploadToFirebase } from '../utils/uploadToFirebase';
import { CategoryService } from './category.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CategoryDto, FindAllQueryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('category')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) { }

    private readonly uploadOptions = {
        maxSizeInMB: 5,
        allowedTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
    };

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('image'))
    async create(@Body() body: CategoryDto, @UploadedFile() file?: Express.Multer.File) {
        const imageUrl = file ? await uploadToFirebase(file, `categories/${Date.now()}-${file.originalname}`, this.uploadOptions) : "";
        return this.categoryService.create({ ...body, image: imageUrl });
    }

    @Get('list')
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() query: FindAllQueryDto) {
        return await this.categoryService.findAll(query);
    }

    @Put('update/:id')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('image'))
    async update(@Param('id') id: string, @Body() body: UpdateCategoryDto, @UploadedFile() file?: Express.Multer.File) {
        const imageUrl = file ? await uploadToFirebase(file, `categories/${Date.now()}-${file.originalname}`, this.uploadOptions) : "";
        return this.categoryService.update(id, { ...body, image: imageUrl });
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: { ids: string[] }) {
        return await this.categoryService.deleteMultiple(body.ids);
    }


    // @Get(':id')
    // @HttpCode(HttpStatus.OK)
    // async findById(@Param('id') id: string) {
    //     return await this.categoryService.findById(id);
    // }

    // @Delete('delete/:id')
    // @HttpCode(HttpStatus.OK)
    // async delete(@Param('id') id: string) {
    //     return await this.categoryService.delete(id);
    // }
}