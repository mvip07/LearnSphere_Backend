import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

import { FollowService } from './follow/follow.service';
import { AnswerService } from './answer/answer.service';
import { User, UsersDocument } from './users/dto/users.schema';
import { Question, QuestionDocument } from './question/dto/question.schema';

@Injectable()
export class AppService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UsersDocument>,
        @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
        private readonly followService: FollowService,
        private readonly answerService: AnswerService,
    ) { }

    private roundingNumbers(num: number): string {
        if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toString();
    }

    private formatUser(user: any) {
        return {
            bio: user.bio,
            email: user.email,
            id: user._id.toString(),
            lastname: user.lastname,
            username: user.username,
            firstname: user.firstname,
            image: user.image || process.env.DEFAULT_USER_IMAGE,
        };
    }

    async cabinet(id: string) {
        try {
            if (!Types.ObjectId.isValid(id)) {
                throw new HttpException('Invalid user ID', HttpStatus.BAD_REQUEST);
            }

            const user = await this.userModel.findById(id).select('firstname lastname username email bio image').lean();
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            const FOLLOW = await this.followService.getUserFollowStats(id)
            const ANSWER = await this.answerService.getAnswersWithQuestions(id)

            const questions = await this.questionModel.find().lean()
            const totalCoins = questions.reduce((sum, question) => sum + (question.coins || 0), 0);

            return {
                user: {
                    ...this.formatUser(user),
                    follower: this.roundingNumbers(FOLLOW.followerTotal),
                    following: this.roundingNumbers(FOLLOW.followingTotal),

                },
                results: {
                    total: questions.length,
                    correct: ANSWER.correct,
                    inCorrect: ANSWER.inCorrect,
                    earnedCoins: ANSWER.earnedCoins,
                    totalCoins,
                },
                levels: ANSWER.levels,
                topics: ANSWER.topics,
                answers: ANSWER.answers,
                follower: FOLLOW.follower,
                following: FOLLOW.following,
                categories: ANSWER.categories,
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch cabinet data', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}