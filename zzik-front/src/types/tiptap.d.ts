import * as React from 'react'

declare module '@tiptap/react' {
  export interface TTSelection {
    from: number
    to: number
  }
  export interface TTDocContent {
    size: number
  }
  export interface TTEditorState {
    selection: TTSelection
    doc: { content: TTDocContent }
  }
  export interface TTCommands {
    setContent: (content: string, emitUpdate?: boolean) => void
    setTextSelection: (pos: { from: number; to: number }) => void
  }
  export interface Editor {
    getText: (options?: { blockSeparator?: string }) => string
    commands: TTCommands
    state: TTEditorState
    destroy: () => void
  }
  export interface UseEditorOptions {
    extensions?: unknown[]
    content?: string
    editorProps?: { attributes?: Record<string, string> }
    onUpdate?: (payload: { editor: Editor; transaction: { docChanged?: boolean } }) => void
  }
  export function useEditor(options?: UseEditorOptions): Editor | null
  export const EditorContent: React.ComponentType<{ editor: Editor | null }>
}

declare module '@tiptap/starter-kit' {
  const StarterKit: unknown
  export default StarterKit
}
