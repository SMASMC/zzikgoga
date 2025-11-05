import { useEffect, useMemo, useRef } from 'react'
import * as Y from 'yjs'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor as TTEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface YTextEditorProps {
  ytext: Y.Text
  className?: string
  placeholder?: string
}

const YTextEditor = ({ ytext, className, placeholder }: YTextEditorProps) => {
  const isRemoteRef = useRef(false)

  const initialContent = useMemo(() => ytext.toString(), [ytext])

  const editor = useEditor({
    extensions: [StarterKit.configure({})],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[2.25rem] border border-slate-200 rounded-md px-2 py-1',
      },
    },
    onUpdate: ({
      editor,
      transaction,
    }: {
      editor: TTEditor
      transaction: { docChanged?: boolean }
    }) => {
      if (isRemoteRef.current || !transaction.docChanged) return
      const text = editor.getText({ blockSeparator: '\n' })
      const current = ytext.toString()
      if (text !== current) {
        ytext.doc?.transact(() => {
          ytext.delete(0, ytext.length)
          ytext.insert(0, text)
        }, 'tiptap-edit')
      }
    },
  })

  useEffect(() => {
    if (!editor) return
    const observer = () => {
      const nextText = ytext.toString()
      const currentText = editor.getText({ blockSeparator: '\n' })
      if (nextText !== currentText) {
        isRemoteRef.current = true
        try {
          const { from, to } = editor.state.selection
          editor.commands.setContent(nextText, false)
          const size = editor.state.doc.content.size
          editor.commands.setTextSelection({ from: Math.min(from, size), to: Math.min(to, size) })
        } finally {
          isRemoteRef.current = false
        }
      }
    }
    ytext.observe(observer)
    return () => {
      ytext.unobserve(observer)
    }
  }, [editor, ytext])

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div className={className} data-placeholder={placeholder}>
      <EditorContent editor={editor} />
    </div>
  )
}

export default YTextEditor
