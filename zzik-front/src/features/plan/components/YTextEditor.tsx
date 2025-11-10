import { useCallback, useEffect, useMemo, useRef } from 'react'
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
  const isComposingRef = useRef(false)
  const pendingRemoteTextRef = useRef<string | null>(null)

  const initialContent = useMemo(() => ytext.toString(), [ytext])

  const syncEditorToYText = useCallback(
    (editorInstance: TTEditor) => {
      const newText = editorInstance.getText({ blockSeparator: '\n' })
      const current = ytext.toString()
      if (newText === current) {
        return
      }

      let commonPrefix = 0
      const minLen = Math.min(current.length, newText.length)
      while (commonPrefix < minLen && current[commonPrefix] === newText[commonPrefix]) {
        commonPrefix += 1
      }

      let commonSuffix = 0
      while (
        commonSuffix < minLen - commonPrefix &&
        current[current.length - 1 - commonSuffix] === newText[newText.length - 1 - commonSuffix]
      ) {
        commonSuffix += 1
      }

      const deleteFrom = commonPrefix
      const deleteLength = current.length - commonPrefix - commonSuffix
      const insertText = newText.slice(commonPrefix, newText.length - commonSuffix)

      ytext.doc?.transact(() => {
        if (deleteLength > 0) {
          ytext.delete(deleteFrom, deleteLength)
        }
        if (insertText.length > 0) {
          ytext.insert(deleteFrom, insertText)
        }
      }, 'tiptap-edit')
    },
    [ytext]
  )

  const editor = useEditor({
    extensions: [StarterKit.configure({})],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[2.25rem] border border-slate-200 rounded-md px-2 py-1',
      },
      handleDOMEvents: {
        compositionstart: () => {
          isComposingRef.current = true
          return false
        },
        compositionend: () => {
          isComposingRef.current = false
          if (editor) {
            syncEditorToYText(editor)
          }
          if (pendingRemoteTextRef.current && editor) {
            const pending = pendingRemoteTextRef.current
            pendingRemoteTextRef.current = null
            isRemoteRef.current = true
            try {
              const { from, to } = editor.state.selection
              editor.commands.setContent(pending, false)
              const size = editor.state.doc.content.size
              editor.commands.setTextSelection({
                from: Math.min(from, size),
                to: Math.min(to, size),
              })
            } finally {
              isRemoteRef.current = false
            }
          }
          return false
        },
      },
    },
    onUpdate: ({
      editor: editorInstance,
      transaction,
    }: {
      editor: TTEditor
      transaction: { docChanged?: boolean }
    }) => {
      if (isRemoteRef.current || isComposingRef.current || !transaction.docChanged) {
        return
      }
      syncEditorToYText(editorInstance)
    },
  })

  useEffect(() => {
    if (!editor) return
    const observer = () => {
      const nextText = ytext.toString()
      const currentText = editor.getText({ blockSeparator: '\n' })
      if (nextText !== currentText) {
        if (isComposingRef.current) {
          pendingRemoteTextRef.current = nextText
          return
        }
        isRemoteRef.current = true
        try {
          const { from, to } = editor.state.selection
          editor.commands.setContent(nextText, false)
          const size = editor.state.doc.content.size
          editor.commands.setTextSelection({
            from: Math.min(from, size),
            to: Math.min(to, size),
          })
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
