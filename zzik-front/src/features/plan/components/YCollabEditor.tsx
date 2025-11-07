import { useEffect, useRef } from 'react'
import * as Y from 'yjs'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

interface YCollabEditorProps {
  doc: Y.Doc
  field: string
  initialText?: string
  className?: string
  onPlainTextChange?: (text: string) => void
  canSeed?: boolean
}

const YCollabEditor = ({
  doc,
  field,
  initialText,
  className,
  onPlainTextChange,
  canSeed,
}: YCollabEditorProps) => {
  const normalizingRef = useRef(false)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Collaboration.configure({ document: doc as Y.Doc, field }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[2.25rem] border border-slate-200 rounded-md px-2 py-1 ${
          className || ''
        }`,
      },
    },
    onUpdate: ({ editor, transaction }) => {
      if (!transaction?.docChanged) return
      let text = editor.getText({ blockSeparator: '\n' })
      text = text.replace(/\r\n/g, '\n').replace(/\n+$/, '')
      // Always normalize duplicates even on remote updates (no focus needed)
      const m = /^([\s\S]+)\n\1$/.exec(text)
      if (m && m[1] && !normalizingRef.current) {
        normalizingRef.current = true
        try {
          editor.commands.setContent(m[1])
        } finally {
          normalizingRef.current = false
        }
        return
      }
      // Mirror to Y.Text only for local edits (focused editor)
      if (!onPlainTextChange) return
      if (!editor.view?.hasFocus?.()) return
      onPlainTextChange(text)
    },
  })

  useEffect(() => {
    if (!editor || !canSeed) return
    try {
      const frag = doc.getXmlFragment(field)
      const isEmpty = (frag as unknown as { length: number }).length === 0
      const currentText = editor.getText({ blockSeparator: '\n' })
      if (
        isEmpty &&
        (!currentText || currentText.trim().length === 0) &&
        initialText &&
        initialText.trim().length > 0
      ) {
        editor.commands.setContent(initialText)
      }
    } catch {
      // ignore
    }
  }, [canSeed, doc, editor, field, initialText])

  // update mirror now handled by onUpdate option above

  useEffect(() => () => editor?.destroy(), [editor])

  return <EditorContent editor={editor} />
}

export default YCollabEditor
