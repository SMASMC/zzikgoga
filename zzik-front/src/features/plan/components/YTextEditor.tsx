import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as Y from 'yjs'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor as TTEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/shared/utils/cn'

interface YTextEditorProps {
  ytext: Y.Text
  className?: string
  placeholder?: string
  maxLength?: number
  singleLine?: boolean
  variant?: 'input' | 'plain'
  numericOnly?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const normalizeSingleLine = (text: string, singleLine: boolean | undefined) =>
  singleLine ? text.replace(/\s*\n+\s*/g, ' ').trimStart() : text

const YTextEditor = ({
  ytext,
  className,
  placeholder,
  maxLength,
  singleLine,
  variant = 'input',
  numericOnly = false,
  size = 'md',
}: YTextEditorProps) => {
  const isRemoteRef = useRef(false)
  const isComposingRef = useRef(false)
  const pendingRemoteTextRef = useRef<string | null>(null)

  const sizeClasses = useMemo(() => {
    const textSizes = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
      '2xl': 'text-xl',
    }
    const paddingClasses = {
      xs: 'px-2 py-0.5',
      sm: 'px-2.5 py-0.5',
      md: 'px-3 py-1',
      lg: 'px-4 py-1.5',
      xl: 'px-5 py-2',
      '2xl': 'px-6 py-2.5',
    }
    return {
      text: textSizes[size],
      padding: paddingClasses[size],
    }
  }, [size])

  const initialContent = useMemo(
    () => normalizeSingleLine(ytext.toString(), singleLine),
    [ytext, singleLine]
  )

  const syncEditorToYText = useCallback(
    (editorInstance: TTEditor) => {
      let newText = editorInstance.getText({ blockSeparator: singleLine ? '' : '\n' })
      newText = normalizeSingleLine(newText, singleLine)

      // Filter to numeric only if specified
      if (numericOnly) {
        newText = newText.replace(/[^0-9]/g, '')
      }

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
    [ytext, maxLength, singleLine, numericOnly]
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          history: false, // collaboration extension과 충돌 방지
          bulletList: false, // <li> 중첩 방지
          orderedList: false, // <li> 중첩 방지
          listItem: false, // <li> 중첩 방지
        }),
        Placeholder.configure({
          placeholder: placeholder ?? '',
        }),
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: cn(
            'prose max-w-none focus:outline-none min-h-[1rem] bg-transparent text-inherit leading-tight',
            sizeClasses.text,
            className?.includes('text-right') && 'text-right'
          ),
          ...(numericOnly && {
            inputmode: 'numeric',
            pattern: '[0-9]*',
          }),
        },
        handleDOMEvents: {
          beforeinput: (_view, event: InputEvent) => {
            if (numericOnly && event.data) {
              // Allow only numeric input
              if (!/^[0-9]*$/.test(event.data)) {
                event.preventDefault()
                return true
              }
            }
            return false
          },
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
                editor.commands.setContent(normalizeSingleLine(pending, singleLine), false)
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
          keydown: (_: unknown, event: KeyboardEvent) => {
            if (singleLine && event.key === 'Enter') {
              event.preventDefault()
              return true
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
    },
    [placeholder]
  )

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

      const normalizedNextText = normalizeSingleLine(nextText, singleLine)
      if (normalizedNextText !== currentText) {
        if (isComposingRef.current) {
          pendingRemoteTextRef.current = normalizedNextText
          return
        }
        isRemoteRef.current = true
        try {
          const { from, to } = editor.state.selection
          editor.commands.setContent(normalizedNextText, false)
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
  }, [editor, ytext, maxLength, singleLine])

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div
      className={cn(
        variant === 'plain'
          ? 'w-full min-h-[1.2rem]'
          : cn(
              'w-full rounded-full border border-slate-300 bg-white font-medium text-slate-900 shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 flex items-center',
              sizeClasses.padding,
              sizeClasses.text
            ),
        className
      )}
      onClick={() => {
        // 빈 에디터를 클릭했을 때도 포커스되도록
        if (editor && !editor.isFocused) {
          editor.commands.focus()
        }
      }}
      style={{ cursor: 'text' }}
    >
      <div className="flex-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default YTextEditor
