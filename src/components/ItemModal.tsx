import { useState } from 'react'
import { Pencil, MapPin, Clock, ExternalLink, Calendar, Tag, Plane } from 'lucide-react'
import type { Item, Trip } from '../lib/types'
import { CATEGORY_EMOJI, toggleReaction, itemReactions } from '../lib/data'
import { useApp } from '../lib/db'
import { Modal, Button, Avatar, Chip } from '../ui/primitives'
import { money } from '../lib/util'
import { scheduleLabel } from './ItemCard'
import Comments from './Comments'
import ItemEditor from './ItemEditor'

const QUICK = ['👍', '❤️', '🔥', '🤔']

// Tap an item -> read-only detail view -> "Edit" swaps to the full editor.
// New items open straight in edit mode.
export default function ItemModal({ trip, item, edit, canEdit, onClose }: {
  trip: Trip; item: Item; edit?: boolean; canEdit: boolean; onClose: () => void
}) {
  const [mode, setMode] = useState<'view' | 'edit'>(edit ? 'edit' : 'view')
  if (mode === 'edit') return <ItemEditor trip={trip} item={item} onClose={onClose} />
  return <ItemDetail trip={trip} item={item} canEdit={canEdit} onEdit={() => setMode('edit')} onClose={onClose} />
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm border-b border-ink-800 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-800">{children}</span>
    </div>
  )
}

function ItemDetail({ trip, item, canEdit, onEdit, onClose }: {
  trip: Trip; item: Item; canEdit: boolean; onEdit: () => void; onClose: () => void
}) {
  const me = useApp((s) => s.user)
  const profile = useApp((s) => s.profile)
  useApp((s) => s.reactions)
  const reactions = itemReactions(item.id)
  const b = item.booking || {}
  const assignees = item.assignedTo.map((id) => profile(id)).filter(Boolean)
  const createdBy = profile(item.createdBy)

  return (
    <Modal open onClose={onClose} wide title="Item">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-800 text-2xl">{CATEGORY_EMOJI[item.category]}</div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900">{item.title || 'Untitled'}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{item.category}</span>
              {item.bookingStatus === 'Booked' && <Chip className="bg-emerald-500/15 text-emerald-600">Booked</Chip>}
              {item.bookingStatus === 'Need to book' && <Chip className="bg-amber-500/15 text-amber-600">Need to book</Chip>}
              {!item.date && <Chip>Idea</Chip>}
            </div>
          </div>
          {canEdit && <Button onClick={onEdit}><Pencil size={15} />Edit</Button>}
        </div>

        {item.date && (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
            <Clock size={15} />{scheduleLabel(item)}
          </div>
        )}

        {(item.locationLabel || item.city) && (
          <div className="flex items-center gap-2 text-sm text-slate-700"><MapPin size={15} className="text-brand-500" />{item.locationLabel || item.city}</div>
        )}

        {item.notes && <p className="whitespace-pre-wrap rounded-xl bg-ink-850 px-3 py-2.5 text-sm text-slate-700">{item.notes}</p>}

        {b.legs && b.legs.length > 0 && (
          <div className="space-y-2">
            {b.legs.map((leg, i) => (
              <div key={leg.id} className="rounded-xl bg-ink-850 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 text-slate-800">
                  <Plane size={14} className="text-brand-500" />
                  <span className="font-medium">{[leg.fromCode, leg.toCode].filter(Boolean).join(' → ') || `Leg ${i + 1}`}</span>
                  {(leg.depTime || leg.arrTime) && <span className="text-slate-500">· {[leg.depTime, leg.arrTime].filter(Boolean).join('–')}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                  {leg.airline && <span>{leg.airline}</span>}
                  {leg.flightNumber && <span>{leg.flightNumber}</span>}
                  {leg.seat && <span>Seat {leg.seat}</span>}
                  {leg.baggage && <span>{leg.baggage}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <Row label="Duration">{item.duration}</Row>
          <Row label="Priority">{item.priority}</Row>
          <Row label="Est. cost">{item.cost != null ? money(item.cost, item.currency || 'EUR') : ''}</Row>
          <Row label="Source">{item.source}</Row>
          <Row label="Provider">{b.provider}</Row>
          <Row label="Reference">{b.reference}</Row>
          {!b.legs?.length && <>
            <Row label="Flight">{b.flightNumber}</Row>
            <Row label="Route">{(b.fromCode || b.toCode) ? [b.fromCode, b.toCode].filter(Boolean).join(' → ') : ''}</Row>
            <Row label="Seat">{b.seat}</Row>
            <Row label="Baggage">{b.baggage}</Row>
          </>}
          <Row label="Address">{b.address}</Row>
          <Row label="Check-in">{b.checkIn}</Row>
          <Row label="Check-out">{b.checkOut}</Row>
          <Row label="Cancellation by">{b.cancellationDeadline}</Row>
          <Row label="Contact">{b.contact}</Row>
          <Row label="Added by">{createdBy?.name}</Row>
        </div>

        {item.link && (
          <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
            Open link<ExternalLink size={14} />
          </a>
        )}
        {b.checkInLink && (
          <a href={b.checkInLink} target="_blank" rel="noreferrer" className="ml-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700">
            Check-in<ExternalLink size={14} />
          </a>
        )}

        {assignees.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Assigned</span>
            <div className="flex -space-x-2">{assignees.map((p) => <Avatar key={p!.id} name={p!.name} src={p!.photoUrl} size={26} />)}</div>
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center gap-1 border-t border-ink-800 pt-3">
          {QUICK.map((e) => {
            const count = reactions.filter((r) => r.emoji === e).length
            const mine = reactions.some((r) => r.emoji === e && r.userId === me?.id)
            return (
              <button key={e} onClick={() => toggleReaction(item.id, e)}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm transition ${mine ? 'bg-brand-500/20 text-brand-700' : 'hover:bg-ink-800 text-slate-500'}`}>
                <span>{e}</span>{count > 0 && <span>{count}</span>}
              </button>
            )
          })}
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Tag size={14} />Comments</h4>
          <Comments itemId={item.id} />
        </div>

        {!item.date && <p className="flex items-center gap-1.5 text-xs text-slate-400"><Calendar size={12} />Add a date in Edit to schedule this on the itinerary.</p>}
      </div>
    </Modal>
  )
}
