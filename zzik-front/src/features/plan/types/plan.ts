export interface FriendInviteResponse {
    inviteurl: string
}
export interface TripMemberResponse {
    members: Members[]
    tripId: number
}
export interface Members {
    memberId: number
    memberName: string
    thumbnailUrl: string
    joinedAt: string
}
export interface InviteResponse {
    joined: boolean
    trip_id: number
}
