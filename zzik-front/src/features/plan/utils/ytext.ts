/**
 * Yjs Y.Text utility functions
 */

import * as Y from 'yjs'

/**
 * Maximum allowed length for title text
 */
export const MAX_TITLE_LENGTH = 100

/**
 * Efficiently syncs Y.Text content with a new value using differential updates
 * Only modifies the parts that have changed to minimize CRDT operations
 * @param target - The Y.Text object to update
 * @param nextValue - The desired string value
 */
export const syncYTextContent = (target: Y.Text, nextValue: string): void => {
  const current = target.toString()
  if (current === nextValue) return

  // Find common prefix
  let prefix = 0
  const minLen = Math.min(current.length, nextValue.length)
  while (prefix < minLen && current[prefix] === nextValue[prefix]) prefix += 1

  // Find common suffix
  let suffix = 0
  while (
    suffix < minLen - prefix &&
    current[current.length - 1 - suffix] === nextValue[nextValue.length - 1 - suffix]
  ) {
    suffix += 1
  }

  // Calculate the change needed
  const deleteFrom = prefix
  const deleteLength = current.length - prefix - suffix
  const insertText = nextValue.slice(prefix, nextValue.length - suffix)

  // Apply changes in a single transaction
  target.doc?.transact(() => {
    if (deleteLength > 0) target.delete(deleteFrom, deleteLength)
    if (insertText.length > 0) target.insert(deleteFrom, insertText)
  }, 'title-input')
}
