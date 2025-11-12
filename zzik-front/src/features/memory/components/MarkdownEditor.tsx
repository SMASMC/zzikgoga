import React, { useCallback, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

type Props = {
  value: string
  onChange: (next: string) => void
}

const MarkdownEditor = ({ value, onChange }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = textareaRef.current
      if (!el) {
        onChange(`${value}${text}`)
        return
      }
      const start = el.selectionStart ?? value.length
      const end = el.selectionEnd ?? value.length
      const before = value.slice(0, start)
      const after = value.slice(end)
      const next = `${before}${text}${after}`
      onChange(next)
      const newPos = start + text.length
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(newPos, newPos)
      })
    },
    [onChange, value]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      e.stopPropagation()

      const dt = e.dataTransfer
      if (!dt) return

      // 갤러리에서 넘긴 커스텀 데이터(링크) 우선 처리
      const fromGalleryUrl = dt.getData('text/zzik-image-url')
      if (fromGalleryUrl) {
        insertAtCursor(`\n\n![image](${fromGalleryUrl})\n\n`)
        return
      }

      // 파일 드롭은 현재 지원하지 않음(업로드 경로 없음): 무시

      const url = dt.getData('text/uri-list') || dt.getData('text/plain')
      const isHttp = /^https?:\/\//i.test(url)
      if (isHttp) {
        insertAtCursor(`\n\n![image](${url})\n\n`)
      }
    },
    [insertAtCursor]
  )

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData?.getData('text/plain')
    if (!text) return
    const isHttp = /^https?:\/\//i.test(text.trim())
    if (isHttp) {
      e.preventDefault()
      insertAtCursor(`\n\n![image](${text.trim()})\n\n`)
    }
  }, [insertAtCursor])

  const mdComponents = useMemo(
    () => ({
      h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 {...props} className={`text-3xl font-extrabold mt-4 mb-3 ${props.className ?? ''}`} />
      ),
      h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 {...props} className={`text-2xl font-bold mt-4 mb-2 ${props.className ?? ''}`} />
      ),
      h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 {...props} className={`text-xl font-bold mt-3 mb-2 ${props.className ?? ''}`} />
      ),
      p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p {...props} className={`text-base leading-7 my-2 whitespace-pre-wrap ${props.className ?? ''}`} />
      ),
      ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
        <ul {...props} className={`list-disc ml-6 my-2 ${props.className ?? ''}`} />
      ),
      ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
        <ol {...props} className={`list-decimal ml-6 my-2 ${props.className ?? ''}`} />
      ),
      li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
        <li {...props} className={`my-1 ${props.className ?? ''}`} />
      ),
      img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <img {...props} className={`max-w-full h-auto rounded-md my-2 ${props.className ?? ''}`} />
      ),
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a {...props} className={`text-blue-600 underline ${props.className ?? ''}`} />
      ),
      code: (props: React.HTMLAttributes<HTMLElement>) => (
        <code {...props} className={`px-1 py-0.5 rounded bg-slate-100 ${props.className ?? ''}`} />
      ),
      pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
        <pre {...props} className={`p-3 rounded bg-slate-900 text-slate-100 overflow-auto ${props.className ?? ''}`} />
      ),
    }),
    []
  )

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 gap-3 h-full">
        <textarea
          ref={textareaRef}
          className="col-span-1 w-full h-full resize-none p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar"
          placeholder="# 제목\n내용을 마크다운으로 입력하세요"
          value={value}
          onChange={e => onChange(e.target.value)}
          onDrop={handleDrop}
          onPaste={handlePaste}
        />
        <div className="col-span-1 h-full overflow-y-auto p-4 rounded-lg border border-slate-200 bg-white custom-scrollbar">
          <ReactMarkdown components={mdComponents}>{value}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default MarkdownEditor
