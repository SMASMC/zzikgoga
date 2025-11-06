import { useEffect } from 'react'
import * as Y from 'yjs'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'

interface YCollabEditorProps {
  doc: Y.Doc
  field: string
  initialText?: string
  className?: string
}

const YCollabEditor = ({ doc, field, initialText, className }: YCollabEditorProps) => {
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
  })

  useEffect(() => {
    if (!editor) return
    // Seed initial content once if fragment is empty
    try {
      const frag = doc.getXmlFragment(field)
      const isEmpty = (frag as unknown as { length: number }).length === 0
      if (isEmpty && initialText && initialText.trim().length > 0) {
        editor.commands.setContent(initialText)
      }
    } catch {
      //
    }
  }, [doc, editor, field, initialText])

  useEffect(() => () => editor?.destroy(), [editor])

  return <EditorContent editor={editor} />
}

export default YCollabEditor
