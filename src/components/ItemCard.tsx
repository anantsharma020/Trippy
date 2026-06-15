import { useState } from 'react'
import { MapPin, Clock, MessageCircle, Calendar, ExternalLink } from 'lucide-react'
import type { Item, Trip } from '../lib/types'
import { CATEGORY_EMOJI, toggleReaction, itemReactions, itemComments } from '../lib/data'
import { useApp } from '../lib/db'
import { Avatar, Chip } from '../ui/primitives'
import { fmtDate, money } from '../lib/util'
import Comments from './Comments'

const QUICK = ['👍', '❤️', '🔥', '🤔']

export function scheduleLabel(i: Item): string {
  if (!i.date) return ''
  const base = fmtDate(i.date, 'EEE, MMM d')
  if (i.startTime) return `${base} · ${i.startTime}${i.endTime ? `–${i.endTime}` : ''}`
  if (i.roughTime) return `${base} · ${i.roughTime}`
  if (i.endDate && i.endDate !== i.date) return `${base} → ${fmtDate(i.endDate, 'MMM d')}`
  return base
}

export default function ItemCard({ item, trip, onOpen, showSchedule = true }: {
  item: Item; trip: Trip; onOpen: (i: Item) => void; showSchedule?: boolean
}) {
  const me = useApp((s) => s.user)
  const profile = useApp((s) => s.profile)
  useApp((s) => s.reactions); useApp((s) => s.comments)
  const [showComments, setShowComments] = useState(false)

  const reactions = itemReactions(item.id)
  const commentCount = itemComments(item.id).length
  const reactionGroups = QUICK.map((e) => ({ emoji: e, count: reactions.filter((r) => r.emoji === e).length, mine: reactions.some((r) => r.emoji === e && r.userId === me?.id) }))
  const assignees = item.assignedTo.map((id) => profile(id)).filter(Boolean)

  return (
    <div className="rounded-2xl bg-ink-900/70 ring-1 ring-ink-800 transition hover:ring-ink-700">
      <button onClick={() => onOpen(item)} className="flex w-full items-start gap-3 p-3 text-left">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-800 text-lg">{CATEGORY_EMOJI[item.category]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate font-medium text-slate-100">{item.title || 'Untitled'}</p>
            {item.priority === 'High' && <Chip className="bg-rose-500/15 text-rose-300">High</Chip>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{item.category}</span>
            {item.city && <span className="flex items-center gap-1"><MapPin size={12} />{item.city}</span>}
            {showSchedule && item.date && <span className="flex items-center gap-1 text-brand-300"><Clock size={12} />{scheduleLabel(item)}</span>}
            {item.duration && <span className="flex items-center gap-1"><Clock size={12} />{item.duration}</span>}
            {item.cost != null && <span>{money(item.cost, item.currency || 'EUR')}</span>}
            {item.bookingStatus === 'Booked' && <Chip className="bg-emerald-500/15 text-emerald-300">Booked</Chip>}
            {item.bookingStatus === 'Need to book' && <Chip className="bg-amber-500/15 text-amber-300">Book</Chip>}
          </div>
          {item.notes && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.notes}</p>}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-2 pt-0.5">
            {assignees.slice(0, 3).map((p) => <Avatar key={p!.id} name={p!.name} src={p!.photoUrl} size={22} />)}
          </div>
        )}
      </button>

      <div className="flex items-center gap-1 border-t border-ink-800 px-3 py-1.5">
        {reactionGroups.map((g) => (
          <button key={g.emoji} onClick={() => toggleReaction(item.id, g.emoji)}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${g.mine ? 'bg-brand-500/20 text-brand-200' : 'hover:bg-ink-800 text-slate-400'}`}>
            <span>{g.emoji}</span>{g.count > 0 && <span>{g.count}</span>}
          </button>
        ))}
        <button onClick={() => setShowComments((v) => !v)}
          className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition ${showComments ? 'text-brand-300' : 'text-slate-400 hover:bg-ink-800'}`}>
          <MessageCircle size={13} />{commentCount > 0 && commentCount}
        </button>
        {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="rounded-full px-2 py-0.5 text-slate-400 hover:text-brand-300" onClick={(e) => e.stopPropagation()}><ExternalLink size={13} /></a>}
        {!item.date && <span className="rounded-full px-1.5 text-slate-600" title="Unscheduled idea"><Calendar size={13} /></span>}
      </div>

      {showComments && <div className="border-t border-ink-800 p-3"><Comments itemId={item.id} /></div>}
    </div>
  )
}
