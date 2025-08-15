import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { User, UsersDocument } from 'src/users/dto/users.schema';
import { Question, QuestionDocument } from './dto/question.schema';
import { Level, LevelDocument } from 'src/level/dto/level.schema';
import { Topic, TopicsDocument } from 'src/topics/dto/topics.schema';
import { Answer, AnswerDocument } from 'src/answer/dto/answer.schema';
import { Category, CategoryDocument } from 'src/category/dto/category.schema';
import { CreateQuestionDto, UpdateQuestionDto, PaginatedQuestionsQuery, FilteredQuestionsQuery, QuestionType } from './dto/question.dto';

@Injectable()
export class QuestionService {
    constructor(
        @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
        @InjectModel(Level.name) private levelModel: Model<LevelDocument>,
        @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
        @InjectModel(Topic.name) private topicModel: Model<TopicsDocument>,
        @InjectModel(Answer.name) private answerModel: Model<AnswerDocument>,
        @InjectModel(User.name) private userModel: Model<UsersDocument>,
    ) { }

    private parseIds(ids: string): Types.ObjectId[] {
        return ids.split(',').filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
    }

    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    private formatQuestionForFiltered(question: any) {
        const formatted: any = {
            id: question._id.toString(),
            type: question.type,
            coins: question.coins,
            time: question.time,
            question: question.question || { en: '', uz: '', ru: '' },
            media: question?.media?.image || question?.media?.video || question?.media?.audio || null,
        };

        if (Array.isArray(question.options) && question.options.length > 0) {
            formatted.options = question.options.map((opt: any) => ({
                text: opt.text,
                id: opt._id?.toString(),
            }));
        }

        if (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0) {
            formatted.correctAnswers = [];
        }

        if (Array.isArray(question.blanks) && question.blanks.length > 0) {
            formatted.blanks = question.blanks.map((b: any) => ({
                position: b.position,
                id: b._id?.toString(),
            }));
        }

        return formatted
    }

    private formatQuestion(question: any) {
        return {
            id: question._id.toString(),
            type: question.type,
            coins: question.coins,
            time: question.time,
            question: question.question || { en: '', uz: '', ru: '' },
            options: (question.options || []).map((opt: any) => ({
                id: opt._id?.toString() || '',
                text: opt.text,
                isCorrect: opt.isCorrect,
            })),
            correctAnswers: question.correctAnswers || [],
            blanks: (question.blanks || []).map((b: any) => ({
                id: b._id?.toString() || '',
                position: b.position,
                correctAnswers: b.correctAnswers,
            })),
            media: question.media || { image: null, video: null, audio: null },
            category: { id: question.category?._id?.toString(), title: question.category?.title || '' },
            topic: { id: question.topic?._id?.toString(), title: question.topic?.title || '' },
            level: { id: question.level?._id?.toString(), title: question.level?.title || '' },
            createdAt: question.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: question.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
        };
    }

    private async validateQuestionDto(dto: CreateQuestionDto | UpdateQuestionDto): Promise<Record<string, string[]>> {
        const errors: Record<string, string[]> = {};
        const { type, options, correctAnswers, blanks, media, question, level, category, topic, time, coins } = dto;

        if (question) {
            for (const lang of ['en', 'ru', 'uz'] as const) {
                if (!question[lang]?.trim()) {
                    errors[`question.${lang}`] = [`${lang.toUpperCase()} title is required`];
                }
            }
        }

        if (time !== undefined && time < 5) {
            errors.time = ['Time must be at least 5 seconds'];
        }

        if (coins !== undefined && coins < 1) {
            errors.coins = ['Coins must be at least 1'];
        }

        const validateId = async (field: string, value: string | undefined, model: Model<any>) => {
            if (value && !Types.ObjectId.isValid(value)) {
                errors[field] = [`Invalid ${field} ID format`];
            } else if (value && !(await model.exists({ _id: value }))) {
                errors[field] = [`${field} not found`];
            }
        };

        await Promise.all([
            validateId('level', level, this.levelModel),
            validateId('category', category, this.categoryModel),
            validateId('topic', topic, this.topicModel),
        ]);

        if (type && !Object.values(QuestionType).includes(type)) {
            errors.type = ['Invalid question type'];
            return errors;
        }

        if (type === QuestionType.MultipleChoice && (!options || options.length < 2 || options.filter(opt => opt.isCorrect).length !== 1)) {
            errors.options = [
                ...(options && options.length < 2 ? ['Multiple-choice questions require at least 2 options'] : []),
                ...(options && options.filter(opt => opt.isCorrect).length !== 1 ? ['Multiple-choice questions must have exactly one correct answer'] : []),
                ...(options?.map((opt, i) => !opt.text?.trim() ? `Option ${i + 1} text is required` : null).filter(Boolean) as string[]),
            ];
        }

        if (type === QuestionType.Input && (!correctAnswers || correctAnswers.length === 0)) {
            errors.correctAnswers = ['Input questions require at least one correct answer'];
        }

        if (type === QuestionType.FillInTheBlank) {
            if (!blanks || blanks.length === 0) {
                errors.blanks = ['Fill-in-the-blank questions require at least one blank'];
            } else {
                const blankErrors: string[] = [];
                blanks.forEach((blank, i) => {
                    if (typeof blank.position !== 'number') blankErrors.push(`Blank ${i + 1}: position must be a number`);
                    if (!Array.isArray(blank.correctAnswers) || blank.correctAnswers.length === 0) {
                        blankErrors.push(`Blank ${i + 1}: at least one correct answer is required`);
                    }
                });
                if (blankErrors.length) errors.blanks = blankErrors;

                for (const lang of ['en', 'ru', 'uz'] as const) {
                    const text = question?.[lang]?.trim();
                    if (text) {
                        const blankCount = (text.match(/_____/g) || []).length;
                        if (blankCount < 1) {
                            errors[`question.${lang}`] = [`${lang.toUpperCase()} title must contain at least one '_____'`];
                        } else if (blankCount !== blanks.length) {
                            errors[`question.${lang}`] = [`Number of '_____' in ${lang.toUpperCase()} title must match blanks count (${blanks.length})`];
                        }
                    }
                }
            }
        }
        if ([QuestionType.Image, QuestionType.Video, QuestionType.Audio].includes(type) && (!media || !media[type])) {
            errors.media = [`${type} questions require a valid ${type} URL or file`];
        }

        return errors;
    }

    async create(dto: CreateQuestionDto) {
        const errors = await this.validateQuestionDto(dto);
        if (Object.keys(errors).length) {
            throw new HttpException({ message: 'Validation failed', errors }, HttpStatus.BAD_REQUEST);
        }

        const questionData = {
            ...dto,
            level: new Types.ObjectId(dto.level),
            topic: new Types.ObjectId(dto.topic),
            category: new Types.ObjectId(dto.category),
        };

        const created = await this.questionModel.create(questionData);
        const populated = await created.populate([
            { path: 'level', select: 'title' },
            { path: 'category', select: 'title' },
            { path: 'topic', select: 'title' },
        ]);

        return {
            question: this.formatQuestion(populated),
            message: 'Question created successfully',
        };
    }

    async createMultiple(dtos: CreateQuestionDto[]) {
        if (!Array.isArray(dtos) || dtos.length === 0) {
            throw new HttpException('No questions provided', HttpStatus.BAD_REQUEST);
        }

        for (const dto of dtos) {
            const errors = await this.validateQuestionDto(dto);
            if (Object.keys(errors).length) {
                throw new HttpException({ message: 'Validation failed', errors, question: dto }, HttpStatus.BAD_REQUEST);
            }
        }

        const formattedData = dtos.map((dto) => ({
            ...dto,
            level: new Types.ObjectId(dto.level),
            topic: new Types.ObjectId(dto.topic),
            category: new Types.ObjectId(dto.category),
        }));

        const created = await this.questionModel.insertMany(formattedData);

        const populated = await this.questionModel.populate(created, [
            { path: 'level', select: 'title' },
            { path: 'category', select: 'title' },
            { path: 'topic', select: 'title' },
        ]);

        return {
            questions: populated.map((q) => this.formatQuestion(q)),
            message: `${populated.length} questions created successfully`,
        };
    }

    async update(id: string, data: UpdateQuestionDto) {
        const question = await this.questionModel.findById(id);
        if (!question) {
            throw new HttpException('Question not found', HttpStatus.NOT_FOUND);
        }

        const errors = await this.validateQuestionDto(data);
        if (Object.keys(errors).length) {
            throw new HttpException({ message: 'Validation failed', errors }, HttpStatus.BAD_REQUEST);
        }

        const updateData: any = {};

        if (data.question) {
            for (const lang of ['en', 'ru', 'uz'] as const) {
                if (data.question[lang] !== undefined) {
                    if (!updateData.question) updateData.question = {};
                    updateData.question[lang] = data.question[lang];
                }
            }
        }

        const fieldsWithReferences: Array<keyof UpdateQuestionDto> = [
            'level', 'category', 'topic'
        ];

        const otherFields: Array<keyof UpdateQuestionDto> = [
            'type', 'options', 'correctAnswers', 'blanks',
            'media', 'time', 'coins'
        ];

        for (const field of fieldsWithReferences) {
            if (data[field] !== undefined) {
                if (typeof data[field] === 'string') {
                    updateData[field] = new Types.ObjectId(data[field]);
                } else if (data[field] === null) {
                    updateData[field] = null;
                }
            }
        }

        otherFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        let hasChanges = false;
        for (const key in updateData) {
            if (JSON.stringify(question[key]) !== JSON.stringify(updateData[key])) {
                hasChanges = true;
                break;
            }
        }

        if (!hasChanges) {
            return { message: 'No changes detected', changed: false };
        }

        const updated = await this.questionModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate([
                { path: 'level', select: 'title' },
                { path: 'category', select: 'title' },
                { path: 'topic', select: 'title' },
            ])
            .lean();

        return {
            changed: true,
            question: this.formatQuestion(updated),
            message: 'Question updated successfully'
        };
    }

    async findAll({ page = 1, limit = 5, search, categoryIds, topicIds, levelIds, type }: PaginatedQuestionsQuery) {
        if (!Number.isInteger(page) || page < 1) {
            throw new HttpException('Page must be a positive integer', HttpStatus.BAD_REQUEST);
        }
        if (!Number.isInteger(limit) || limit < 1) {
            throw new HttpException('Limit must be a positive integer', HttpStatus.BAD_REQUEST);
        }

        const query: Record<string, any> = {};
        if (search?.trim()) {
            query.$or = ['en', 'uz', 'ru'].map(lang => ({
                [`question.${lang}`]: { $regex: new RegExp(search, 'i') },
            }));
        }

        if (categoryIds?.length) query.category = { $in: categoryIds.map(id => new Types.ObjectId(id)) };
        if (topicIds?.length) query.topic = { $in: topicIds.map(id => new Types.ObjectId(id)) };
        if (levelIds?.length) query.level = { $in: levelIds.map(id => new Types.ObjectId(id)) };


        const [questions, levels, topics, categories, total] = await Promise.all([
            this.questionModel
                .find(query)
                .skip((page - 1) * limit)
                .limit(limit)
                .populate([
                    { path: 'category', select: '_id title image' },
                    { path: 'topic', select: '_id title' },
                    { path: 'level', select: '_id title' },
                ])
                .lean(),
            this.levelModel.find().select('_id title').lean(),
            this.topicModel.find().select('_id title').lean(),
            this.categoryModel.find().select('_id title image').lean(),
            this.questionModel.countDocuments(query),
        ]);

        return {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            questions: questions.map(q => this.formatQuestion(q)),
            levels: levels.map(l => ({ id: l._id.toString(), title: l.title })),
            topics: topics.map(t => ({ id: t._id.toString(), title: t.title })),
            categories: categories.map(c => ({ id: c._id.toString(), title: c.title, image: c.image })),
        };
    }

    async delete(id: string) {
        const deleted = await this.questionModel.findByIdAndDelete(id).lean();
        if (!deleted) {
            throw new HttpException('Question not found', HttpStatus.NOT_FOUND);
        }
        return { message: 'Question deleted successfully' };
    }

    async deleteMultiple(ids: string[]) {
        if (!ids?.length) {
            throw new HttpException('No IDs provided for deletion', HttpStatus.BAD_REQUEST);
        }

        const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));
        if (!objectIds.length) {
            throw new HttpException('Invalid IDs provided', HttpStatus.BAD_REQUEST);
        }

        const result = await this.questionModel.deleteMany({ _id: { $in: objectIds } }).lean();
        if (result.deletedCount === 0) {
            throw new HttpException('No questions found to delete', HttpStatus.NOT_FOUND);
        }

        return {
            message: `${result.deletedCount} question(s) deleted successfully`,
            deletedCount: result.deletedCount,
        };
    }

    async getCategories() {
        const categoryIds = await this.questionModel.distinct('category').lean();
        const validCategoryIds = categoryIds.filter(id => Types.ObjectId.isValid(id));
        const categories = await this.categoryModel.find({ _id: { $in: validCategoryIds } }).select('title').lean();
        const formattedCategories = categories.map(category => ({ id: category._id.toString(), title: category.title }));
        return { message: "Get Categories Successfully", categories: formattedCategories };
    }

    async getLevels() {
        const levelIds = await this.questionModel.distinct('level').lean();
        const levels = await this.levelModel.find({ _id: { $in: levelIds } }).select('title').lean();
        const formattedLevels = levels.map(level => ({ id: level._id.toString(), title: level.title }));
        return { message: "Get Levels Successfully", levels: formattedLevels }
    }

    async getTopics(categories: string, levels: string) {
        const validCategorys = this.parseIds(categories);
        const validLevels = this.parseIds(levels);
        const topicIds = await this.questionModel.find({ category: { $in: validCategorys }, level: { $in: validLevels } }).distinct('topic').lean();
        const topics = await this.topicModel.find({ _id: { $in: topicIds } }).select('title').lean();
        const formattedTopics = topics.map(level => ({ id: level._id.toString(), title: level.title }));
        return { message: "Get Topics Successfully", topics: formattedTopics }
    }

    async getFiltered({ userId, categoryIds, levelIds, topicIds }: FilteredQuestionsQuery) {
        const filter: any = {};
        const userExists = await this.userModel.exists({ _id: userId });

        if (!userExists) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        if (categoryIds?.length) filter.category = { $in: this.parseIds(categoryIds.join(',')) };
        if (levelIds?.length) filter.level = { $in: this.parseIds(levelIds.join(',')) };
        if (topicIds?.length) filter.topic = { $in: this.parseIds(topicIds.join(',')) };

        const userAnswers = await this.answerModel.find({ userId: new Types.ObjectId(userId) }).lean();
        const correctlyAnsweredQuestionIds: string[] = [];

        for (const answer of userAnswers) {
            if (Array.isArray(answer.answers)) {
                for (const a of answer.answers) {
                    if (a.questionId && a.isCorrect) {
                        correctlyAnsweredQuestionIds.push(a.questionId.toString());
                    }
                }
            }
        }

        if (correctlyAnsweredQuestionIds.length) {
            filter._id = { $nin: correctlyAnsweredQuestionIds.map(id => new Types.ObjectId(id)) };
        }

        const questions = await this.questionModel.find(filter).populate([
            { path: 'level', select: 'title' },
            { path: 'category', select: 'title' },
            { path: 'topic', select: 'title' }
        ]).lean();

        const shuffledQuestions = this.shuffleArray(questions);

        return {
            total: shuffledQuestions.length,
            questions: shuffledQuestions.map(q => this.formatQuestionForFiltered(q)),
        };
    }

    async getByIds(questionIds: string) {
        const ids = this.parseIds(questionIds);
        const questions = await this.questionModel.find({ _id: { $in: ids } }).populate([{ path: 'level', select: 'title' }, { path: 'category', select: 'title' }, { path: 'topic', select: 'title' },]).lean();

        if (!questions.length) {
            throw new HttpException('Questions not found', HttpStatus.NOT_FOUND);
        }

        return { questions: questions.map(q => this.formatQuestionForFiltered(q)) };
    }

    async findById(id: string) {
        const question = await this.questionModel.findById(id).populate([{ path: 'level', select: 'title' }, { path: 'category', select: 'title' }, { path: 'topic', select: 'title' }]).lean();

        if (!question) {
            throw new HttpException('Question not found', HttpStatus.NOT_FOUND);
        }

        return this.formatQuestion(question);
    }
}