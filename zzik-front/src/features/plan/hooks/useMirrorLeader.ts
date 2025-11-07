import { useEffect, useMemo, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'

/**
 * 단일 리더만 미러링하도록 결정하는 훅.
 * - 기본 정책: 현재 룸의 awareness 클라이언트ID 중 최솟값이 리더
 * - awareness가 없거나 비어있으면 자신을 리더로 간주
 * - fieldKey는 추후 해시 분산이 필요할 때 사용할 수 있도록 남겨둠
 */
export function useMirrorLeader(awareness: Awareness | null): boolean {
  const [isLeader, setIsLeader] = useState(true)

  const clientID = useMemo(() => (awareness ? awareness.clientID : 0), [awareness])

  useEffect(() => {
    if (!awareness) {
      setIsLeader(true)
      return
    }

    const update = () => {
      try {
        const ids = Array.from(awareness.getStates().keys())
        if (ids.length === 0) {
          setIsLeader(true)
          return
        }
        ids.sort((a, b) => a - b)
        setIsLeader(ids[0] === clientID)
      } catch {
        setIsLeader(true)
      }
    }

    update()
    const onUpdate = () => update()
    awareness.on('update', onUpdate)
    return () => {
      awareness.off('update', onUpdate)
    }
  }, [awareness, clientID])

  return isLeader
}
