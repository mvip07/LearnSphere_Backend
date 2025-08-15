import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as Mailgen from 'mailgen';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import { Model, Types } from 'mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

import { Role, RolesDocument } from 'src/roles/dto/roles.schema';
import { User, UsersDocument } from 'src/users/dto/users.schema';
import { UsersDto, LoginDto, ResetPasswordDto, SendVerificationCodeDto, ConfirmVerificationCodeDto, EmailData } from './dto/auth.dto';

import { google } from 'googleapis';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UsersDocument>,
        @InjectModel(Role.name) private readonly roleModel: Model<RolesDocument>,
    ) { }

    private generateResetToken(): { token: string; expiresAt: Date } {
        return {
            token: crypto.randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        };
    }

    private generateVerificationCode(): { code: string; expiresAt: Date } {
        return {
            code: crypto.randomInt(100000, 999999).toString(),
            expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        };
    }

    async sendEmailMessage(user: UsersDocument, resObj: any, msgSub: string) {
        try {
            const config = {
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            };

            const transporter = nodemailer.createTransport(config);

            const mailGenerator = new Mailgen({
                theme: 'cerberus',
                product: {
                    name: 'Quiz App',
                    link: process.env.FRONTEND_URL,
                },
            });

            const response = {
                body: {
                    name: `${user.firstname} ${user.lastname}`,
                    subject: resObj.subject,
                    intro: resObj.intro,
                    action: {
                        instructions: resObj.instructions,
                        button: {
                            color: resObj.color,
                            text: resObj.text,
                            link: resObj.link,
                        },
                    },
                },
            };

            const mail = mailGenerator.generate(response);
            const message = {
                html: mail,
                to: user.email,
                subject: msgSub,
                from: process.env.EMAIL_USER,
            };

            await transporter.sendMail(message);
        } catch (error) {
            throw new HttpException('Failed to send email', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async handleGoogle(code: string, res: Response) {
        const client = new google.auth.OAuth2({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: 'postmessage',
        });

        try {
            const { tokens } = await client.getToken(code);
            client.setCredentials(tokens);

            const oauth2 = google.oauth2({
                auth: client,
                version: 'v2',
            });

            const { data } = await oauth2.userinfo.get();

            const newUser = {
                email: data.email,
                username: data.email.split('@')[0],
                firstname: data.given_name || 'Unknown',
                lastname: data.family_name || 'Unknown',
                image: data.picture || process.env.DEFAULT_USER_IMAGE,
            };

            const existingEmail = await this.userModel.findOne({ email: newUser.email })

            if (existingEmail) {
                if (!existingEmail.isVerified) {
                    const verificationCode = crypto.randomInt(100000, 999999).toString();
                    const verificationExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

                    existingEmail.verificationCode = verificationCode;
                    existingEmail.verificationExpiresAt = verificationExpiresAt;

                    await existingEmail.save()

                    const mailData = {
                        color: '#8A33FD',
                        text: 'Verify Email',
                        intro: 'Welcome to Quiz App!',
                        subject: `Your verification code is ${verificationCode}`,
                        link: `${process.env.FRONTEND_URL}/en/auth/verification/${existingEmail.email}`,
                        instructions: `Please use the following code to verify your email: <h2>${verificationCode}</h2>. This code expires in 3 minutes.`,
                    };

                    await this.sendEmailMessage(existingEmail, mailData, 'Verify Your Email');

                    return res.json({ redirect: true, url: `/auth/verification/${existingEmail.email}`, verificationExpiresAt });
                }

                if (existingEmail.block) {
                    throw new HttpException('Account is blocked', HttpStatus.FORBIDDEN);
                }

                const token = jwt.sign(
                    {
                        userId: existingEmail._id,
                        email: existingEmail.email,
                        roles: existingEmail.roles.map((r: any) => r._id.toString()),
                    },
                    process.env.JWT_SECRET, { expiresIn: '1d' },
                );

                return res.json({
                    login: true,
                    redirect: true,
                    status: 'success',
                    message: 'Login Successful',
                    url: `/cabinet`,
                    user: {
                        token,
                        email: existingEmail.email,
                        userId: existingEmail._id.toString(),
                        firstname: existingEmail.firstname,
                        lastname: existingEmail.lastname,
                        username: existingEmail.username,
                    },
                });
            }

            const role = await this.roleModel.findOne({ name: 'User' }).lean();
            if (!role) {
                throw new HttpException('Default role not found', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const verificationCode = crypto.randomInt(100000, 999999).toString();
            const verificationExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

            const user = await this.userModel.create({
                ...newUser,
                block: false,
                password: null,
                verificationCode,
                isVerified: false,
                authMethod: "google",
                verificationExpiresAt,
                roles: [new Types.ObjectId(role._id)],
            });

            const mailData = {
                color: '#8A33FD',
                text: 'Verify Email',
                intro: 'Welcome to Quiz App!',
                subject: `Your verification code is ${verificationCode}`,
                link: `${process.env.FRONTEND_URL}/en/auth/verification/${newUser.email}`,
                instructions: `Please use the following code to verify your email: <h2>${verificationCode}</h2>. This code expires in 3 minutes.`,
            };

            await this.sendEmailMessage(user, mailData, 'Verify Your Email');

            return { message: 'Registration successful. Please verify your email.', verificationExpiresAt };
        } catch (error) {
            throw new HttpException('Google authentication failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async register(data: UsersDto) {
        try {
            const { firstname, lastname, email, username, password, confirmPassword } = data;

            const [existingEmail, existingUsername] = await Promise.all([
                this.userModel.findOne({ email }).lean(),
                this.userModel.findOne({ username }).lean(),
            ]);

            if (existingEmail) {
                throw new HttpException('Email already exists', HttpStatus.CONFLICT);
            }
            if (existingUsername) {
                throw new HttpException('Username already exists', HttpStatus.CONFLICT);
            }
            if (password !== confirmPassword) {
                throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
            }

            const role = await this.roleModel.findOne({ name: 'User' }).lean();
            if (!role) {
                throw new HttpException('Default role not found', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const verificationCode = crypto.randomInt(100000, 999999).toString();
            const verificationExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

            const user = await this.userModel.create({
                email,
                lastname,
                username,
                firstname,
                verificationCode,
                authMethod: "form",
                verificationExpiresAt,
                password: hashedPassword,
                roles: [new Types.ObjectId(role._id)],
            });

            const mailData = {
                color: '#8A33FD',
                text: 'Verify Email',
                intro: 'Welcome to Quiz App!',
                subject: `Your verification code is ${verificationCode}`,
                link: `${process.env.FRONTEND_URL}/en/auth/verification/${email}`,
                instructions: `Please use the following code to verify your email: <h2>${verificationCode}</h2>. This code expires in 3 minutes.`,
            };

            await this.sendEmailMessage(user, mailData, 'Verify Your Email');

            return { message: 'Registration successful. Please verify your email.', verificationExpiresAt };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to register user', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async login(data: LoginDto) {
        try {
            const { email, password } = data;

            const user = await this.userModel.findOne({ email }).select('password isVerified block roles email firstname lastname username').populate('roles', '_id').lean().exec();

            if (!user) {
                throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
            }

            if (!user.password) {
                const { token: resetToken, expiresAt: resetTokenExpiresAt } = this.generateResetToken();
                await this.userModel.updateOne({ email }, { resetToken, resetTokenExpiresAt });

                const resetLink = `${process.env.FRONTEND_URL}/en/auth/new-password/${resetToken}`;
                const mailData: EmailData = {
                    link: resetLink,
                    color: '#8A33FD',
                    text: 'Reset Password',
                    subject: 'Reset Your Password',
                    instructions: 'Click the button to reset your password.',
                    intro: 'You have requested a password reset. This link expires in 15 minutes.',
                };

                await this.sendEmailMessage(user as UsersDocument, mailData, 'Reset Your Password');

                return {
                    redirect: true,
                    url: resetLink,
                    setPassword: true,
                    status: 'success',
                    message: 'This account is registered via Google. Please set a password.',
                };
            }

            if (!(await bcrypt.compare(password, user.password))) {
                throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
            }

            if (!user.isVerified) {
                const { code: verificationCode, expiresAt: verificationExpiresAt } = this.generateVerificationCode();
                await this.userModel.updateOne({ email }, { verificationCode, verificationExpiresAt });

                const verifyLink = `${process.env.FRONTEND_URL}/en/auth/verification/${user.email}`;
                const mailData: EmailData = {
                    color: '#8A33FD',
                    text: 'Verify Email',
                    intro: 'Welcome to Quiz App!',
                    subject: `Your verification code is ${verificationCode}`,
                    link: verifyLink,
                    instructions: `Please use the following code to verify your email: <h2>${verificationCode}</h2>. This code expires in 3 minutes.`,
                };

                await this.sendEmailMessage(user as UsersDocument, mailData, 'Verify Your Email');

                return {
                    redirect: true,
                    url: verifyLink,
                    status: 'success',
                    verificationExpiresAt,
                    message: 'Please verify your email.',
                };
            }

            if (user.block) {
                throw new HttpException('Account is blocked', HttpStatus.FORBIDDEN);
            }

            const token = jwt.sign(
                { userId: user._id, email: user.email, roles: user.roles.map((r: any) => r._id.toString()) },
                process.env.JWT_SECRET, { expiresIn: '1d' },
            );

            return {
                redirect: true,
                status: 'success',
                url: `${process.env.FRONTEND_URL}/en/cabinet`,
                message: 'Login Successful',
                user: {
                    token,
                    email: user.email,
                    userId: user._id.toString(),
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                },
            }
        }
        catch (error) {
            throw new HttpException(error.message || 'Failed to login user', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async forgotPassword(email: string) {
        try {
            const user = await this.userModel.findOne({ email }).lean();
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await this.userModel.updateOne(
                { email },
                { resetToken, resetTokenExpiresAt },
            );

            const resetLink = `${process.env.FRONTEND_URL}/en/auth/new-password/${resetToken}`;
            const mailData = {
                link: resetLink,
                color: '#8A33FD',
                text: 'Reset Password',
                subject: 'Reset Your Password',
                instructions: 'Click the button to reset your password.',
                intro: `You have requested a password reset. Click the button below to reset your password. This link expires in 15 minutes.`,
            };

            await this.sendEmailMessage(user, mailData, 'Reset Your Password');

            return { message: 'Password reset link sent to your email' };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to send reset link', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async resetPassword(body: ResetPasswordDto, token: string) {
        try {
            const { password, confirmPassword } = body;

            if (password !== confirmPassword) {
                throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
            }

            const user = await this.userModel.findOne({
                resetToken: token,
                resetTokenExpiresAt: { $gt: new Date() },
            });

            if (!user) {
                throw new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST);
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            user.password = hashedPassword;
            user.resetToken = null;
            user.resetTokenExpiresAt = null;
            await user.save();

            return { message: 'Password reset successful' };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to reset password', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async sendVerificationCode(data: SendVerificationCodeDto) {
        try {
            const { email } = data;

            const user = await this.userModel.findOne({ email }).lean();
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            const verificationCode = crypto.randomInt(100000, 999999).toString();
            const verificationExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

            await this.userModel.updateOne({ email }, { verificationCode, verificationExpiresAt },);

            const mailData = {
                color: '#8A33FD',
                text: 'Verify Email',
                intro: 'Welcome to Quiz App!',
                subject: `Your verification code is ${verificationCode}`,
                link: `${process.env.FRONTEND_URL}/en/auth/verification/${email}`,
                instructions: `Please use the following code to verify your email: <h2>${verificationCode}</h2>. This code expires in 3 minutes.`,
            };

            await this.sendEmailMessage(user, mailData, 'Verify Your Email');

            return { message: 'Verification code sent to your email', verificationExpiresAt };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to send verification code', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async confirmVerificationCode(body: ConfirmVerificationCodeDto) {
        try {
            const { email, verificationcode } = body;

            const user = await this.userModel.findOne({ email });
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            if (user.verificationCode !== verificationcode || !user.verificationExpiresAt || new Date() > user.verificationExpiresAt) {
                throw new HttpException('Invalid or expired verification code', HttpStatus.BAD_REQUEST);
            }

            user.isVerified = true;
            user.verificationCode = null;
            user.verificationExpiresAt = null;
            await user.save();

            const token = jwt.sign(
                { userId: user._id, email: user.email, roles: user.roles.map((r: any) => r._id.toString()) }, process.env.JWT_SECRET, { expiresIn: '1d' },
            );

            return {
                redirect: true,
                status: "success",
                url: process.env.FRONTEND_URL + "/cabinet",
                message: 'You have successfully verified your email and are logged in.',
                user: {
                    token,
                    email: user.email,
                    userId: user._id.toString(),
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                },
            };

        } catch (error) {
            throw new HttpException(error.message || 'Failed to verify code', error.status || HttpStatus.BAD_REQUEST);
        }
    }
}