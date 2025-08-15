import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FindAllQueryDto, LevelDto, UpdateLevelDto } from './dto/level.dto';
import { Level, LevelDocument } from './dto/level.schema';

@Injectable()
export class LevelService {
    constructor(@InjectModel(Level.name) private readonly levelModel: Model<LevelDocument>) { }

    private formatLevel(level: LevelDocument) {
        return {
            title: level.title,
            id: level._id.toString(),
            createdAt: level.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: level.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
        };
    }

    async create(data: LevelDto): Promise<{ level: any; message: string }> {
        if (!data.title?.trim()) {
            throw new HttpException({ status: HttpStatus.BAD_REQUEST, errors: { title: ['Title is required and cannot be empty'] } }, HttpStatus.BAD_REQUEST,);
        }

        const trimmedData: LevelDto = {
            title: data.title.trim(),
        };

        try {
            const existingLevel = await this.levelModel.findOne({ title: trimmedData.title }).lean().exec();
            if (existingLevel) {
                throw new HttpException({ status: HttpStatus.CONFLICT, errors: { title: [`Title "${trimmedData.title}" already exists`] } }, HttpStatus.CONFLICT);
            }

            const newLevel = await this.levelModel.create({ title: trimmedData.title });

            return {
                level: this.formatLevel(newLevel),
                message: 'Level created successfully',
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(error.message || 'Failed to create level', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async findAll({ page = 1, limit = 5, search = '' }: FindAllQueryDto) {
        try {
            const skip: number = (page - 1) * limit;

            const query = search ? { title: { $regex: new RegExp(search, 'i') } } : {};

            const [levels, total] = await Promise.all([
                this.levelModel.find(query).skip(skip).limit(limit).select('title createdAt updatedAt').lean(),
                this.levelModel.countDocuments(query),
            ]);

            const formattedLevels = levels.map((level) => this.formatLevel(level as any));

            return {
                total,
                page: page,
                limit: limit,
                levels: formattedLevels,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch levels', error.status || HttpStatus.BAD_REQUEST,);
        }
    }

    async findById(id: string) {
        try {
            const level = await this.levelModel.findById(id).select('title createdAt updatedAt').lean();

            if (!level) {
                throw new HttpException('Level not found', HttpStatus.NOT_FOUND);
            }

            return this.formatLevel(level);
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch level', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async update(id: string, body: UpdateLevelDto): Promise<{ level: any; message: string; changed: boolean }> {
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpException('Invalid level ID', HttpStatus.BAD_REQUEST);
        }

        if (!body.title?.trim()) {
            throw new HttpException('Title is required and cannot be empty', HttpStatus.BAD_REQUEST);
        }

        const trimmedData: UpdateLevelDto = {
            title: body.title.trim(),
        };

        try {
            const existingLevel = await this.levelModel.findOne({ title: trimmedData.title, _id: { $ne: new Types.ObjectId(id) } }).lean().exec();

            if (existingLevel) {
                throw new HttpException(`Level with title "${trimmedData.title}" already exists`, HttpStatus.CONFLICT);
            }

            const updatedLevel = await this.levelModel
                .findByIdAndUpdate(
                    id,
                    {
                        $set: {
                            title: trimmedData.title,
                            updatedAt: new Date(),
                            $push: {
                                changeHistory: {
                                    $each: [
                                        {
                                            field: 'title',
                                            oldValue: (await this.levelModel.findById(id).lean())?.title,
                                            newValue: trimmedData.title,
                                            changedAt: new Date(),
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    { new: true, runValidators: true }
                )
                .select('title createdAt updatedAt changeHistory').lean().exec();

            if (!updatedLevel) {
                throw new HttpException('Level not found', HttpStatus.NOT_FOUND);
            }

            const hasChanges = updatedLevel.title !== (await this.levelModel.findById(id).lean())?.title;

            return {
                level: this.formatLevel(updatedLevel),
                message: hasChanges ? 'Level updated successfully' : 'No changes detected',
                changed: hasChanges,
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            if (error.code === 11000) {
                throw new HttpException(`Level with title "${trimmedData.title}" already exists`, HttpStatus.CONFLICT);
            }
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map((err: any) => err.message).join(', ');
                throw new HttpException(errors, HttpStatus.BAD_REQUEST);
            }
            throw new HttpException(error.message || 'Failed to update level', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async delete(id: string) {
        try {
            const level = await this.levelModel.findByIdAndDelete(id).lean();

            if (!level) {
                throw new HttpException('Level not found', HttpStatus.NOT_FOUND);
            }

            return { message: 'Level deleted successfully' };
        } catch (error) {
            throw new HttpException(
                error.message || 'Failed to delete level', error.status || HttpStatus.BAD_REQUEST,);
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
            const result = await this.levelModel.deleteMany({ _id: { $in: objectIds } }).lean().exec();

            if (result.deletedCount === 0) {
                throw new HttpException('No levels found to delete', HttpStatus.NOT_FOUND);
            }

            return {
                message: `${result.deletedCount} level(s) deleted successfully`,
                deletedCount: result.deletedCount,
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to delete roles', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}