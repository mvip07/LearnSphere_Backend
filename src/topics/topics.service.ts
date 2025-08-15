import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Topic, TopicsDocument } from './dto/topics.schema';
import { Category, CategoryDocument } from 'src/category/dto/category.schema';
import { ChangeHistory, TopicsDto, TopicsQueryDto, UpdateTopicsDto } from './dto/topics.dto';

@Injectable()
export class TopicsService {
	constructor(
		@InjectModel(Topic.name) private readonly topicModel: Model<TopicsDocument>,
		@InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
	) { }

	private formatTopic(topic: any) {
		return {
			id: topic._id.toString(),
			title: topic.title,
			category: topic.categoryId
				? {
					title: topic.categoryId.title,
					image: topic.categoryId.image,
					id: topic.categoryId._id?.toString(),
				}
				: null,
			createdAt: topic.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
			updatedAt: topic.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
		};
	}

	private checkForChangesTopic(topic: TopicsDocument, data: UpdateTopicsDto): boolean {
		if (data.title && data.title.trim() !== topic.title) {
			return true;
		}
		if (data.categoryId && topic.categoryId?.toString() !== data.categoryId) {
			return true;
		}
		return false;
	}

	async create(data: TopicsDto) {
		const { title, categoryId } = data;

		try {
			const [existingTopic, categoryExists] = await Promise.all([
				this.topicModel.findOne({ title: title.trim(), categoryId: new Types.ObjectId(categoryId) }).lean(),
				this.categoryModel.findById(categoryId).lean(),
			]);

			if (existingTopic) {
				throw new HttpException({ status: HttpStatus.CONFLICT, errors: { title: [`Topic with title "${title}" already exists in this category`] } }, HttpStatus.CONFLICT);
			}

			if (!categoryExists) {
				throw new HttpException({ status: HttpStatus.NOT_FOUND, errors: { categoryId: ['Category not found'] } }, HttpStatus.NOT_FOUND);
			}

			const topic = await this.topicModel.create({ title: title.trim(), categoryId: new Types.ObjectId(categoryId) });

			const populated = await topic.populate({ path: 'categoryId', select: 'title image' });
			return { topic: this.formatTopic(populated), message: 'Topic created successfully' };
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}

			if (error.code === 11000) {
				throw new HttpException({ status: HttpStatus.CONFLICT, errors: { title: [`Topic with title "${title}" already exists in this category`] } }, HttpStatus.CONFLICT,);
			}

			throw new HttpException(error.message || 'Failed to create topic', error.status || HttpStatus.BAD_REQUEST,);
		}
	}

	async findAll({ page = 1, limit = 5, search = '', categoryId = '' }: Partial<TopicsQueryDto> = {}) {
		try {
			if (!Number.isInteger(page) || page < 1) {
				throw new HttpException('Page must be a positive integer', HttpStatus.BAD_REQUEST);
			}
			if (!Number.isInteger(limit) || limit < 1) {
				throw new HttpException('Limit must be a positive integer', HttpStatus.BAD_REQUEST);
			}

			const skip: number = (page - 1) * limit;

			const query: any = {};

			if (search) {
				query.title = { $regex: new RegExp(search, 'i') };
			}

			if (categoryId && categoryId !== 'all') {
				if (!Types.ObjectId.isValid(categoryId)) {
					throw new HttpException('Invalid categoryId', HttpStatus.BAD_REQUEST);
				}
				query.categoryId = new Types.ObjectId(categoryId);
			}

			const [topics, total, categories] = await Promise.all([
				this.topicModel.find(query).skip(skip).limit(limit).populate({ path: 'categoryId', select: 'title image' }).lean(),
				this.topicModel.countDocuments(query),
				this.categoryModel.find().select('title image').lean(),
			]);

			const formattedTopics = topics.map((topic) => this.formatTopic(topic));
			const formattedCategories = categories.map((category) => ({
				title: category.title,
				image: category.image,
				id: category._id.toString(),
			}));

			return {
				total,
				page: page,
				limit: limit,
				topics: formattedTopics,
				categories: formattedCategories,
				totalPages: Math.ceil(total / limit),
			};
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch topics', error.status || HttpStatus.BAD_REQUEST,);
		}
	}

	async findById(id: string) {
		try {
			const topic = await this.topicModel.findById(id).populate({ path: 'categoryId', select: 'title image' }).lean();

			if (!topic) {
				throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
			}
			return { topic: this.formatTopic(topic), message: "Category get successfully" };
		} catch (error) {
			throw new HttpException(error.message || 'Failed to fetch topic', error.status || HttpStatus.BAD_REQUEST,);
		}
	}

	async update(id: string, data: UpdateTopicsDto) {
		try {

			if (!Types.ObjectId.isValid(id)) {
				throw new HttpException('Invalid topic ID', HttpStatus.BAD_REQUEST);
			}

			const existingTopic = await this.topicModel.findById(id).lean();
			if (!existingTopic) {
				throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
			}

			if (data.categoryId && !Types.ObjectId.isValid(data.categoryId)) {
				throw new HttpException('Invalid category ID', HttpStatus.BAD_REQUEST);
			}

			if (data.title || data.categoryId) {
				const duplicate = await this.topicModel.findOne({ title: data.title?.trim() || existingTopic.title, categoryId: new Types.ObjectId(data.categoryId || existingTopic.categoryId), _id: { $ne: id } }).lean();

				if (duplicate) {
					throw new HttpException(`Topic with title "${data.title}" already exists in this category`, HttpStatus.CONFLICT);
				}
			}

			if (data.categoryId) {
				const categoryExists = await this.categoryModel.findById(data.categoryId).lean();
				if (!categoryExists) {
					throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
				}
			}

			const hasChanges = this.checkForChangesTopic(existingTopic, data);
			if (!hasChanges) {
				return {
					changed: false,
					message: 'No changes detected',
					topic: this.formatTopic(existingTopic),
				};
			}

			const changeHistory: ChangeHistory[] = [];
			if (data.title && data.title.trim() !== existingTopic.title) {
				changeHistory.push({
					field: 'title',
					oldValue: existingTopic.title,
					newValue: data.title.trim(),
					changedAt: new Date(),
				});
			}
			if (data.categoryId && data.categoryId !== existingTopic.categoryId.toString()) {
				changeHistory.push({
					field: 'categoryId',
					oldValue: existingTopic.categoryId.toString(),
					newValue: data.categoryId,
					changedAt: new Date(),
				});
			}

			const updateData: Partial<Topic> = {
				...(data.title && { title: data.title.trim() }),
				...(data.categoryId && { categoryId: new Types.ObjectId(data.categoryId) }),
				changeHistory: [...(existingTopic.changeHistory || []), ...changeHistory],
				updatedAt: new Date(),
			};

			const updatedTopic = await this.topicModel.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).populate({ path: 'categoryId', select: 'title image' }).lean();

			if (!updatedTopic) {
				throw new HttpException('Topic not found after update', HttpStatus.NOT_FOUND);
			}

			return {
				changed: true,
				topic: this.formatTopic(updatedTopic),
				message: 'Topic updated successfully',
			};

		} catch (error) {
			if (error.code === 11000) {
				throw new HttpException(`Topic with title "${data.title}" already exists`, HttpStatus.CONFLICT);
			}
			throw new HttpException(error.message || 'Failed to update topic', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

	async delete(id: string) {
		try {
			const topic = await this.topicModel.findByIdAndDelete(id).lean();
			if (!topic) {
				throw new HttpException('Topic not found', HttpStatus.NOT_FOUND);
			}
			return { message: 'Topic deleted successfully' };
		} catch (error) {
			throw new HttpException(error.message || 'Failed to delete topic', error.status || HttpStatus.BAD_REQUEST,);
		}
	}

	async deleteMultiple(ids: string[]) {
		try {
			if (!ids || !Array.isArray(ids) || ids.length === 0) {
				throw new HttpException('No IDs provided for deletion', HttpStatus.BAD_REQUEST);
			}

			const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
			if (!objectIds.length) {
				throw new HttpException('Invalid IDs provided', HttpStatus.BAD_REQUEST);
			}

			const result = await this.topicModel.deleteMany({ _id: { $in: objectIds } }).lean();

			if (result.deletedCount === 0) {
				throw new HttpException('No topics found to delete', HttpStatus.NOT_FOUND);
			}

			return {
				deletedCount: result.deletedCount,
				message: `${result.deletedCount} topic(s) deleted successfully`,
			};
		} catch (error) {
			throw new HttpException(error.message || 'Failed to delete topics', error.status || HttpStatus.BAD_REQUEST,);
		}
	}
}