import { MapPin, Clock, MessageCircle, Check } from 'lucide-react'
import type { Item, Trip } from '../lib/types'
import { CATEGORY_EMOJI, itemReactions, itemComments, saveItem } from '../lib/data'
import { useApp } from '../lib/db'
import { Avatar, Chip } from '../ui/primitives'
import { fmtDate, money, classNames } from '../lib/util'

export function scheduleLabel(i: Item): string {
  if (!i.date) return ''
  // Accommodation shows the whole stay: check-in and check-out, each with time.
  if (i.category === 'Accommodation') {
    const ci = `In ${fmtDate(i.date, 'MMM d')}${i.startTime ? ` ${i.startTime}` : ''}`
    const co = i.endDate ? ` · Out ${fmtDate(i.endDate, 'MMM d')}${i.endTime ? ` ${i.endTime}` : ''}` : ''
    return ci + co
  }
  const base = fmtDate(i.date, 'EEE, MMM d')
  if (i.startTime) return `${base} · ${i.startTime}${i.endTime ? `–${i.endTime}` : ''}`
  if (i.roughTime) return `${base} · ${i.roughTime}`
  if (i.endDate && i.endDate !== i.date) return `${base} → ${fmtDate(i.endDate, 'MMM d')}`
  return base
}

export default function ItemCard({ item, trip: _trip, onOpen, showSchedule = true, showDone = false, canEdit = true }: {
  item: Item; trip: Trip; onOpen: (i: Item) => void; showSchedule?: boolean; showDone?: boolean; canEdit?: boolean
}) {
  const profile = useApp((s) => s.profile)
  useApp((s) => s.reactions); useApp((s) => s.comments)

  // Reactions and comments live in the item's detail view; here we just show a
  // subtle indicator that there's activity.
  const reactionCount = itemReactions(item.id).length
  const commentCount = itemComments(item.id).length
  const assignees = item.assignedTo.map((id) => profile(id)).filter(Boolean)

  return (
    <div className={classNames('flex items-start gap-2 rounded-2xl bg-ink-900/70 p-3 ring-1 ring-ink-800 transition hover:ring-ink-700', item.done && 'opacity-60')}>
      {showDone && (
        <button disabled={!canEdit} onClick={() => saveItem({ ...item, done: !item.done })}
          title={item.done ? 'Mark not done' : 'Mark done'}
          className={classNames('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition', item.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-ink-600 hover:border-emerald-500')}>
          {item.done && <Check size={14} />}
        </button>
      )}
      <button onClick={() => onOpen(item)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-800 text-lg">{CATEGORY_EMOJI[item.category]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <p className={classNames('min-w-0 flex-1 truncate font-medium text-slate-100', item.done && 'line-through')}>{item.title || 'Untitled'}</p>
            {item.priority === 'High' && <Chip className="shrink-0 bg-rose-500/15 text-rose-300">High</Chip>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{item.category}</span>
            {item.city && <span className="flex items-center gap-1"><MapPin size={12} />{item.city}</span>}
            {showSchedule && item.date && <span className="flex items-center gap-1 text-brand-300"><Clock size={12} />{scheduleLabel(item)}</span>}
            {item.duration && <span className="flex items-center gap-1"><Clock size={12} />{item.duration}</span>}
            {item.cost != null && <span>{money(item.cost, item.currency || 'EUR')}</span>}
            {item.bookingStatus === 'Booked' && <Chip className="bg-emerald-500/15 text-emerald-300">Booked</Chip>}
            {item.bookingStatus === 'Need to book' && <Chip className="bg-amber-500/15 text-amber-300">Book</Chip>}
            {commentCount > 0 && <span className="flex items-center gap-1"><MessageCircle size={12} />{commentCount}</span>}
            {reactionCount > 0 && <span>· {reactionCount} reaction{reactionCount === 1 ? '' : 's'}</span>}
          </div>
          {item.notes && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.notes}</p>}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-2 pt-0.5">
            {assignees.slice(0, 3).map((p) => <Avatar key={p!.id} name={p!.name} src={p!.photoUrl} size={22} />)}
          </div>
        )}
      </button>
    </div>
  )
}
