import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Role, RolesDocument } from './dto/roles.schema';
import { Permission, PermissionsDocument } from '../permissions/dto/permissions.schema';
import { RolesDto, UpdateRolesDto, ChangeHistory, FindAllQueryDto } from './dto/roles.dto';

@Injectable()
export class RolesService {
    constructor(
        @InjectModel(Role.name) private readonly roleModel: Model<RolesDocument>,
        @InjectModel(Permission.name) private readonly permissionModel: Model<PermissionsDocument>,
    ) { }

    private formatRole(role: any) {
        return {
            id: role._id.toString(),
            name: role.name,
            permissions: role.permissions
                ? role.permissions.map((p: PermissionsDocument) => ({
                    name: p.name,
                    path: p.path,
                    id: p._id.toString(),
                }))
                : [],
            createdAt: role.createdAt?.toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: role.updatedAt?.toISOString().slice(0, 19).replace('T', ' '),
        };
    }

    private checkForChanges(role: Role, data: UpdateRolesDto): boolean {
        if (data.name && data.name !== role.name) {
            return true;
        }
        if (data.permissions && (data.permissions.length !== role.permissions.length || !data.permissions.every((id) => role.permissions.some((perm) => perm._id.toString() === id)))) {
            return true;
        }
        return false;
    }

    private checkForChangesPermission(role: Role, permissions: string[]): boolean {
        return (
            permissions.length !== role.permissions.length ||
            !permissions.every((id) => role.permissions.some((perm) => perm._id.toString() === id))
        );
    }

    async create(body: RolesDto) {
        try {
            const { name, permissions } = body;

            const [existingRole, foundPermissions] = await Promise.all([
                this.roleModel.findOne({ name: name.trim() }).lean(),
                this.permissionModel.find({ _id: { $in: permissions } }).lean(),
            ]);

            if (existingRole) {
                throw new HttpException(`Role with name "${name}" already exists`, HttpStatus.CONFLICT);
            }

            if (foundPermissions.length !== permissions.length) {
                const foundIds = foundPermissions.map((p) => p._id.toString());
                const notFoundIds = permissions.filter((id) => !foundIds.includes(id));
                throw new HttpException(`Some permissions not found: ${notFoundIds.join(', ')}`, HttpStatus.BAD_REQUEST);
            }

            const role = await this.roleModel.create({
                name: name.trim(),
                permissions: permissions.map((id) => new Types.ObjectId(id)),
            });

            const populated = await role.populate({ path: 'permissions', select: 'name path' });
            return { role: this.formatRole(populated), message: "Role created successfully" };
        } catch (error) {
            if (error.code === 11000) {
                throw new HttpException(`Role with name "${body.name}" already exists`, HttpStatus.CONFLICT);
            }
            throw new HttpException(error.message || 'Failed to create role', error.status || HttpStatus.BAD_REQUEST,);
        }
    }

    async findAll({ page = 1, limit = 5, search = '' }: FindAllQueryDto) {
        try {
            const skip = (page - 1) * limit;

            const query = search ? { name: { $regex: new RegExp(search, 'i') } } : {};

            const [roles, total, allPermissions] = await Promise.all([
                this.roleModel.find(query).skip(skip).limit(limit).populate({ path: 'permissions', select: 'name path' }).lean(),
                this.roleModel.countDocuments(query),
                this.permissionModel.find().select('name path').lean(),
            ]);

            const formattedRoles = roles.map((role) => this.formatRole(role));
            const formattedPermissions = allPermissions.map((p) => ({
                id: p._id.toString(),
                name: p.name,
                path: p.path,
            }));

            return {
                total,
                page: page,
                limit: limit,
                roles: formattedRoles,
                permissions: formattedPermissions,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch roles', error.status || HttpStatus.BAD_REQUEST,);
        }
    }

    async findById(id: string) {
        try {
            const role = await this.roleModel.findById(id).populate({ path: 'permissions', select: 'name path' }).lean();
            if (!role) {
                throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
            }
            return { role: this.formatRole(role), message: "Role getted successfully" };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch role', error.status || HttpStatus.BAD_REQUEST,);
        }
    }

    async update(id: string, body: UpdateRolesDto): Promise<{ role: Partial<Role>; message: string; changed: boolean }> {
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpException('Invalid role ID', HttpStatus.BAD_REQUEST);
        }

        if (!body.name && !body.permissions) {
            throw new HttpException('At least one field (name or permissions) must be provided', HttpStatus.BAD_REQUEST);
        }

        const role = await this.roleModel.findById(id).lean().exec();
        if (!role) {
            throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
        }

        const hasChanges = this.checkForChanges(role, body);
        if (!hasChanges) {
            return { role: this.formatRole(role), message: 'No changes detected', changed: false };
        }

        try {
            if (body.name && body.name !== role.name) {
                const existingRole = await this.roleModel.findOne({ _id: { $ne: id }, name: body.name }).lean().exec();
                if (existingRole) {
                    throw new HttpException(`Role with name "${body.name}" already exists`, HttpStatus.CONFLICT);
                }
            }

            if (body.permissions) {
                const permissionCount = await this.permissionModel.countDocuments({ _id: { $in: body.permissions } }).exec();
                if (permissionCount !== body.permissions.length) {
                    throw new HttpException('One or more permissions are invalid', HttpStatus.BAD_REQUEST);
                }
            }

            const changeHistory: ChangeHistory[] = [];
            if (body.name && body.name !== role.name) {
                changeHistory.push({
                    field: 'name',
                    oldValue: role.name,
                    newValue: body.name,
                    changedAt: new Date(),
                });
            }
            if (body.permissions &&
                (body.permissions.length !== role.permissions.length ||
                    !body.permissions.every((id) => role.permissions.some((perm) => perm._id.toString() === id)))) {
                changeHistory.push({
                    field: 'permissions',
                    oldValue: role.permissions.map((perm) => perm._id.toString()),
                    newValue: body.permissions,
                    changedAt: new Date(),
                });
            }

            const updateData: Partial<Role> = {
                ...(body.name && { name: body.name }),
                ...(body.permissions && { permissions: body.permissions.map((id) => new Types.ObjectId(id)) }),
                ...(changeHistory.length > 0 && { changeHistory: [...(role.changeHistory || []), ...changeHistory] }),
                updatedAt: new Date(),
            };

            const updatedRole = await this.roleModel
                .findByIdAndUpdate(
                    id,
                    { $set: updateData },
                    { new: true, runValidators: true, lean: true },
                )
                .populate({ path: 'permissions', select: 'name path' })
                .exec();

            if (!updatedRole) {
                throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
            }

            return { role: this.formatRole(updatedRole), message: 'Role updated successfully', changed: true };
        } catch (error) {
            if (error.code === 11000) {
                throw new HttpException(`Role with name "${body.name}" already exists`, HttpStatus.CONFLICT);
            }
            throw new HttpException(error.message || 'Failed to update role', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async updatePermissionInRole(id: string, permissions: string[]): Promise<{ role: Partial<Role>; message: string; changed: boolean }> {
        if (!Types.ObjectId.isValid(id)) {
            throw new HttpException('Invalid role ID', HttpStatus.BAD_REQUEST);
        }

        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
            throw new HttpException('Permissions must be a non-empty array', HttpStatus.BAD_REQUEST);
        }

        try {
            const [role, permissionCount] = await Promise.all([
                this.roleModel.findById(id).lean().exec(),
                this.permissionModel.countDocuments({ _id: { $in: permissions } }).exec(),
            ]);

            if (!role) {
                throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
            }

            if (permissionCount !== permissions.length) {
                throw new HttpException('One or more permissions are invalid', HttpStatus.BAD_REQUEST);
            }

            const hasChanges = this.checkForChangesPermission(role, permissions);
            if (!hasChanges) {
                return { role: this.formatRole(role), message: 'No changes detected', changed: false };
            }

            const changeHistory: ChangeHistory[] = [
                {
                    field: 'permissions',
                    oldValue: role.permissions.map((perm) => perm._id.toString()),
                    newValue: permissions,
                    changedAt: new Date(),
                },
            ];

            const updateData: Partial<Role> = {
                permissions: permissions.map((id) => new Types.ObjectId(id)),
                changeHistory: [...(role.changeHistory || []), ...changeHistory],
                updatedAt: new Date(),
            };

            const updatedRole = await this.roleModel
                .findByIdAndUpdate(
                    id,
                    { $set: updateData },
                    { new: true, runValidators: true, lean: true },
                )
                .populate({ path: 'permissions', select: 'name path' })
                .exec();

            if (!updatedRole) {
                throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
            }

            return { role: this.formatRole(updatedRole), message: 'Role permissions updated successfully', changed: true };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to update role permissions', error.status || HttpStatus.INTERNAL_SERVER_ERROR,);
        }
    }

    async delete(id: string) {
        try {
            const role = await this.roleModel.findByIdAndDelete(id).lean();
            if (!role) {
                throw new HttpException('Role not found', HttpStatus.NOT_FOUND);
            }
            return { message: 'Role deleted successfully' };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to delete role', error.status || HttpStatus.BAD_REQUEST,);
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
            const result = await this.roleModel.deleteMany({ _id: { $in: objectIds } }).lean().exec();

            if (result.deletedCount === 0) {
                throw new HttpException('No roles found to delete', HttpStatus.NOT_FOUND);
            }

            return {
                deletedCount: result.deletedCount,
                message: `${result.deletedCount} role(s) deleted successfully`,
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to delete roles', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}