import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Category, CategoryDocument } from './dto/category.schema';
import { CategoryDto, ChangeHistory, FindAllQueryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {

    constructor(@InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>) { }

    private formatCategory(category: CategoryDocument) {
        return {
            image: category.image,
            title: category.title,
            id: category._id.toString(),
            createdAt: category.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: category.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
        };
    }

    async create(data: CategoryDto & { image?: string }) {
        const title = data.title?.trim();
        const image = data.image;

        try {
            const existingCategory = await this.categoryModel.findOne({ title }).lean();
            if (existingCategory) {
                throw new HttpException({ status: HttpStatus.CONFLICT, errors: { title: [`Category with title "${title}" already exists`] } }, HttpStatus.CONFLICT);
            }

            const categoryData: Partial<Category> = {
                title,
                image,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const category = await this.categoryModel.create(categoryData);

            return {
                success: true,
                category: this.formatCategory(category),
                message: 'Category created successfully',
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            if (error.code === 11000) {
                throw new HttpException({ status: HttpStatus.CONFLICT, errors: { title: [`Category with title "${title}" already exists`] } }, HttpStatus.CONFLICT);
            }

            throw new HttpException(error.message || 'Failed to create category', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async findAll({ page = 1, limit = 5, search = '' }: FindAllQueryDto) {
        try {
            const skip: number = (page - 1) * limit;

            const query = search ? { title: { $regex: new RegExp(search, 'i') } } : {};

            const [categories, total] = await Promise.all([
                this.categoryModel.find(query).skip(skip).limit(limit).select('title image createdAt updatedAt').lean(),
                this.categoryModel.countDocuments(query),
            ]);

            const formattedCategories = categories.map((category) => this.formatCategory(category));

            return {
                total,
                page: page,
                limit: limit,
                categories: formattedCategories,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch categories', HttpStatus.BAD_REQUEST);
        }
    }

    async update(id: string, data: UpdateCategoryDto & { image?: string }) {
        try {
            if (!Types.ObjectId.isValid(id)) {
                throw new HttpException('Invalid category ID', HttpStatus.BAD_REQUEST);
            }

            const existingCategory = await this.categoryModel.findById(id).lean();
            if (!existingCategory) {
                throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
            }

            if (data.title) {
                const duplicate = await this.categoryModel.findOne({ title: data.title.trim(), _id: { $ne: id } }).lean();

                if (duplicate) {
                    throw new HttpException({ status: HttpStatus.CONFLICT, errors: { title: [`Category with title "${data.title}" already exists`] } }, HttpStatus.CONFLICT);
                }
            }

            const changeHistory: ChangeHistory[] = [];

            if (data.title && data.title.trim() !== existingCategory.title) {
                changeHistory.push({
                    field: 'title',
                    oldValue: existingCategory.title,
                    newValue: data.title.trim(),
                    changedAt: new Date(),
                });
            }

            if (data.image && data.image !== existingCategory.image) {
                changeHistory.push({
                    field: 'image',
                    oldValue: existingCategory.image,
                    newValue: data.image,
                    changedAt: new Date(),
                });
            }

            if (changeHistory.length === 0) {
                return {
                    changed: false,
                    message: 'No changes detected',
                    category: this.formatCategory(existingCategory)
                };
            }

            const updateData: any = {
                ...(data.title && { title: data.title.trim() }),
                ...(data.image && { image: data.image }),
                changeHistory: [...(existingCategory.changeHistory || []), ...changeHistory],
                updatedAt: new Date(),
            };

            const updatedCategory = await this.categoryModel
                .findByIdAndUpdate(id, { $set: updateData }, { new: true })
                .select('title image createdAt updatedAt')
                .lean();

            if (!updatedCategory) {
                throw new HttpException('Failed to update category', HttpStatus.BAD_REQUEST);
            }

            return {
                changed: true,
                message: 'Category successfully edited',
                category: this.formatCategory(updatedCategory),
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(error.message || 'Failed to update category', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
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

            const result = await this.categoryModel.deleteMany({ _id: { $in: objectIds } }).lean();

            if (result.deletedCount === 0) {
                throw new HttpException('No category found to delete', HttpStatus.NOT_FOUND);
            }

            return {
                deletedCount: result.deletedCount,
                message: `${result.deletedCount} category(ies) deleted successfully`,
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to delete category', error.status || HttpStatus.BAD_REQUEST,);
        }
    }

    // async findById(id: string) {
    //     try {
    //         const category = await this.categoryModel.findById(id).select('title image createdAt updatedAt').lean();
    //         if (!category) {
    //             throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    //         }
    //         return { category: this.formatCategory(category), message: "Category getted successfully" };
    //     } catch (error) {
    //         throw new HttpException(error.message || 'Failed to fetch category', error.status || HttpStatus.BAD_REQUEST);
    //     }
    // }

    // async delete(id: string) {
    //     try {
    //         const category = await this.categoryModel.findByIdAndDelete(id).lean();
    //         if (!category) {
    //             throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
    //         }
    //         return { message: 'Category successfully deleted' };
    //     } catch (error) {
    //         throw new HttpException(error.message || 'Failed to delete category', HttpStatus.BAD_REQUEST);
    //     }
    // }
}