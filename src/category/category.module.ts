import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category, CategorySchema } from './dto/category.schema';
import { User, UserSchema } from 'src/users/dto/users.schema';
import { Role, RoleSchema } from 'src/roles/dto/roles.schema';
import { Permission, PermissionSchema } from 'src/permissions/dto/permissions.schema';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthGuard } from 'src/guards/auth.guard';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Category.name, schema: CategorySchema },
            { name: User.name, schema: UserSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Permission.name, schema: PermissionSchema },
        ]),
        JwtModule.register({ secret: 'JWT_SECRET' }),
    ],
    controllers: [CategoryController],
    providers: [CategoryService, AuthGuard, RolesGuard],
})
export class CategoryModule { }
