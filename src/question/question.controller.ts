import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpException, HttpStatus, UsePipes, ValidationPipe, UseInterceptors, UploadedFile, BadRequestException, UseGuards, UploadedFiles } from '@nestjs/common';
import { isURL } from 'class-validator';
import { QuestionService } from './question.service';
import { PaginatedQuestionsQuery, CreateQuestionDto, FilteredQuestionsQuery, UpdateQuestionDto, QuestionType } from './dto/question.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { uploadToFirebase } from '../utils/uploadToFirebase';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('question')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class QuestionController {
    constructor(private readonly questionService: QuestionService) { }

    private readonly uploadOptions = {
        image: { maxSizeInMB: 5, allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'] },
        video: { maxSizeInMB: 50, allowedTypes: ['video/mp4'] },
        audio: { maxSizeInMB: 15, allowedTypes: ['audio/mpeg'] },
    };

    private parseMultipartBody(raw: any): any {
        const parsed = { ...raw };
        const numberFields = ['time', 'coins'];
        const jsonFields = ['options', 'blanks'];

        for (const key of numberFields) {
            if (typeof parsed[key] === 'string') {
                const num = Number(parsed[key]);
                if (isNaN(num)) {
                    throw new HttpException(`${key} must be a valid number`, HttpStatus.BAD_REQUEST);
                }
                parsed[key] = num;
            }
        }

        for (const key of jsonFields) {
            if (typeof parsed[key] === 'string') {
                try {
                    parsed[key] = JSON.parse(parsed[key]);
                } catch {
                    throw new HttpException(`${key} must be valid JSON`, HttpStatus.BAD_REQUEST);
                }
            }
        }

        if (Array.isArray(parsed.blanks)) {
            parsed.blanks = parsed.blanks.map((blank: any) => ({ ...blank, position: Number(blank.position), correctAnswers: Array.isArray(blank.correctAnswers) ? blank.correctAnswers : JSON.parse(blank.correctAnswers) }));
        }

        if (Array.isArray(parsed.options)) {
            parsed.options = parsed.options.map((opt: any) => ({ ...opt, isCorrect: opt.isCorrect === true || opt.isCorrect === 'true' || opt.isCorrect === 1 || opt.isCorrect === '1' }));
        }

        return parsed;
    }

    @Post('create')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('media'))
    async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
        const parsedBody = this.parseMultipartBody(body);
        const createQuestionDto: CreateQuestionDto = {
            ...parsedBody, media: parsedBody.media ? { image: null, video: null, audio: null, ...parsedBody.media } : undefined,
        };

        if (file) {
            if (!Object.values(QuestionType).includes(body.type)) {
                throw new HttpException(`Invalid media type. Must be one of: ${Object.values(QuestionType).join(', ')}`, HttpStatus.BAD_REQUEST);
            }
            const mediaType = body.type as QuestionType;
            const mediaUrl = await uploadToFirebase(file, `questions/${mediaType}/${Date.now()}-${file.originalname}`, this.uploadOptions[mediaType]);
            createQuestionDto.media = { image: null, video: null, audio: null, [mediaType]: mediaUrl };
        } else if (["video", "audio", "image"].includes(body.type)) {
            if (parsedBody.media && isURL(parsedBody.media)) {
                createQuestionDto.media = { image: null, video: null, audio: null, [body.type]: body.media };
            } else {
                throw new HttpException(`Invalid ${body.type} URL`, HttpStatus.BAD_REQUEST);
            }
        }
        return await this.questionService.create(createQuestionDto);
    }

    @Post('multiple-create')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FilesInterceptor('media'))
    async createMultiple( @Body() body: any,  @UploadedFiles() files?: Express.Multer.File[]) {
        const questions: CreateQuestionDto[] = [];

        const parsedArray = Array.isArray(body) ? body : JSON.parse(body.questions || '[]');

        for (let i = 0; i < parsedArray.length; i++) {
            const parsedBody = this.parseMultipartBody(parsedArray[i]);
            const dto: CreateQuestionDto = { ...parsedBody, media: parsedBody.media ? { image: null, video: null, audio: null, ...parsedBody.media } : undefined };

            if (files && files[i]) {
                if (!Object.values(QuestionType).includes(parsedBody.type)) {
                    throw new HttpException(`Invalid media type. Must be one of: ${Object.values(QuestionType).join(', ')}`, HttpStatus.BAD_REQUEST);
                }
                const mediaType = parsedBody.type as QuestionType;
                const mediaUrl = await uploadToFirebase(files[i], `questions/${mediaType}/${Date.now()}-${files[i].originalname}`, this.uploadOptions[mediaType]);
                dto.media = { image: null, video: null, audio: null, [mediaType]: mediaUrl };
            }

            questions.push(dto);
        }
        return await this.questionService.createMultiple(questions);
    }


    @Put('update/:id')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('media'))
    async update(@Param('id') id: string, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
        const parsedBody = this.parseMultipartBody(body);
        const updateQuestionDto: UpdateQuestionDto = {
            ...parsedBody, media: parsedBody.media ? { image: null, video: null, audio: null, ...parsedBody.media } : undefined,
        };

        if (file) {
            if (!Object.values(QuestionType).includes(body.type)) {
                throw new HttpException(`Invalid media type. Must be one of: ${Object.values(QuestionType).join(', ')}`, HttpStatus.BAD_REQUEST);
            }
            const mediaType = body.type as QuestionType;
            const mediaUrl = await uploadToFirebase(file, `questions/${mediaType}/${Date.now()}-${file.originalname}`, this.uploadOptions[mediaType]);
            updateQuestionDto.media = { image: null, video: null, audio: null, [mediaType]: mediaUrl };
        } else if (["video", "audio", "image"].includes(body.type)) {
            if (parsedBody.media && isURL(parsedBody.media)) {
                updateQuestionDto.media = { image: null, video: null, audio: null, [body.type]: body.media };
            } else {
                throw new HttpException(`Invalid ${body.type} URL`, HttpStatus.BAD_REQUEST);
            }
        }
        return await this.questionService.update(id, updateQuestionDto);
    }

    @Get('list')
    @HttpCode(HttpStatus.OK)
    async getAll(@Query() query: PaginatedQuestionsQuery) {
        return await this.questionService.findAll(query);
    }

    @Delete('delete/:id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        return await this.questionService.delete(id);
    }

    @Delete('delete-multiple')
    @HttpCode(HttpStatus.OK)
    async deleteMultiple(@Body() body: { ids: string[] }) {
        return await this.questionService.deleteMultiple(body.ids);
    }

    @Get('categories')
    @HttpCode(HttpStatus.OK)
    async getCategories() {
        return await this.questionService.getCategories();
    }

    @Get('levels')
    @HttpCode(HttpStatus.OK)
    async getLevels() {
        return await this.questionService.getLevels();
    }

    @Get('topics/:categoryIds/:levelIds')
    @HttpCode(HttpStatus.OK)
    async getTopics(@Param('categoryIds') categoryIds: string, @Param('levelIds') levelIds: string) {
        return await this.questionService.getTopics(categoryIds, levelIds);
    }

    @Get('filtered')
    @HttpCode(HttpStatus.OK)
    async getFiltered(@Query() query: FilteredQuestionsQuery) {
        return await this.questionService.getFiltered(query);
    }

    @Get('by-ids/:questionIds')
    @HttpCode(HttpStatus.OK)
    async getByIds(@Param('questionIds') questionIds: string) {
        return await this.questionService.getByIds(questionIds);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    async getById(@Param('id') id: string) {
        return await this.questionService.findById(id);
    }
}