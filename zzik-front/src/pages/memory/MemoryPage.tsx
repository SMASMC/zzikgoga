import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Input from '@/components/atoms/Input'
import SolidButton from '@/components/atoms/SolidButton'
import MarkdownEditor from '@/features/memory/components/MarkdownEditor'
import MemoryPhotoGallery from '@/features/memory/components/MemoryPhotoGallery'
import { CreateMemoryRequest, MemoryBlock } from '@/features/memory/types/memory'
import { MemoryService } from '@/features/memory/services/memoryService'

const MemoryPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const safeTripId = useMemo(() => tripId ?? '', [tripId])

  const [title, setTitle] = useState('')
  const [markdown, setMarkdown] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)

  const canSave = title.trim().length > 0 && markdown.trim().length > 0 && !!safeTripId

  const markdownToBlocks = (md: string): MemoryBlock[] => {
    const lines = md.replace(/\r\n/g, '\n').split('\n')
    const blocks: MemoryBlock[] = []
    let paraBuf: string[] = []

    const flushPara = () => {
      if (paraBuf.length === 0) return
      const text = paraBuf.join('\n').trim()
      if (text.length === 0) return
      blocks.push({ id: crypto.randomUUID(), type: 'paragraph', data: { text } })
      paraBuf = []
    }

    const imageMd = /^!\[([^\]]*)\]\(([^)]+)\)/

    for (const raw of lines) {
      const line = raw.trimEnd()
      const trimmed = line.trim()
      if (trimmed.length === 0) {
        flushPara()
        continue
      }

      if (trimmed.startsWith('### ')) {
        flushPara()
        const text = trimmed.replace(/^###\s+/, '')
        blocks.push({ id: crypto.randomUUID(), type: 'heading3', data: { text } })
        continue
      }
      if (trimmed.startsWith('## ')) {
        flushPara()
        const text = trimmed.replace(/^##\s+/, '')
        blocks.push({ id: crypto.randomUUID(), type: 'heading2', data: { text } })
        continue
      }
      if (trimmed.startsWith('# ')) {
        flushPara()
        const text = trimmed.replace(/^#\s+/, '')
        blocks.push({ id: crypto.randomUUID(), type: 'heading1', data: { text } })
        continue
      }

      const m = trimmed.match(imageMd)
      if (m) {
        flushPara()
        const alt = m[1] || ''
        const url = m[2]
        blocks.push({ id: crypto.randomUUID(), type: 'image', data: { url, caption: alt } })
        continue
      }

      paraBuf.push(line)
    }
    flushPara()
    return blocks
  }

  const blocksToMarkdown = (blocks: MemoryBlock[]): string => {
    const parts: string[] = []
    for (const b of blocks) {
      switch (b.type) {
        case 'heading1':
          parts.push(`# ${b.data.text ?? ''}`)
          break
        case 'heading2':
          parts.push(`## ${b.data.text ?? ''}`)
          break
        case 'heading3':
          parts.push(`### ${b.data.text ?? ''}`)
          break
        case 'image': {
          const alt = b.data.caption ?? 'image'
          const url = b.data.url ?? ''
          parts.push(`![${alt}](${url})`)
          break
        }
        default:
          parts.push(b.data.text ?? '')
      }
    }
    return parts.join('\n\n')
  }

  // 최초 진입 시 기존 기록 조회
  useEffect(() => {
    if (!safeTripId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await MemoryService.getMemory(safeTripId)
        if (cancelled || !res) return
        setTitle(res.title ?? '')
        const blocks = res.content?.blocks
        if (Array.isArray(blocks) && blocks.length > 0) {
          setMarkdown(blocksToMarkdown(blocks))
        } else {
          setMarkdown('')
        }
      } catch {
        // 기록이 없거나 에러인 경우: 빈 에디터 유지
        setMarkdown('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [safeTripId])

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const payload: CreateMemoryRequest = {
        title,
        content: { blocks: markdownToBlocks(markdown) },
        status: 'onprocess',
      }
      const res = await MemoryService.putMemory(safeTripId, payload)
      setSavedId(res.memoryId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleGeneratePdf = async () => {
    if (!safeTripId) return
    setPdfLoading(true)
    setError(null)
    try {
      const res = await MemoryService.convertToPdf(safeTripId)
      const url = res.pdfUrl
      if (!url) throw new Error('PDF URL을 찾을 수 없습니다.')
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      a.download = `memory-${res.memoryId ?? ''}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to generate pdf')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-80px)] p-4 overflow-hidden">
      <div className="h-full grid grid-cols-12 gap-4 min-h-0">
        <aside className="col-span-4 rounded-xl bg-white shadow border overflow-hidden flex flex-col min-h-0">
          {safeTripId && <MemoryPhotoGallery tripId={safeTripId} />}
        </aside>
        <section className="col-span-8 flex flex-col min-h-0 overflow-hidden">
          <div className="mb-3 flex items-center gap-2 shrink-0">
            <Input
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
            <SolidButton onClick={handleSave} disabled={!canSave || saving}>
              {saving ? '임시저장 중...' : '임시저장'}
            </SolidButton>
            <SolidButton onClick={handleGeneratePdf} disabled={!safeTripId || pdfLoading}>
              {pdfLoading ? 'PDF 생성 중...' : 'PDF 생성'}
            </SolidButton>
          </div>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          {savedId && <div className="text-green-700 text-sm mb-2">저장 완료 (ID: {savedId})</div>}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MarkdownEditor value={markdown} onChange={setMarkdown} />
          </div>
        </section>
      </div>
    </div>
  )
}

export default MemoryPage
