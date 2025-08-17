import { Controller, Delete, Get, Param, Post, HttpStatus, HttpCode, ValidationPipe, UsePipes, UseGuards } from '@nestjs/common';
import { FollowService } from './follow.service';
import { RolesGuard } from '../guards/roles.guard';
import { AuthGuard } from '../guards/auth.guard';

@Controller('follow')
@UseGuards(AuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FollowController {
    constructor(private readonly followService: FollowService) { }

    @Post(':followerId/:followingId')
    @HttpCode(HttpStatus.CREATED)
    async followUser(@Param('followerId') followerId: string, @Param('followingId') followingId: string) {
        return this.followService.followUser(followerId, followingId);
    }

    @Delete(':followerId/:followingId')
    @HttpCode(HttpStatus.OK)
    async unfollowUser(@Param('followerId') followerId: string, @Param('followingId') followingId: string) {
        return this.followService.unfollowUser(followerId, followingId);
    }

    @Get('status/:followerId/:followingId')
    @HttpCode(HttpStatus.OK)
    async checkFollowStatus(@Param('followerId') followerId: string, @Param('followingId') followingId: string) {
        return { isFollowing: await this.followService.checkFollowStatus(followerId, followingId) };
    }

    @Get(':userId/follow-stats')
    @HttpCode(HttpStatus.OK)
    async getFollowStats(@Param('userId') userId: string) {
        return this.followService.getUserFollowStats(userId);
    }
}