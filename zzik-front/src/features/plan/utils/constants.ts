/**
 * Constants for plan/schedule features
 */

/**
 * Duration in milliseconds before chat auto-hides when inactive
 */
export const CHAT_AUTO_HIDE_MS = 5000

/**
 * Generates a room ID for real-time collaboration based on trip ID
 * @param tripId - The trip identifier
 * @returns Formatted room ID string
 */
export const getRoomId = (tripId: string | undefined): string =>
  tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'
