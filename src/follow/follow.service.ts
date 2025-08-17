import { Model, Types } from 'mongoose';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Follow, FollowDocument } from './dto/follow.schema';
import { User, UsersDocument } from '../users/dto/users.schema';
import { FollowUserReq, GetUserFollowStatsReq } from './dto/follow.dto';

@Injectable()
export class FollowService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UsersDocument>,
        @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    ) { }

    private validateIds(...ids: string[]): void {
        ids.forEach(id => {
            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                throw new HttpException('Invalid ID format', HttpStatus.BAD_REQUEST);
            }
        });
    }

    async followUser(followerId: string, followingId: string): Promise<FollowUserReq> {
        try {
            this.validateIds(followerId, followingId);

            if (followerId === followingId) {
                throw new HttpException('You cannot follow yourself', HttpStatus.BAD_REQUEST);
            }

            const [follower, following] = await Promise.all([
                this.userModel.findById(followerId).select('following').lean(),
                this.userModel.findById(followingId).select('followers').lean(),
            ]);

            if (!follower || !following) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            const isAlreadyFollowing = await this.followModel.exists({
                follower: new Types.ObjectId(followerId),
                following: new Types.ObjectId(followingId)
            });

            if (isAlreadyFollowing) {
                throw new HttpException('Already following this user', HttpStatus.CONFLICT);
            }

            await this.followModel.create([{ follower: new Types.ObjectId(followerId), following: new Types.ObjectId(followingId) }]);

            await Promise.all([
                this.userModel.findByIdAndUpdate(followerId, { $addToSet: { following: new Types.ObjectId(followingId) } }, { new: true }),
                this.userModel.findByIdAndUpdate(followingId, { $addToSet: { followers: new Types.ObjectId(followerId) } }, { new: true })
            ]);

            return {
                message: 'Successfully followed user',
                isFollowing: true
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to follow user', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async unfollowUser(followerId: string, followingId: string): Promise<FollowUserReq> {
        try {
            this.validateIds(followerId, followingId);

            const deletedFollow = await this.followModel.findOneAndDelete({ follower: new Types.ObjectId(followerId), following: new Types.ObjectId(followingId) });

            if (!deletedFollow) {
                throw new HttpException('Follow relationship not found', HttpStatus.NOT_FOUND);
            }

            await Promise.all([
                this.userModel.findByIdAndUpdate(followerId, { $pull: { following: new Types.ObjectId(followingId) } }, { new: true }),
                this.userModel.findByIdAndUpdate(followingId, { $pull: { followers: new Types.ObjectId(followerId) } }, { new: true })
            ]);

            return {
                message: 'Successfully unfollowed user',
                isFollowing: false
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to unfollow user', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async checkFollowStatus(followerId: string, followingId: string): Promise<boolean> {
        try {
            this.validateIds(followerId, followingId);
            const exists = await this.followModel.exists({ follower: new Types.ObjectId(followerId), following: new Types.ObjectId(followingId) });
            return !!exists;
        } catch (error) {
            throw new HttpException(error.message || 'Failed to check follow status', error.status || HttpStatus.BAD_REQUEST);
        }
    }

    async getUserFollowStats(userId: string): Promise<GetUserFollowStatsReq> {
        try {
            this.validateIds(userId);

            const user = await this.userModel.findById(userId).lean();
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            const [followerCount, followingCount, followerIds, followingIds] = await Promise.all([
                this.followModel.countDocuments({ following: new Types.ObjectId(userId) }),
                this.followModel.countDocuments({ follower: new Types.ObjectId(userId) }),
                this.followModel
                    .find({ following: new Types.ObjectId(userId) })
                    .select('follower')
                    .lean()
                    .then(follows => follows.map(f => f.follower)),
                this.followModel
                    .find({ follower: new Types.ObjectId(userId) })
                    .select('following')
                    .lean()
                    .then(follows => follows.map(f => f.following)),
            ]);

            const [followersDetails, followingDetails] = await Promise.all([
                this.userModel
                    .find({ _id: { $in: followerIds.map(id => new Types.ObjectId(id)) } })
                    .select('_id firstname lastname username image')
                    .lean(),
                this.userModel
                    .find({ _id: { $in: followingIds.map(id => new Types.ObjectId(id)) } })
                    .select('_id firstname lastname username image')
                    .lean(),
            ]);

            return {
                followingTotal: followingCount,
                following: followingDetails.map(user => ({
                    id: user._id.toString(),
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                    image: user.image,
                })),
                followerTotal: followerCount,
                follower: followersDetails.map(user => ({
                    id: user._id.toString(),
                    firstname: user.firstname,
                    lastname: user.lastname,
                    username: user.username,
                    image: user.image,
                })),
            };
        } catch (error) {
            throw new HttpException(error.message || 'Failed to fetch follow stats', error.status || HttpStatus.BAD_REQUEST);
        }
    }
}