import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { User, UsersDocument } from './dto/users.schema';
import { Role, RolesDocument } from '../roles/dto/roles.schema';
import { Follow, FollowDocument } from '../follow/dto/follow.schema';
import { Answer, AnswerDocument } from '../answer/dto/answer.schema';
import { Question, QuestionDocument } from '../question/dto/question.schema';
import { UpdateDto, AllUsersWithStatsPropsDto, CreateUserDto, UpdateUserForAdminDto, ChangeHistory } from './dto/users.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UsersDocument>,
        @InjectModel(Role.name) private readonly roleModel: Model<RolesDocument>,
        @InjectModel(Follow.name) private readonly followModel: Model<FollowDocument>,
        @InjectModel(Answer.name) private readonly answerModel: Model<AnswerDocument>,
        @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
        private readonly authService: AuthService,
    ) { }

    private formatUser(user: any) {
        return {
            bio: user.bio,
            email: user.email,
            block: user.block,
            lastname: user.lastname,
            username: user.username,
            id: user._id?.toString(),
            firstname: user.firstname,
            isVerified: user.isVerified,
            followers: user.followers || 0,
            following: user.following || 0,
            totalCoins: user.totalCoins || 0,
            verificationCode: user.verificationCode || "No Code",
            image: user.image || process.env.DEFAULT_USER_IMAGE,
            createdAt: user.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: user.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
        };
    }

    private async calculateUserStats(userIds: string[]) {
        const [followers, following, answers, questions] = await Promise.all([
            this.followModel.aggregate([
                { $match: { following: { $in: userIds.map(id => new Types.ObjectId(id)) } } },
                { $group: { _id: '$following', count: { $sum: 1 } } },
            ]).exec(),
            this.followModel.aggregate([
                { $match: { follower: { $in: userIds.map(id => new Types.ObjectId(id)) } } },
                { $group: { _id: '$follower', count: { $sum: 1 } } },
            ]).exec(),
            this.answerModel.find({ userId: { $in: userIds.map(id => new Types.ObjectId(id)) }, isCorrect: true }).select('userId questionId').lean(),
            this.questionModel.find().select('coins').lean(),
        ]);

        const followersMap = new Map(followers.map(f => [f._id.toString(), f.count]));
        const followingMap = new Map(following.map(f => [f._id.toString(), f.count]));
        const questionsMap = new Map(questions.map(q => [q._id.toString(), q.coins || 0]));

        return { followersMap, followingMap, questionsMap, answers };
    }

    private roundingNumbers(num: number): string {
        if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 10_000) return (num / 10_000).toFixed(1) + 'K';
        return num.toString();
    }

    private async validateUsernameUpdate(userId: string, newUsername: string) {
        const existingUser = await this.userModel.findOne({ username: newUsername });
        if (existingUser && existingUser._id.toString() !== userId) {
            throw new HttpException('Username already exists', HttpStatus.CONFLICT);
        }

        const user = await this.userModel.findById(userId);
        if (user.usernameChangedAt) {
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            if (user.usernameChangedAt > fourteenDaysAgo) {
                const nextChangeDate = new Date(user.usernameChangedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
                throw new HttpException(`Username can only be changed once every 14 days. Next available change: ${nextChangeDate.toISOString()}`, HttpStatus.BAD_REQUEST);
            }
        }
    }

    private async validateEmailUpdate(userId: string, newEmail: string) {
        const existingUser = await this.userModel.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== userId) {
            throw new HttpException('Email already exists', HttpStatus.CONFLICT);
        }

        const user = await this.userModel.findById(userId);
        if (user.emailChangedAt) {
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            if (user.emailChangedAt > fourteenDaysAgo) {
                const nextChangeDate = new Date(user.emailChangedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
                throw new HttpException(`Email can only be changed once every 14 days. Next available change: ${nextChangeDate.toISOString()}`, HttpStatus.BAD_REQUEST);
            }
        }
    }

    private getNextAllowedChangeDate(lastChangeDate?: Date): Date | null {
        if (!lastChangeDate) return null;
        return new Date(lastChangeDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    private checkForChanges(user: UsersDocument, data: UpdateDto & { image?: string }): boolean {
        const fieldsToCheck = ['firstname', 'lastname', 'bio', 'email', 'username'];

        for (const field of fieldsToCheck) {
            if (data[field] !== undefined && data[field] !== user[field]) {
                return true;
            }
        }

        if (data.image !== undefined && data.image !== user['image']) {
            return true;
        }

        return false;
    }

    private checkForChangesForAdmin(user: UsersDocument, data: UpdateUserForAdminDto & { image?: string }): boolean {
        const fieldsToCheck = [
            { field: 'firstname', oldValue: user.firstname, newValue: data.firstname },
            { field: 'lastname', oldValue: user.lastname, newValue: data.lastname },
            { field: 'email', oldValue: user.email, newValue: data.email },
            { field: 'username', oldValue: user.username, newValue: data.username },
            { field: 'bio', oldValue: user.bio || '', newValue: data.bio || '' },
            { field: 'image', oldValue: user.image || '', newValue: data.image || '' },
            { field: 'block', oldValue: user.block, newValue: data.block },
            { field: 'isVerified', oldValue: user.isVerified, newValue: data.isVerified },
            { field: 'roles', oldValue: user.roles.map((r: any) => r.toString()), newValue: data.roles },
        ];

        if (data.password) {
            return true;
        }

        return fieldsToCheck.some(({ oldValue, newValue }) => {
            return JSON.stringify(oldValue) !== JSON.stringify(newValue);
        });
    }

    async findById(userId: string) {
        const user = await this.userModel.findById(userId).select('firstname lastname username email bio image').lean();
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

        const { followersMap, followingMap, questionsMap, answers } = await this.calculateUserStats([userId]);
        const userAnswers = answers.filter(a => a.userId.toString() === userId);
        const totalCoins = userAnswers.reduce((sum, ans) => sum + (questionsMap.get(ans.answers["questionId"].toString()) || 0), 0);

        return {
            ...this.formatUser(user),
            totalCoins,
            follower: this.roundingNumbers(followersMap.get(userId) || 0),
            following: this.roundingNumbers(followingMap.get(userId) || 0),
        };
    }

    async canChangeUsername(userId: string): Promise<boolean> {
        const user = await this.userModel.findById(userId).select('usernameChangedAt').lean();
        if (!user?.usernameChangedAt) return true;

        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        return user.usernameChangedAt < fourteenDaysAgo;
    }

    async canChangeEmail(userId: string): Promise<boolean> {
        const user = await this.userModel.findById(userId).select('emailChangedAt').lean();
        if (!user?.emailChangedAt) return true;

        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        return user.emailChangedAt < fourteenDaysAgo;
    }

    async update(id: string, data: UpdateDto & { image?: string }, res: Response) {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const hasChanges = this.checkForChanges(user, data);

        if (!hasChanges) {
            return res.json({ message: 'No changes detected', changed: false });
        }

        const updateData: any = {
            updatedAt: new Date(),
            changeHistory: user.changeHistory || []
        };

        const optionalFields = ['firstname', 'lastname', 'bio', 'image'];
        for (const field of optionalFields) {
            if (data[field] !== undefined && data[field] !== user[field]) {
                updateData[field] = data[field];
                updateData.changeHistory.push({
                    field,
                    oldValue: user[field],
                    newValue: data[field],
                    changedAt: new Date()
                });
            }
        }

        if (data.username && data.username !== user.username) {
            await this.validateUsernameUpdate(id, data.username);
            updateData.username = data.username;
            updateData.usernameChangedAt = new Date();
            updateData.changeHistory.push({
                field: 'username',
                oldValue: user.username,
                newValue: data.username,
                changedAt: new Date()
            });
        }

        let requiresVerification = false;
        if (data.email && data.email !== user.email) {
            await this.validateEmailUpdate(id, data.email);

            const verificationCode = crypto.randomInt(100000, 999999).toString();
            const verificationExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

            updateData.email = data.email;
            updateData.verificationCode = verificationCode;
            updateData.verificationExpiresAt = verificationExpiresAt;
            updateData.isVerified = false;
            updateData.emailChangedAt = new Date();

            updateData.changeHistory.push({
                field: 'email',
                oldValue: user.email,
                newValue: data.email,
                changedAt: new Date()
            });

            requiresVerification = true;
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).lean();

        if (requiresVerification) {
            const mailData = {
                color: '#8A33FD',
                text: 'Verify Email',
                intro: 'Welcome to Quiz App!',
                subject: `Your verification code is ${updateData.verificationCode}`,
                link: `${process.env.FRONTEND_URL}/en/auth/verification/${data.email}`,
                instructions: `Please use the following code to verify your email: <h2>${updateData.verificationCode}</h2>. This code expires in 3 minutes.`,
            };

            await this.authService.sendEmailMessage(updatedUser, mailData, 'Verify Your Email');

            return res.json({
                redirect: true,
                url: `/auth/verification/${data.email}`,
                verificationExpiresAt: updateData.verificationExpiresAt,
                message: 'Email updated successfully. Please verify your new email address.'
            });
        }

        return res.json({
            message: 'Profile updated successfully',
            user: this.formatUser(updatedUser),
            nextAllowedChange: {
                email: this.getNextAllowedChangeDate(updatedUser.emailChangedAt),
                username: this.getNextAllowedChangeDate(updatedUser.usernameChangedAt)
            }
        });
    }

    async deleteImage(id: string) {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        user.image = process.env.DEFAULT_USER_IMAGE
        await user.save()

        return {
            message: 'Profile picture successfully deleted.',
            user: this.formatUser(user),
        }
    }

    async delete(id: string) {
        const user = await this.userModel.findByIdAndDelete(id).lean();
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        return { message: 'User deleted successfully' };
    }

    async rankings({ page = 1, limit = 5, search = '', sortBy = 'coins' }: Partial<AllUsersWithStatsPropsDto> = {}) {
        if (!Number.isInteger(page) || page < 1) {
            throw new HttpException('Page must be a positive integer', HttpStatus.BAD_REQUEST);
        }
        if (!Number.isInteger(limit) || limit < 1) {
            throw new HttpException('Limit must be a positive integer', HttpStatus.BAD_REQUEST);
        }

        const searchQuery = typeof search === 'string' ? search.trim() : '';

        const query = searchQuery
            ? {
                $or: [
                    { firstname: { $regex: searchQuery, $options: 'i' } },
                    { lastname: { $regex: searchQuery, $options: 'i' } },
                    { username: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } },
                ],
            }
            : {};

        const [users, total] = await Promise.all([
            this.userModel.find(query).select('firstname lastname username image').lean(),
            this.userModel.countDocuments(query),
        ]);

        if (!users.length) {
            return { success: true, users: [], total: 0, currentPage: page, totalPages: 0 };
        }

        const userIds = users.map((user) => user._id.toString());
        const objectIds = userIds.map(id => new Types.ObjectId(id));
        const [followers, following, answers, questions] = await Promise.all([
            this.followModel.aggregate([{ $match: { following: { $in: objectIds } } }, { $group: { _id: '$following', count: { $sum: 1 } } }]).exec(),
            this.followModel.aggregate([{ $match: { follower: { $in: objectIds } } }, { $group: { _id: '$follower', count: { $sum: 1 } } }]).exec(),
            this.answerModel.find({ userId: { $in: objectIds } }).select('userId answers').lean(),
            this.questionModel.find().select('coins').lean(),
        ]);

        const followersMap = new Map(followers.map((f) => [f._id.toString(), f.count]));
        const followingMap = new Map(following.map((f) => [f._id.toString(), f.count]));
        const questionsMap = new Map(questions.map((q) => [q._id.toString(), q.coins || 0]));

        const answersByUser = new Map<string, Answer[]>();
        answers.forEach((answer: Answer) => {
            const userId = answer.userId.toString();
            if (!answersByUser.has(userId)) {
                answersByUser.set(userId, []);
            }
            answersByUser.get(userId)!.push(answer);
        });

        const userStats = users.map((user) => {
            const userId = user._id.toString();
            const userAnswers = answersByUser.get(userId) || [];
            const totalCoins = userAnswers.reduce((sum, answerDoc) => {
                return (
                    sum +
                    answerDoc.answers.reduce((answerSum, answer) => {
                        if (answer.isCorrect) {
                            const coins = questionsMap.get(answer.questionId.toString()) || 0;
                            return answerSum + coins;
                        }
                        return answerSum;
                    }, 0)
                );
            }, 0);

            return {
                id: userId,
                totalCoins,
                username: user.username,
                lastname: user.lastname,
                firstname: user.firstname,
                follower: followersMap.get(userId) || 0,
                following: followingMap.get(userId) || 0,
                image: user.image || process.env.DEFAULT_USER_IMAGE,
            };
        });

        userStats.sort((a, b) => {
            switch (sortBy) {
                case 'followers': return b.follower - a.follower;
                case 'followers_asc': return a.follower - b.follower;
                case 'following': return b.following - a.following;
                case 'following_asc': return a.following - b.following;
                case 'coins': return b.totalCoins - a.totalCoins;
                case 'coins_asc': return a.totalCoins - b.totalCoins;
                default: return 0;
            }
        });

        const startIndex = (page - 1) * limit;
        const paginatedUsers = userStats.slice(startIndex, startIndex + limit);

        return {
            total,
            page: page,
            limit: limit,
            users: paginatedUsers,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findByUsername(username: string) {
        const users = await this.userModel.find({ username: { $regex: username, $options: 'i' } }).select('firstname lastname username image').lean();
        if (!users.length) throw new HttpException(`No users found with username "${username}"`, HttpStatus.NOT_FOUND);

        return { users: users.map(user => this.formatUser(user)) };
    }

    async createForAdmin(body: CreateUserDto & { image?: string }) {
        const { firstname, lastname, email, username, password, confirmPassword, bio, image, block, isVerified, roles } = body;

        if (password !== confirmPassword) {
            throw new HttpException('Confirm password must match password', HttpStatus.BAD_REQUEST);
        }

        const [existingEmail, existingUsername] = await Promise.all([
            this.userModel.findOne({ email }).lean(),
            this.userModel.findOne({ username }).lean(),
        ]);

        if (existingUsername) {
            throw new HttpException({ status: HttpStatus.CONFLICT, errors: { username: ['Username already exists'], }, }, HttpStatus.CONFLICT,);
        }

        if (existingEmail) {
            throw new HttpException({ status: HttpStatus.CONFLICT, errors: { email: ['Email already exists'], }, }, HttpStatus.CONFLICT,);
        }

        let roleIds: Types.ObjectId[];
        if (roles && roles.length > 0) {
            roleIds = roles.map((roleId) => {
                if (!Types.ObjectId.isValid(roleId)) {
                    throw new HttpException(`Invalid role ID: ${roleId}`, HttpStatus.BAD_REQUEST);
                }
                return new Types.ObjectId(roleId);
            });

            const existingRoles = await this.roleModel.find({ _id: { $in: roleIds } }).lean();
            if (existingRoles.length !== roleIds.length) {
                const missingRoles = roleIds.filter((id) => !existingRoles.some((role) => role._id.equals(id))).map((id) => id.toString());
                throw new HttpException(`Roles not found: ${missingRoles.join(', ')}`, HttpStatus.BAD_REQUEST);
            }
        } else {
            const defaultRole = await this.roleModel.findOne({ name: 'User' }).lean();
            if (!defaultRole) {
                throw new HttpException('Default role not found', HttpStatus.INTERNAL_SERVER_ERROR);
            }
            roleIds = [new Types.ObjectId(defaultRole._id)];
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userData: Partial<User> = {
            firstname,
            lastname,
            email,
            username,
            block,
            isVerified,
            image: image,
            bio: bio?.trim(),
            authMethod: 'admin',
            password: hashedPassword,
            roles: roleIds,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        let verificationCode: string | null;
        let verificationExpiresAt: Date | null;
        if (!isVerified) {
            verificationCode = crypto.randomInt(100000, 999999).toString();
            verificationExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
            userData.verificationCode = verificationCode;
            userData.verificationExpiresAt = verificationExpiresAt;
        }

        try {
            const user = await this.userModel.create(userData);
            const populatedUser = await this.userModel.findById(user._id).populate('roles').lean();

            if (!populatedUser) {
                throw new HttpException('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (!isVerified) {
                const mailData = {
                    color: '#8A33FD',
                    text: 'Verify Email',
                    intro: 'Welcome to Quiz App!',
                    subject: `Your verification code is ${verificationCode}`,
                    link: `${process.env.FRONTEND_URL}/auth/verification/${email}`,
                    instructions: `Please use the following code to verify your email: <h2>${verificationCode}</h2>. This code expires in 15 minutes.`,
                };

                await this.authService.sendEmailMessage(populatedUser, mailData, 'Verify Your Email');
            }

            return {
                success: true,
                message: isVerified ? 'User created successfully' : 'User created successfully. Please verify your email.',
                user: this.formatUser(populatedUser),
                verificationExpiresAt: verificationExpiresAt?.toISOString(),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to create user', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async updateForAdmin(id: string, body: UpdateUserForAdminDto & { image?: string }) {
        const { firstname, lastname, email, username, password, confirmPassword, bio, image, roles, block, isVerified } = body;

        if (password && password !== confirmPassword) {
            throw new HttpException('Password and confirmation password must match', HttpStatus.BAD_REQUEST);
        }

        const user = await this.userModel.findById(id).lean();
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const hasChanges = this.checkForChangesForAdmin(user, body);
        if (!hasChanges) {
            return { changed: false, message: 'No changes detected' };
        }

        if (username !== user.username) {
            await this.validateUsernameUpdate(id, username);
        }
        if (email !== user.email) {
            await this.validateEmailUpdate(id, email);
        }

        const roleIds = roles.map((roleId) => {
            if (!Types.ObjectId.isValid(roleId)) {
                throw new HttpException(`Invalid role ID: ${roleId}`, HttpStatus.BAD_REQUEST);
            }
            return new Types.ObjectId(roleId);
        });

        const existingRoles = await this.roleModel.find({ _id: { $in: roleIds } }).lean();
        if (existingRoles.length !== roleIds.length) {
            const missingRoles = roleIds.filter((id) => !existingRoles.some((role) => role._id.equals(id))).map((id) => id.toString());
            throw new HttpException(`Roles not found: ${missingRoles.join(', ')}`, HttpStatus.BAD_REQUEST);
        }

        const changeHistory: ChangeHistory[] = [];
        const now = new Date();
        const fieldsToTrack = [
            { field: 'firstname', oldValue: user.firstname, newValue: firstname },
            { field: 'lastname', oldValue: user.lastname, newValue: lastname },
            { field: 'email', oldValue: user.email, newValue: email },
            { field: 'username', oldValue: user.username, newValue: username },
            { field: 'bio', oldValue: user.bio || '', newValue: bio || '' },
            { field: 'image', oldValue: user.image || '', newValue: image || '' },
            { field: 'block', oldValue: user.block, newValue: block },
            { field: 'isVerified', oldValue: user.isVerified, newValue: isVerified },
            { field: 'roles', oldValue: user.roles.map((r: any) => r.toString()).sort(), newValue: roles.sort() },
        ];

        if (password) {
            changeHistory.push({
                field: 'password',
                oldValue: '[Oldingi]',
                newValue: '[Yangilandi]',
                changedAt: now,
            });
        }

        fieldsToTrack.forEach(({ field, oldValue, newValue }) => {
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changeHistory.push({
                    field,
                    oldValue,
                    newValue,
                    changedAt: now,
                });
            }
        });

        const updateData: Partial<User> = {
            firstname,
            lastname,
            email,
            username,
            bio: bio.trim(),
            image: image || user.image || process.env.DEFAULT_USER_IMAGE,
            roles: roleIds,
            block,
            isVerified,
            updatedAt: now,
        };

        if (username !== user.username) {
            updateData.usernameChangedAt = now;
        }
        if (email !== user.email) {
            updateData.emailChangedAt = now;
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 12);
        }

        let verificationCode: string | undefined;
        let verificationExpiresAt: Date | undefined;
        if (user.isVerified && !isVerified) {
            verificationCode = crypto.randomInt(100000, 999999).toString();
            verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
            updateData.verificationCode = verificationCode;
            updateData.verificationExpiresAt = verificationExpiresAt;
        }

        try {
            const updatedUser = await this.userModel
                .findByIdAndUpdate(
                    id,
                    { $set: updateData, $push: { changeHistory: { $each: changeHistory } } },
                    { new: true, runValidators: true },
                )
                .populate('roles')
                .lean();

            if (!updatedUser) {
                throw new HttpException('Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            if (verificationCode && verificationExpiresAt) {
                const mailData = {
                    color: '#8A33FF',
                    text: 'Email confirmation',
                    intro: 'Action required: Email confirmation',
                    subject: `Your verification code: ${verificationCode}`,
                    link: `${process.env.FRONTEND_URL}/auth/verification/${email}`,
                    instructions: `Your verification status has been changed. Please use the following code to verify your email: <h2>${verificationCode}</h2>. This code will expire in 15 minutes.`,
                };

                await this.authService.sendEmailMessage(updatedUser, mailData, 'Email confirmation');
            }

            return {
                changed: true,
                message: 'User successfully updated',
                user: this.formatUser(updatedUser),
                verificationExpiresAt: verificationExpiresAt?.toISOString(),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to update user', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async findAllForAdmin({ page = 1, limit = 5, search = '', block = 'all', isVerified = 'all', roles, totalCoins = 'all', followers = 'all', following = 'all' }: Partial<AllUsersWithStatsPropsDto> = {}) {
        if (!Number.isInteger(page) || page < 1) {
            throw new HttpException('Page must be a positive integer', HttpStatus.BAD_REQUEST);
        }
        if (!Number.isInteger(limit) || limit < 1) {
            throw new HttpException('Limit must be a positive integer', HttpStatus.BAD_REQUEST);
        }

        const searchQuery = search.trim()
            ? {
                $or: [
                    { firstname: { $regex: search, $options: 'i' } },
                    { lastname: { $regex: search, $options: 'i' } },
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ],
            }
            : {};

        const filterQuery: any = {};
        if (block !== 'all') {
            filterQuery.block = block === 'true';
        }
        if (isVerified !== 'all') {
            filterQuery.isVerified = isVerified === 'true';
        }
        if (roles) {
            const roleIds = roles.split(',').map((id) => id.trim()).filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
            if (roleIds.length) {
                filterQuery.roles = { $in: roleIds };
            }
        }

        const query = { ...searchQuery, ...filterQuery };

        const sortCriteria: Record<string, 1 | -1> = {};
        if (totalCoins !== 'all') {
            sortCriteria.totalCoins = totalCoins === 'asc' ? 1 : -1;
        } else if (followers !== 'all') {
            sortCriteria.followers = followers === 'asc' ? 1 : -1;
        } else if (following !== 'all') {
            sortCriteria.following = following === 'asc' ? 1 : -1;
        } else if (roles) {
            sortCriteria['roles.0'] = 1;
        }

        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'roles',
                    localField: 'roles',
                    foreignField: '_id',
                    as: 'roles',
                },
            },
            {
                $lookup: {
                    from: 'follows',
                    localField: '_id',
                    foreignField: 'following',
                    as: 'followers',
                },
            },
            {
                $lookup: {
                    from: 'follows',
                    localField: '_id',
                    foreignField: 'follower',
                    as: 'following',
                },
            },
            {
                $lookup: {
                    from: 'answers',
                    let: { userId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
                        { $lookup: { from: 'questions', localField: 'questionId', foreignField: '_id', as: 'question' } },
                        { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: null,
                                totalCoins: { $sum: { $ifNull: ['$question.coins', 0] } },
                            },
                        },
                    ],
                    as: 'coins',
                },
            },
            {
                $project: {
                    _id: 1,
                    bio: 1,
                    block: 1,
                    email: 1,
                    image: 1,
                    lastname: 1,
                    username: 1,
                    firstname: 1,
                    isVerified: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    roles: {
                        $map: {
                            input: '$roles',
                            as: 'role',
                            in: {
                                id: { $toString: '$$role._id' },
                                name: '$$role.name',
                            },
                        },
                    },
                    totalCoins: { $ifNull: [{ $arrayElemAt: ['$coins.totalCoins', 0] }, 0] },
                    followers: { $size: '$followers' },
                    following: { $size: '$following' },
                },
            },
            ...(Object.keys(sortCriteria).length ? [{ $sort: sortCriteria }] : []),
            { $skip: (page - 1) * limit },
            { $limit: limit },
        ];

        try {
            const [result, total, rolesList] = await Promise.all([
                this.userModel.aggregate(pipeline).exec(),
                this.userModel.countDocuments(query),
                this.roleModel.find().select('_id name').lean(),
            ]);

            if (!result.length) {
                return {
                    success: true,
                    users: [],
                    total: 0,
                    currentPage: page,
                    totalPages: 0,
                    roles: rolesList.map((r) => ({ id: r._id, name: r.name })),
                };
            }

            const formattedUsers = result.map((user) => ({
                ...this.formatUser(user),
                totalCoins: this.roundingNumbers(user.totalCoins || 0),
                followers: this.roundingNumbers(user.followers || 0),
                following: this.roundingNumbers(user.following || 0),
                roles: user.roles,
            }));

            return {
                total,
                page: page,
                limit: limit,
                success: true,
                users: formattedUsers,
                totalPages: Math.ceil(total / limit),
                roles: rolesList.map((r) => ({ id: r._id.toString(), name: r.name })),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch users', HttpStatus.BAD_REQUEST);
        }
    }

    async deleteMultiple(ids: string[]): Promise<{ message: string; deletedCount: number }> {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new HttpException('IDs must be a non-empty array', HttpStatus.BAD_REQUEST);
        }

        const objectIds = ids.reduce((acc: Types.ObjectId[], id: string) => {
            if (Types.ObjectId.isValid(id)) {
                acc.push(new Types.ObjectId(id));
            }
            return acc;
        }, []);

        if (objectIds.length === 0) {
            throw new HttpException('No valid ObjectIds provided', HttpStatus.BAD_REQUEST);
        }

        try {
            const result = await this.userModel.deleteMany({ _id: { $in: objectIds } }).lean().exec();

            if (result.deletedCount === 0) {
                throw new HttpException('No permissions found to delete', HttpStatus.NOT_FOUND);
            }

            return {
                message: `${result.deletedCount} permission(s) deleted successfully`,
                deletedCount: result.deletedCount,
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to delete roles', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}