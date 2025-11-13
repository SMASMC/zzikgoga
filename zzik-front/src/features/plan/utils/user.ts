/**
 * User-related utility functions
 */

/**
 * Extracts the first character (initial) from a user name
 * @param value - User name string
 * @returns First uppercase character or '?' if empty
 */
export const getInitial = (value: string | undefined): string => {
  if (!value) return '?'
  const trimmed = value.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}
