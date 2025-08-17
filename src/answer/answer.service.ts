import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Answer, AnswerDocument } from './dto/answer.schema';
import { User, UsersDocument } from '../users/dto/users.schema';
import { Question, QuestionDocument } from '../question/dto/question.schema';
import { CreateAnswerDto, PopulatedAnswer } from './dto/answer.dto';

@Injectable()
export class AnswerService {
    constructor(
        @InjectModel(Answer.name) private readonly answerModel: Model<AnswerDocument>,
        @InjectModel(User.name) private readonly userModel: Model<UsersDocument>,
        @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
    ) { }

    private generateQuizId(length = 8): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    async createAnswers(dto: CreateAnswerDto): Promise<{ message: string; total: number, correctAnswers: number; totalCoins: number }> {
        const { userId, answers } = dto;
        if (!Types.ObjectId.isValid(userId)) {
            throw new HttpException('Invalid userId format', HttpStatus.BAD_REQUEST);
        }
        const userObjectId = new Types.ObjectId(userId);

        const user = await this.userModel.findById(userObjectId);
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const questionIds = answers.map((ans) => ans.questionId);
        const validQuestionIds = questionIds.every((id) => Types.ObjectId.isValid(id));
        if (!validQuestionIds) {
            throw new HttpException('One or more question IDs are invalid', HttpStatus.BAD_REQUEST);
        }

        const questionObjectIds = questionIds.map((id) => new Types.ObjectId(id));
        const questions = await this.questionModel.find({ _id: { $in: questionObjectIds } });
        if (questions.length !== questionIds.length) {
            throw new HttpException('One or more questions not found', HttpStatus.BAD_REQUEST);
        }

        const questionMap = new Map<string, Question>(questions.map((q) => [q._id.toString(), q]));

        let correctAnswersCount = 0;
        let totalCoins = 0;

        const updatedAnswers = answers.map((ans) => {
            const question = questionMap.get(ans.questionId);
            if (!question) {
                throw new HttpException(`Question not found for ID: ${ans.questionId}`, HttpStatus.BAD_REQUEST);
            }

            const userAnswers = ans.userAnswers?.map((answer) => answer) || [];
            let isCorrect = false;

            if (["multiple-choice", "audio", "video", "image"].includes(question.type) && question.options.length) {
                const correctOptionText = question.options.filter((opt) => opt.isCorrect).map((opt) => opt?.text);
                isCorrect = userAnswers.some((answer) => correctOptionText.includes(answer));
            }

            if (["input", "audio", "video", "image"].includes(question.type) && question.correctAnswers.length) {
                isCorrect = userAnswers.some((answer) => question.correctAnswers.includes(answer));
            }

            if (["fill-in-the-blank", "audio", "video", "image"].includes(question.type) && question.blanks.length) {
                isCorrect = userAnswers.some((answer, index) => question.blanks[index].correctAnswers[0] === answer);
            }

            if (isCorrect) {
                correctAnswersCount++;
                totalCoins += question.coins;
            }

            return {
                isCorrect,
                userAnswers: ans.userAnswers || [],
                questionId: new Types.ObjectId(ans.questionId),
                timestamp: ans.timestamp ? new Date(ans.timestamp) : new Date(),
            };
        });

        const userAnswerDoc = new this.answerModel({
            totalCoins,
            userId: userObjectId,
            answers: updatedAnswers,
            quizId: this.generateQuizId(8),
        });

        await userAnswerDoc.save();

        return {
            totalCoins,
            total: answers.length,
            correctAnswers: correctAnswersCount,
            message: 'Answers successfully saved',
        };
    }

    // async checkIfAnswered(userId: string, questionId: string): Promise<boolean> {
    //     if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(questionId)) {
    //         throw new BadRequestException('Invalid IDs');
    //     }

    //     const exists = await this.answerModel.findOne({ userId: new Types.ObjectId(userId), 'answers.questionId': new Types.ObjectId(questionId) }).lean();

    //     return !!exists;
    // }

    // async deleteUserAnswers(userId: string): Promise<{ message: string, deletedCount: number }> {
    //     if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid user ID');

    //     const result = await this.answerModel.deleteOne({ userId: new Types.ObjectId(userId) });

    //     if (result.deletedCount === 0) {
    //         throw new NotFoundException('No answers found for this user');
    //     }

    //     return {
    //         message: `${result.deletedCount} answer record deleted successfully`,
    //         deletedCount: result.deletedCount,
    //     };
    // }

    async deleteMultiple(ids: string[]): Promise<{ message: string, deletedCount: number }> {
        const objectIds = ids.filter(id => Types.ObjectId.isValid(id)).map(id => new Types.ObjectId(id));

        if (!objectIds.length) throw new BadRequestException('No valid IDs provided');

        const result = await this.answerModel.deleteMany({ _id: { $in: objectIds } });

        if (result.deletedCount === 0) {
            throw new NotFoundException('No answer documents deleted');
        }

        return {
            message: `${result.deletedCount} answer document(s) deleted successfully`,
            deletedCount: result.deletedCount,
        };
    }

    async getAnswersWithQuestions(userId: string) {
        try {
            if (!Types.ObjectId.isValid(userId)) {
                throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
            }

            const userObjectId = new Types.ObjectId(userId);

            const answers = await this.answerModel
                .find({ userId: userObjectId })
                .select('quizId answers createdAt')
                .populate({
                    path: 'answers.questionId',
                    select: 'question type coins correctAnswers blanks options category media level topic',
                    populate: [{ path: 'category', select: 'title _id image' }, { path: 'level', select: 'title _id' }, { path: 'topic', select: 'title _id' }],
                })
                .lean<PopulatedAnswer[]>();

            const categoriesMap = new Map<string, { id: string; title: string; image: string }>();
            const levelsMap = new Map<string, { id: string; title: string }>();
            const topicsMap = new Map<string, { id: string; title: string }>();

            const result = {
                categories: [],
                levels: [],
                topics: [],
                correct: 0,
                inCorrect: 0,
                earnedCoins: 0,
                answers: [] as Array<{
                    id: string;
                    quizId: string;
                    finishedDate: Date;
                    earnCoins: number;
                    totalCoins: number;
                    questions: Array<{
                        id: string;
                        question: Record<string, string>;
                        type: string;
                        coins: number;
                        correctAnswers: string[];
                        blanks: any[];
                        options: any[];
                        isCorrect: boolean;
                        userAnswers: string[];
                        media: { image: string | null, video: string | null, audio: string | null };
                    }>;
                }>,
            };

            answers.forEach((answer) => {
                let totalCoins = 0;
                let earnCoins = 0;
                const answerQuestions = [];

                answer.answers.forEach((ans) => {
                    const q = ans.questionId;
                    if (!q || typeof q === 'string' || q instanceof Types.ObjectId) return;

                    totalCoins += q.coins;

                    if (ans.isCorrect) {
                        earnCoins += q.coins;
                        result.earnedCoins += q.coins
                        result.correct += 1
                    } else {
                        result.inCorrect += 1
                    }

                    const questionData = {
                        id: q._id.toString(),
                        type: q.type,
                        coins: q.coins,
                        media: q.media,
                        blanks: q.blanks,
                        options: q.options,
                        question: q.question,
                        isCorrect: ans.isCorrect,
                        userAnswers: ans.userAnswers,
                        correctAnswers: q.correctAnswers,
                    };

                    answerQuestions.push(questionData);

                    const cat = q.category;
                    if (cat && typeof cat === 'object' && '_id' in cat && 'title' in cat) {
                        const catId = cat._id.toString();
                        if (!categoriesMap.has(catId)) {
                            categoriesMap.set(catId, {
                                id: catId,
                                title: cat.title,
                                image: cat.image ?? '',
                            });
                        }
                    }

                    const level = q.level;
                    if (level && typeof level === 'object' && '_id' in level && 'title' in level) {
                        const levelId = level._id.toString();
                        if (!levelsMap.has(levelId)) {
                            levelsMap.set(levelId, {
                                id: levelId,
                                title: level.title,
                            });
                        }
                    }

                    const topic = q.topic;
                    if (topic && typeof topic === 'object' && '_id' in topic && 'title' in topic) {
                        const topicId = topic._id.toString();
                        if (!topicsMap.has(topicId)) {
                            topicsMap.set(topicId, {
                                id: topicId,
                                title: topic.title,
                            });
                        }
                    }
                });

                result.answers.push({
                    earnCoins,
                    totalCoins,
                    id: answer._id.toString(),
                    quizId: answer.quizId,
                    questions: answerQuestions,
                    finishedDate: answer.createdAt,
                });
            });

            result.categories = Array.from(categoriesMap.values());
            result.levels = Array.from(levelsMap.values());
            result.topics = Array.from(topicsMap.values());

            return result;
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch answers with questions', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}