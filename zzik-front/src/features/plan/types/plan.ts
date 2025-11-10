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
  tripId: number
}

export interface Coordinates {
  lat: number
  lng: number
}

export interface PlanPlace {
  id: string
  googlePlaceId?: string
  name: string
  address: string
  location: Coordinates
  startTime?: string
  endTime?: string
  activity?: string
  detailAddress?: string
  createdAt: number
}
