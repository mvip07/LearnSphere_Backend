import { IsMongoId, IsNotEmpty } from 'class-validator';

export class FollowDto {
    @IsMongoId({ message: 'Invalid Follower ID format' })
    @IsNotEmpty({ message: 'Follower ID is required' })
    follower: string;

    @IsMongoId({ message: 'Invalid Following ID format' })
    @IsNotEmpty({ message: 'Following ID is required' })
    following: string;
}

export class FollowUserReq {
    message: string;
    isFollowing: boolean
}

export interface FollowUser {
    image: string;
    lastname: string;
    username: string;
    firstname: string;
}

export class GetUserFollowStatsReq {
    followerTotal: number;
    followingTotal: number;
    follower: FollowUser[];
    following: FollowUser[];
}