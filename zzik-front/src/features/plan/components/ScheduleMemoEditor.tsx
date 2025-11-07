import * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { useMemo } from 'react'
import YCollabEditor from './YCollabEditor'
import { useMirrorLeader } from '../hooks/useMirrorLeader'

interface ScheduleMemoEditorProps {
  doc: Y.Doc
  awareness: Awareness | null
  dateKey: string
  index: number
  fieldKey: string
  initialText: string
  className?: string
}

const ScheduleMemoEditor = ({
  doc,
  awareness,
  dateKey,
  index,
  fieldKey,
  initialText,
  className,
}: ScheduleMemoEditorProps) => {
  const isLeader = useMirrorLeader(awareness)

  const yItemGetter = useMemo(() => {
    return () => {
      const schedulesMap = doc.getMap('schedules') as Y.Map<unknown>
      const yArr = schedulesMap.get(dateKey) as Y.Array<Y.Map<unknown>> | undefined
      const yItem = yArr?.get(index) as Y.Map<unknown> | undefined
      return yItem
    }
  }, [dateKey, doc, index])

  const canSeed = useMemo(() => {
    const yItem = yItemGetter()
    const owner = (yItem?.get('seed_owner') as number | undefined) ?? undefined
    const myId = (doc as unknown as { clientID?: number }).clientID
    if (typeof owner === 'number' && typeof myId === 'number') {
      return owner === myId
    }
    // fallback: leader seeds if owner unknown
    return isLeader
  }, [doc, isLeader, yItemGetter])

  // Seed content should come from current Y.Text to avoid double-source seeding
  const computedInitial = useMemo(() => {
    const yItem = yItemGetter()
    if (yItem) {
      const m = yItem.get('memo') as unknown
      const s = m instanceof Y.Text ? m.toString() : String(m ?? '')
      return s.replace(/\r\n/g, '\n').replace(/\n+$/, '')
    }
    return (initialText || '').replace(/\r\n/g, '\n').replace(/\n+$/, '')
  }, [initialText, yItemGetter])

  return (
    <YCollabEditor
      doc={doc}
      field={fieldKey}
      canSeed={canSeed}
      initialText={computedInitial}
      className={className}
      onPlainTextChange={(text) => {
        const yItem = yItemGetter()
        if (!yItem) return

        const currentVal = yItem.get('memo') as unknown
        const current =
          currentVal instanceof Y.Text ? currentVal.toString() : String(currentVal ?? '')
        if (current === text) return

        doc.transact(() => {
          const m = yItem.get('memo') as unknown
          if (m instanceof Y.Text) {
            m.delete(0, (m as Y.Text).length)
            m.insert(0, text)
          } else {
            yItem.set('memo', new Y.Text(text))
          }
        }, 'mirror-memo')
      }}
    />
  )
}

export default ScheduleMemoEditor
