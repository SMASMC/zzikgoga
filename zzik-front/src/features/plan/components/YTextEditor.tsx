import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as Y from 'yjs'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor as TTEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface YTextEditorProps {
  ytext: Y.Text
  className?: string
  placeholder?: string
  maxLength?: number
}

const YTextEditor = ({ ytext, className, placeholder, maxLength }: YTextEditorProps) => {
  const isRemoteRef = useRef(false)
  const isComposingRef = useRef(false)
  const pendingRemoteTextRef = useRef<string | null>(null)

  const initialContent = useMemo(() => ytext.toString(), [ytext])

  const syncEditorToYText = useCallback(
    (editorInstance: TTEditor) => {
      let newText = editorInstance.getText({ blockSeparator: '\n' })
      const current = ytext.toString()

      // Enforce maxLength if specified
      if (maxLength && newText.length > maxLength) {
        newText = newText.slice(0, maxLength)
        // Update editor to show truncated text
        isRemoteRef.current = true
        try {
          const { from } = editorInstance.state.selection
          editorInstance.commands.setContent(newText, false)
          const size = editorInstance.state.doc.content.size
          editorInstance.commands.setTextSelection({
            from: Math.min(from, size),
            to: Math.min(from, size),
          })
        } finally {
          isRemoteRef.current = false
        }
      }

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
    [ytext, maxLength]
  )

  const editor = useEditor({
    extensions: [StarterKit.configure({})],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-base max-w-none focus:outline-none min-h-[3rem] border-2 border-slate-200 rounded-xl px-4 py-2 text-lg font-semibold hover:border-blue-300 transition-colors overflow-hidden',
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
      let nextText = ytext.toString()
      const currentText = editor.getText({ blockSeparator: '\n' })

      // Enforce maxLength on remote updates
      if (maxLength && nextText.length > maxLength) {
        nextText = nextText.slice(0, maxLength)
        // Truncate in ytext as well
        ytext.doc?.transact(() => {
          ytext.delete(maxLength, ytext.length - maxLength)
        }, 'maxlength-enforcement')
      }

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
  }, [editor, ytext, maxLength])

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
