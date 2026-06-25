import { useState } from 'react'
import { Plus, Plane, Hotel, Car, Train, ExternalLink, Copy } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripItems, newItem } from '../lib/data'
import { type Item, type ItemCategory } from '../lib/types'
import { Button, Card, EmptyState } from '../ui/primitives'
import { fmtDate } from '../lib/util'
import ItemModal from '../components/ItemModal'

const GROUPS: { title: string; icon: any; cats: ItemCategory[] }[] = [
  { title: 'Flights', icon: Plane, cats: ['Flight'] },
  { title: 'Accommodation', icon: Hotel, cats: ['Accommodation'] },
  { title: 'Car rental', icon: Car, cats: ['Car rental'] },
  { title: 'Trains, ferries & transfers', icon: Train, cats: ['Train', 'Ferry', 'Transfer'] },
]
// Travel Details is just for the things you need to keep: stays, flights, the car,
// and transport — not every restaurant or class you book. Other bookings live with
// their item in Ideas/Itinerary.
const DETAIL_CATS = GROUPS.flatMap((g) => g.cats)

export default function TravelDetails() {
  const { trip, canEdit } = useTrip()
  useApp((s) => s.items)
  const [opened, setOpened] = useState<{ item: Item; edit: boolean } | null>(null)

  const booked = tripItems(trip.id).filter((i) => DETAIL_CATS.includes(i.category))

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="flex gap-2">
          <Button onClick={() => setOpened({ item: newItem(trip.id, { category: 'Flight', bookingStatus: 'Booked' }), edit: true })}><Plus size={16} />Add booking</Button>
        </div>
      )}

      {booked.length === 0 && (
        <EmptyState icon={<Plane size={28} />} title="No travel details yet"
          hint="Save flights, hotels, car rentals and confirmations here — the things you'd hate to lose." />
      )}

      {GROUPS.map((g) => {
        const list = booked.filter((i) => g.cats.includes(i.category))
        if (!list.length) return null
        return (
          <section key={g.title}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"><g.icon size={16} />{g.title}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{list.map((i) => <BookingCard key={i.id} item={i} onOpen={() => setOpened({ item: i, edit: false })} />)}</div>
          </section>
        )
      })}

      {opened && <ItemModal trip={trip} item={opened.item} edit={opened.edit} canEdit={canEdit} onClose={() => setOpened(null)} />}
    </div>
  )
}

function Row({ label, value, copy }: { label: string; value?: string; copy?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5 text-slate-200">{value}
        {copy && <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(value) }} className="text-slate-500 hover:text-brand-300"><Copy size={12} /></button>}
      </span>
    </div>
  )
}

function BookingCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const b = item.booking || {}
  return (
    <Card className="cursor-pointer hover:ring-brand-500/40" onClick={onOpen}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-100">{item.title}</p>
          <p className="text-xs text-slate-500">{b.provider || item.category}{item.date && ` · ${fmtDate(item.date)}`}</p>
        </div>
        {item.bookingStatus === 'Booked'
          ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Booked</span>
          : item.bookingStatus === 'Need to book' ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">To book</span> : null}
      </div>
      <div className="space-y-1">
        <Row label="Reference" value={b.reference} copy />
        {b.legs && b.legs.length > 0 ? (
          <Row label={b.legs.length > 1 ? `Route (${b.legs.length} legs)` : 'Route'}
            value={(() => {
              const codes = [b.legs[0].fromCode, ...b.legs.map((l) => l.toCode)].filter(Boolean)
              return codes.length ? codes.join(' → ') : b.legs.map((l) => l.flightNumber).filter(Boolean).join(', ')
            })()} />
        ) : <>
          <Row label="Flight" value={b.flightNumber} />
          {(b.fromCode || b.toCode) && <Row label="Route" value={[b.fromCode, b.toCode].filter(Boolean).join(' → ')} />}
          <Row label="Seat" value={b.seat} />
        </>}
        <Row label="Address" value={b.address || item.address} />
        <Row label="Check-in" value={item.date ? `${fmtDate(item.date)}${item.startTime ? ' ' + item.startTime : ''}` : b.checkIn} />
        <Row label="Check-out" value={item.endDate ? `${fmtDate(item.endDate)}${item.endTime ? ' ' + item.endTime : ''}` : b.checkOut} />
        <Row label="Cancel by" value={b.cancellationDeadline ? fmtDate(b.cancellationDeadline) : undefined} />
        <Row label="Contact" value={b.contact} />
      </div>
      {b.checkInLink && (
        <a href={b.checkInLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200">Check-in link<ExternalLink size={12} /></a>
      )}
    </Card>
  )
}
