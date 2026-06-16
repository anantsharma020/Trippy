import { useState } from 'react'
import { Trash2, MapPin, Calendar, X, Plus, Plane } from 'lucide-react'
import { ITEM_CATEGORIES, type BookingDetails, type FlightLeg, type Item, type Trip, type ItemCategory } from '../lib/types'
import { saveItem, deleteItem, BOOKABLE_CATS, CATEGORY_EMOJI } from '../lib/data'
import { useApp } from '../lib/db'
import { uid, durationBetween } from '../lib/util'
import { Modal, Field, Input, Textarea, Select, Button, Avatar, DateTimeField } from '../ui/primitives'
import LocationSearch from './LocationSearch'

const PRIORITIES = ['Low', 'Medium', 'High'] as const
const ROUGH = ['Morning', 'Afternoon', 'Evening', 'Night'] as const
const BOOKING = ['None', 'Need to book', 'Booked'] as const

export default function ItemEditor({ trip, item, onClose }: {
  trip: Trip; item: Item; onClose: () => void
}) {
  const [d, setD] = useState<Item>(item)
  const profile = useApp((s) => s.profile)
  const set = (patch: Partial<Item>) => setD((prev) => ({ ...prev, ...patch }))
  // Setting a start/end time auto-fills the duration from the gap.
  const setTime = (field: 'startTime' | 'endTime', value: string) =>
    setD((prev) => {
      const next = { ...prev, [field]: value || undefined }
      const dur = durationBetween(next.startTime, next.endTime)
      return { ...next, duration: dur ?? next.duration }
    })
  const isNew = !useApp.getState().items.some((i) => i.id === item.id)

  const memberIds = [trip.ownerId, ...trip.members.map((m) => m.userId)].filter((v, i, a) => a.indexOf(v) === i)
  const showBooking = BOOKABLE_CATS.includes(d.category) || d.bookingStatus !== 'None'
  const isAccom = d.category === 'Accommodation'
  const isFlight = d.category === 'Flight'

  async function save() {
    if (!d.title.trim()) return
    await saveItem(d)
    onClose()
  }
  async function remove() {
    await deleteItem(d.id)
    onClose()
  }

  return (
    <Modal open onClose={onClose} wide title={isNew ? 'New item' : 'Edit item'}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-800 text-xl">{CATEGORY_EMOJI[d.category]}</div>
          <Input autoFocus value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Title (e.g. Ramen Nagi)" className="text-base" />
        </div>

        <Field label="Category">
          <Select value={d.category} onChange={(e) => set({ category: e.target.value as ItemCategory })}>
            {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        {!isFlight && (
          <Field label="Location" hint="Search to drop a pin — this also sets the city">
            {d.lat != null && (
              <div className="mb-2 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-400/40">
                <span className="flex items-center gap-2 text-sm text-slate-800"><MapPin size={15} className="text-brand-500" />{d.locationLabel || d.city || 'Pinned location'}</span>
                <button type="button" onClick={() => set({ lat: undefined, lng: undefined, locationLabel: undefined })}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-500"><X size={13} />Remove</button>
              </div>
            )}
            <LocationSearch placeholder={d.lat != null ? 'Change location…' : 'Search address or place…'} onPick={(r) =>
              set({ lat: r.latitude, lng: r.longitude, locationLabel: r.name, address: r.address, city: r.name })} />
            {d.address && d.address !== d.locationLabel && <p className="mt-1 text-xs text-slate-500">{d.address}</p>}
          </Field>
        )}

        {/* Scheduling — adding a date moves this into the Itinerary */}
        <div className="rounded-xl bg-ink-850/60 ring-1 ring-ink-800 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <Calendar size={14} /> {isAccom ? 'Stay dates' : 'Scheduling'} {d.date ? <span className="text-brand-400">· in itinerary</span> : <span className="text-slate-500">· in ideas</span>}
          </div>
          {isAccom ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Check-in date"><DateTimeField type="date" value={d.date} onChange={(v) => set({ date: v })} placeholder="Pick a date" /></Field>
              <Field label="Check-in time"><DateTimeField type="time" value={d.startTime} onChange={(v) => set({ startTime: v })} placeholder="Add time" /></Field>
              <Field label="Check-out date"><DateTimeField type="date" value={d.endDate} onChange={(v) => set({ endDate: v })} placeholder="Pick a date" /></Field>
              <Field label="Check-out time"><DateTimeField type="time" value={d.endTime} onChange={(v) => set({ endTime: v })} placeholder="Add time" /></Field>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Date"><DateTimeField type="date" value={d.date} onChange={(v) => set({ date: v })} placeholder="Pick a date" /></Field>
                <Field label="End date (multi-day)"><DateTimeField type="date" value={d.endDate} onChange={(v) => set({ endDate: v })} placeholder="Optional" /></Field>
                <Field label="Rough time">
                  <Select value={d.roughTime || ''} onChange={(e) => set({ roughTime: (e.target.value || undefined) as any })}>
                    <option value="">—</option>
                    {ROUGH.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start"><DateTimeField type="time" value={d.startTime} onChange={(v) => setTime('startTime', v || '')} placeholder="Start" /></Field>
                  <Field label="End"><DateTimeField type="time" value={d.endTime} onChange={(v) => setTime('endTime', v || '')} placeholder="End" /></Field>
                </div>
              </div>
              <Field label="Duration" hint="auto-filled from start/end times, or type your own — e.g. 2-3 hours">
                <Input value={d.duration || ''} onChange={(e) => set({ duration: e.target.value || undefined })} placeholder="2-3 hours" />
              </Field>
            </>
          )}
          {d.date && (
            <button onClick={() => set({ date: undefined, startTime: undefined, endTime: undefined, roughTime: undefined, endDate: undefined })}
              className="mt-2 text-xs text-slate-400 hover:text-slate-900">↩ Move back to Ideas (clear date)</button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!isFlight && (
            <Field label="Priority">
              <Select value={d.priority || ''} onChange={(e) => set({ priority: (e.target.value || undefined) as any })}>
                <option value="">—</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Est. cost">
            <div className="flex gap-2">
              <Input type="number" inputMode="decimal" value={d.cost ?? ''} onChange={(e) => set({ cost: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" />
              <Input value={d.currency || ''} onChange={(e) => set({ currency: e.target.value.toUpperCase() || undefined })} placeholder="EUR" className="w-20" />
            </div>
          </Field>
        </div>

        <Field label="Notes"><Textarea value={d.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything worth remembering…" /></Field>

        {!isFlight && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Link"><Input value={d.link || ''} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Source" hint="e.g. who recommended it"><Input value={d.source || ''} onChange={(e) => set({ source: e.target.value })} placeholder="Instagram, Emma…" /></Field>
          </div>
        )}

        {/* Travel-detail / booking payload */}
        <div className="rounded-xl bg-ink-850/60 ring-1 ring-ink-800 p-3">
          <Field label="Booking status">
            <Select value={d.bookingStatus} onChange={(e) => set({ bookingStatus: e.target.value as any })}>
              {BOOKING.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Field>
          {showBooking && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Provider"><Input value={d.booking?.provider || ''} onChange={(e) => set({ booking: { ...d.booking, provider: e.target.value } })} placeholder="Airline / hotel / co." /></Field>
              <Field label="Reference"><Input value={d.booking?.reference || ''} onChange={(e) => set({ booking: { ...d.booking, reference: e.target.value } })} placeholder="Confirmation #" /></Field>
              {isFlight && (
                <div className="sm:col-span-2"><FlightLegs booking={d.booking} onChange={(b) => set({ booking: b })} /></div>
              )}
              {(d.category === 'Accommodation') && <>
                <Field label="Contact"><Input value={d.booking?.contact || ''} onChange={(e) => set({ booking: { ...d.booking, contact: e.target.value } })} /></Field>
                <Field label="Cancellation by"><DateTimeField type="date" value={d.booking?.cancellationDeadline} onChange={(v) => set({ booking: { ...d.booking, cancellationDeadline: v } })} placeholder="Pick a date" /></Field>
              </>}
              {(d.category === 'Car rental') && <>
                <Field label="Pickup location"><Input value={d.booking?.address || ''} onChange={(e) => set({ booking: { ...d.booking, address: e.target.value } })} placeholder="Airport desk…" /></Field>
                <Field label="Pickup"><Input value={d.booking?.checkIn || ''} onChange={(e) => set({ booking: { ...d.booking, checkIn: e.target.value } })} placeholder="Oct 8, 10:00" /></Field>
                <Field label="Drop-off"><Input value={d.booking?.checkOut || ''} onChange={(e) => set({ booking: { ...d.booking, checkOut: e.target.value } })} placeholder="Oct 12, 18:00" /></Field>
                <Field label="Contact"><Input value={d.booking?.contact || ''} onChange={(e) => set({ booking: { ...d.booking, contact: e.target.value } })} /></Field>
              </>}
              <Field label="Check-in link"><Input value={d.booking?.checkInLink || ''} onChange={(e) => set({ booking: { ...d.booking, checkInLink: e.target.value } })} placeholder="https://…" /></Field>
              <div className="sm:col-span-2"><Field label="Extra notes"><Input value={d.booking?.extra || ''} onChange={(e) => set({ booking: { ...d.booking, extra: e.target.value } })} /></Field></div>
            </div>
          )}
        </div>

        <Field label="Assigned travelers">
          <div className="flex flex-wrap gap-2">
            {memberIds.map((mid) => {
              const p = profile(mid)
              const on = d.assignedTo.includes(mid)
              return (
                <button key={mid} onClick={() => set({ assignedTo: on ? d.assignedTo.filter((x) => x !== mid) : [...d.assignedTo, mid] })}
                  className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 ring-1 transition ${on ? 'bg-brand-500/20 ring-brand-500/50' : 'bg-ink-850 ring-ink-700'}`}>
                  <Avatar name={p?.name || '?'} src={p?.photoUrl} size={22} />
                  <span className="text-xs text-slate-200">{p?.name || 'Unknown'}</span>
                </button>
              )
            })}
          </div>
        </Field>

        <div className="flex items-center gap-2 pt-1">
          {!isNew && <Button variant="ghost" onClick={remove} className="text-rose-400"><Trash2 size={16} /></Button>}
          <div className="ml-auto flex gap-2">
            <Button variant="soft" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={!d.title.trim()}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// Multi-leg flight editor — one block per segment, for layovers.
function FlightLegs({ booking, onChange }: { booking?: BookingDetails; onChange: (b: BookingDetails) => void }) {
  const legs: FlightLeg[] = booking?.legs?.length
    ? booking.legs
    : [{ id: uid(), flightNumber: booking?.flightNumber, fromCode: booking?.fromCode, toCode: booking?.toCode, seat: booking?.seat, baggage: booking?.baggage }]
  const setLegs = (next: FlightLeg[]) => onChange({ ...booking, legs: next })
  const update = (id: string, patch: Partial<FlightLeg>) => setLegs(legs.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Plane size={13} />Flights / legs</div>
      <div className="space-y-2">
        {legs.map((leg, i) => (
          <div key={leg.id} className="rounded-xl bg-ink-850 ring-1 ring-ink-700 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Leg {i + 1}</span>
              {legs.length > 1 && <button type="button" onClick={() => setLegs(legs.filter((l) => l.id !== leg.id))} className="text-slate-400 hover:text-rose-500"><X size={14} /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Airline"><Input value={leg.airline || ''} onChange={(e) => update(leg.id, { airline: e.target.value })} placeholder="ANA" /></Field>
              <Field label="Flight no."><Input value={leg.flightNumber || ''} onChange={(e) => update(leg.id, { flightNumber: e.target.value })} placeholder="NH212" /></Field>
              <Field label="From"><Input value={leg.fromCode || ''} onChange={(e) => update(leg.id, { fromCode: e.target.value.toUpperCase() })} placeholder="HND" /></Field>
              <Field label="To"><Input value={leg.toCode || ''} onChange={(e) => update(leg.id, { toCode: e.target.value.toUpperCase() })} placeholder="HEL" /></Field>
              <Field label="Depart"><DateTimeField type="time" value={leg.depTime} onChange={(v) => update(leg.id, { depTime: v })} placeholder="Time" /></Field>
              <Field label="Arrive"><DateTimeField type="time" value={leg.arrTime} onChange={(v) => update(leg.id, { arrTime: v })} placeholder="Time" /></Field>
              <Field label="Seat"><Input value={leg.seat || ''} onChange={(e) => update(leg.id, { seat: e.target.value })} placeholder="32A" /></Field>
              <Field label="Baggage"><Input value={leg.baggage || ''} onChange={(e) => update(leg.id, { baggage: e.target.value })} placeholder="23kg" /></Field>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setLegs([...legs, { id: uid() }])}
        className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"><Plus size={15} />Add leg (layover)</button>
    </div>
  )
}
