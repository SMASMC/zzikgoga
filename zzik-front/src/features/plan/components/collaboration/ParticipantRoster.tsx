import { cn } from '@/shared/utils/cn'
import CloseButton from '@/components/atoms/CloseButton'
import { getInitial } from '../../utils/user'

/**
 * ParticipantRoster Component
 *
 * Displays a list of participants currently in the trip planning session.
 * Shows participant status (active/waiting) and messages.
 */

interface Participant {
  clientId: number
  userId: string
  name: string
  color: string
  picture?: string | null
  hasCursor: boolean
  hasMessage: boolean
  isSelf: boolean
}

interface ParticipantRosterProps {
  isOpen: boolean
  onClose: () => void
  participants: Participant[]
  participantCount: number
}

const ParticipantRoster = ({
  isOpen,
  onClose,
  participants,
  participantCount,
}: ParticipantRosterProps) => {
  return (
    <div
      id="plan-participant-panel"
      className={cn(
        'absolute right-8 top-20 z-30 w-80 max-w-[90vw] rounded-2xl border-2 border-white/70 bg-white/95 shadow-2xl backdrop-blur transition-all duration-300',
        isOpen
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-2 opacity-0'
      )}
    >
      <div className="flex items-center justify-between border-b-2 border-slate-100 px-6 py-4">
        <div className="text-lg font-bold text-slate-800">참여 중 · {participantCount}명</div>
        <CloseButton onClick={onClose} className="text-xl" />
      </div>
      {participantCount > 0 ? (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {participants.map((participant) => (
            <li
              key={`${participant.clientId}-${participant.userId}`}
              className="flex items-center gap-3 px-6 py-3"
            >
              {participant.picture ? (
                <img
                  src={participant.picture}
                  alt={participant.name}
                  className="h-10 w-10 rounded-full border border-white/60 object-cover shadow-sm"
                />
              ) : (
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold"
                  style={{ borderColor: participant.color, color: participant.color }}
                >
                  {getInitial(participant.name)}
                </span>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  {participant.name}
                  {participant.isSelf ? (
                    <span className="rounded-full bg-blue-50 px-2 text-[11px] font-semibold text-blue-600">
                      나
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className="inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: participant.color }}
                  />
                  <span>{participant.hasCursor ? '활동 중' : '대기 중'}</span>
                  {participant.hasMessage ? (
                    <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
                      채팅중
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-6 py-6 text-sm text-slate-500">아직 참여자가 없습니다.</div>
      )}
    </div>
  )
}

export default ParticipantRoster
