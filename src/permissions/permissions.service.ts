import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Permission, PermissionsDocument } from './dto/permissions.schema';
import { ChangeHistory, FindAllQueryDto, PermissionDto, UpdatePermissionDto } from './dto/permissions.dto';

@Injectable()
export class PermissionsService {
    constructor(@InjectModel(Permission.name) private readonly permissionModel: Model<PermissionsDocument>) { }

    private formatPermission(permission: PermissionsDocument) {
        return {
            id: permission._id.toString(),
            name: permission.name,
            path: permission.path,
            createdAt: permission.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: permission.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
        };
    }

    async create(data: PermissionDto) {
        try {
            const { name, path } = data;
            const existingPermission = await this.permissionModel.findOne({ $or: [{ name: name.trim() }, { path: path.trim() }] }).lean();
            if (existingPermission) {
                throw new HttpException(`Permission with name "${name}" or path "${path}" already exists`, HttpStatus.CONFLICT);
            }

            const newPermission = await this.permissionModel.create({
                name: name.trim(),
                path: path.trim(),
            });
            return { permission: this.formatPermission(newPermission), message: "Permission created successfully" };
        } catch (error) {
            if (error.code === 11000) {
                throw new HttpException(`Path "${data.path}" already exists`, HttpStatus.CONFLICT);
            }
            throw new HttpException(error.message || 'Failed to create permission', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async findAll({ page = 1, limit = 5, search = '' }: FindAllQueryDto) {
        try {
            const skip = (page - 1) * limit;

            const query = search ? {
                $or: [
                    { name: { $regex: new RegExp(search, 'i') } },
                    { path: { $regex: new RegExp(search, 'i') } },
                ],
            } : {};

            const [permissions, total] = await Promise.all([
                this.permissionModel.find(query).skip(skip).limit(limit).select('name path createdAt updatedAt').lean(),
                this.permissionModel.countDocuments(query),
            ]);

            const formattedPermissions = permissions.map((permission) => this.formatPermission(permission as any));

            return {
                total,
                page: page,
                limit: limit,
                permissions: formattedPermissions,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch permissions', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async findById(id: string) {
        try {
            const permission = await this.permissionModel.findById(id).select('name path createdAt updatedAt').lean();

            if (!permission) {
                throw new HttpException('Permission not found', HttpStatus.NOT_FOUND);
            }

            return { permission: this.formatPermission(permission) };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch permission', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async update(id: string, body: UpdatePermissionDto) {
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpException('Invalid permission ID', HttpStatus.BAD_REQUEST);
        }

        if (!body.name && !body.path) {
            throw new HttpException('At least one field (name or path) must be provided', HttpStatus.BAD_REQUEST);
        }

        const trimmedData: UpdatePermissionDto = {
            ...(body.name && { name: body.name.trim() }),
            ...(body.path && { path: body.path.trim() }),
        };

        try {
            if (trimmedData.name || trimmedData.path) {
                const duplicateQuery = {
                    $or: [
                        ...(trimmedData.name ? [{ name: trimmedData.name }] : []),
                        ...(trimmedData.path ? [{ path: trimmedData.path }] : []),
                    ],
                    _id: { $ne: new Types.ObjectId(id) },
                };
                const existingPermission = await this.permissionModel.findOne(duplicateQuery).lean();
                if (existingPermission) {
                    const conflictField = existingPermission.name === trimmedData.name ? 'name' : 'path';
                    throw new HttpException( `Permission with ${conflictField} "${trimmedData[conflictField]}" already exists`, HttpStatus.CONFLICT);
                }
            }

            const currentPermission = await this.permissionModel.findById(id).lean();
            if (!currentPermission) {
                throw new HttpException('Permission not found', HttpStatus.NOT_FOUND);
            }

            const changeHistory: ChangeHistory[] = [];
            let hasChanges = false;

            if (trimmedData.name && trimmedData.name !== currentPermission.name) {
                changeHistory.push({
                    field: 'name',
                    oldValue: currentPermission.name,
                    newValue: trimmedData.name,
                    changedAt: new Date(),
                });
                hasChanges = true;
            }

            if (trimmedData.path && trimmedData.path !== currentPermission.path) {
                changeHistory.push({
                    field: 'path',
                    oldValue: currentPermission.path,
                    newValue: trimmedData.path,
                    changedAt: new Date(),
                });
                hasChanges = true;
            }

            if (!hasChanges) {
                return {
                    permission: this.formatPermission(currentPermission as any),
                    message: 'No changes detected',
                    changed: false,
                };
            }

            const updateData: Partial<Permission> = {
                ...trimmedData,
                changeHistory: [...(currentPermission.changeHistory || []), ...changeHistory],
                updatedAt: new Date(),
            };

            const updatedPermission = await this.permissionModel
                .findByIdAndUpdate(
                    id,
                    { $set: updateData },
                    { new: true, runValidators: true }
                )
                .select('name path createdAt updatedAt')
                .exec();

            if (!updatedPermission) {
                throw new HttpException('Permission not found', HttpStatus.NOT_FOUND);
            }

            return {
                permission: this.formatPermission(updatedPermission),
                message: 'Permission updated successfully',
                changed: true,
            };
        } catch (error) {
            if (error.code === 11000) {
                throw new HttpException(`Path "${trimmedData.path}" already exists`, HttpStatus.CONFLICT);
            }
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map((err: any) => err.message);
                throw new HttpException(errors.join(', '), HttpStatus.BAD_REQUEST);
            }
            throw new HttpException(error.message || 'Failed to update permission', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async delete(id: string) {
        try {
            const role = await this.permissionModel.findByIdAndDelete(id).lean();
            if (!role) {
                throw new HttpException('Permission not found', HttpStatus.NOT_FOUND);
            }
            return { message: 'Permission deleted successfully' };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to delete permission', error.status || HttpStatus.BAD_REQUEST);
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
            const result = await this.permissionModel.deleteMany({ _id: { $in: objectIds } }).lean().exec();

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