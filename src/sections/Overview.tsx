import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, CloudSun, Coins, CalendarRange, CheckSquare, Plane, Luggage, ChevronRight, ChevronDown, Copy, ExternalLink } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripItems, tripActions, myPacking, CATEGORY_EMOJI } from '../lib/data'
import type { Item } from '../lib/types'
import { Card, AvatarStack, Chip } from '../ui/primitives'
import { fmtDateRange, nights, tripStatusLabel, daysUntil, todayISO, fmtDate } from '../lib/util'
import { currencyForDestination, currencyFromCountry } from '../lib/currencies'
import { reverseCountryCode } from '../lib/api'
import { scheduleLabel } from '../components/ItemCard'
import Weather from '../components/Weather'
import Currency from '../components/Currency'
import TripSettingsModal from '../components/TripSettingsModal'

export default function Overview() {
  const { trip, canEdit } = useTrip()
  const profile = useApp((s) => s.profile)
  useApp((s) => s.items); useApp((s) => s.actions); useApp((s) => s.packing)
  const [settings, setSettings] = useState(false)

  const items = tripItems(trip.id)
  const actions = tripActions(trip.id)
  const packing = myPacking(trip.id, trip.ownerId)
  const today = todayISO()

  const ideas = items.filter((i) => !i.date)
  // Accommodation lives in Travel Details, not the itinerary. Show the next four
  // things still to come (today or later), not events already behind us.
  const scheduled = items.filter((i) => i.date && i.category !== 'Accommodation')
    .sort((a, b) => (a.date! + (a.startTime || '')).localeCompare(b.date! + (b.startTime || '')))
  const upcomingItin = scheduled.filter((i) => (i.endDate || i.date!) >= today).slice(0, 4)

  // Backfill currency for destinations added before we captured country codes.
  const { saveTrip } = useApp.getState()
  useEffect(() => {
    if (!canEdit) return
    const missing = trip.destinations.find((d) => d.lat != null && !d.currency && !d.countryCode)
    if (!missing) return
    let live = true
    reverseCountryCode(missing.lat!, missing.lng!).then((code) => {
      if (!live || !code) return
      const destinations = trip.destinations.map((d) =>
        d.id === missing.id ? { ...d, countryCode: code, currency: currencyFromCountry(code) } : d)
      saveTrip({ ...trip, destinations })
    })
    return () => { live = false }
  }, [trip, canEdit, saveTrip])
  const openActions = actions.filter((a) => a.status !== 'Done' && a.status !== 'Not needed')
  const bookings = items.filter((i) => i.bookingStatus === 'Booked')
  const packed = packing.filter((p) => p.packed).length

  const me = useApp((s) => s.user)
  const memberIds = [trip.ownerId, ...trip.members.map((m) => m.userId)].filter((v, i, a) => a.indexOf(v) === i)
  const partners = memberIds.map((id) => profile(id)?.name).filter(Boolean) as string[]
  // Everyone on the trip except the person viewing it.
  const others = memberIds.filter((id) => id !== me?.id).map((id) => profile(id)?.name).filter(Boolean) as string[]
  const currencies = trip.destinations.map((d) => currencyForDestination(d)).filter(Boolean) as string[]

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{trip.name}</h2>
              {tripStatusLabel(trip.startDate, trip.endDate) && <Chip className="bg-brand-500/15 text-brand-300">{tripStatusLabel(trip.startDate, trip.endDate)}</Chip>}
            </div>
            <p className="mt-1 text-sm text-slate-400">{fmtDateRange(trip.startDate, trip.endDate)}{nights(trip.startDate, trip.endDate) > 0 && ` · ${nights(trip.startDate, trip.endDate)} nights`}</p>
            {trip.destinations.length > 0 && <p className="mt-0.5 text-sm text-slate-400">{trip.destinations.map((d) => d.name).join(' → ')}</p>}
          </div>
          {canEdit && <button onClick={() => setSettings(true)} className="rounded-lg p-2 text-slate-400 hover:bg-ink-800"><Settings size={18} /></button>}
        </div>
        {partners.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <AvatarStack names={partners} />
            <span className="text-sm text-slate-400">{others.length > 0 ? `Traveling with ${others.join(', ')}` : 'Solo trip'}</span>
          </div>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat n={ideas.length} label="ideas" />
          <Stat n={openActions.length} label="open tasks" />
          <Stat n={bookings.length} label="booked" />
        </div>
      </Card>

      {/* Open tasks — only when there's actually something open. */}
      {openActions.length > 0 && (
        <Card>
          <SecHead icon={<CheckSquare size={16} />} title="Open action items" to={`/trip/${trip.id}/actions`} />
          <div className="space-y-1.5">
            {openActions.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-200">{a.title}</span>
                {a.priority === 'High' && <Chip className="bg-rose-500/15 text-rose-300">High</Chip>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SecHead icon={<CalendarRange size={16} />} title="Upcoming itinerary" to={`/trip/${trip.id}/itinerary`} />
        {upcomingItin.length === 0 ? <Empty>Nothing scheduled yet. Add dates to ideas to build your itinerary.</Empty> : (
          <div className="space-y-2">
            {upcomingItin.map((i) => (
              <Link key={i.id} to={`/trip/${trip.id}/itinerary`} className="flex items-center justify-between rounded-xl bg-ink-850/60 px-3 py-2 hover:bg-ink-800">
                <span className="text-sm text-slate-200">{i.title}</span>
                <span className="text-xs text-brand-300">{scheduleLabel(i)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <KeyTravel items={items} tripId={trip.id} today={today} />

      <Card>
        <SecHead icon={<Coins size={16} />} title="Currency → EUR" />
        <Currency currencies={currencies} />
      </Card>

      <Card>
        <SecHead icon={<CloudSun size={16} />} title="Weather" />
        <Weather destinations={trip.destinations} />
      </Card>

      <Card>
        <SecHead icon={<Luggage size={16} />} title="Packing progress" to={`/trip/${trip.id}/packing`} />
        {packing.length === 0 ? <Empty>No packing list yet.</Empty> : (
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{packed} of {packing.length} packed</span><span>{Math.round((packed / packing.length) * 100)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-800"><div className="h-full bg-brand-500 transition-all" style={{ width: `${(packed / packing.length) * 100}%` }} /></div>
          </div>
        )}
      </Card>

      {settings && <TripSettingsModal trip={trip} onClose={() => setSettings(false)} />}
    </div>
  )
}

const Stat = ({ n, label }: { n: number; label: string }) => (
  <div className="rounded-xl bg-ink-850 py-2"><div className="text-lg font-bold text-slate-900">{n}</div><div className="text-xs text-slate-400">{label}</div></div>
)
const SecHead = ({ icon, title, to }: { icon: React.ReactNode; title: string; to?: string }) => (
  <div className="mb-3 flex items-center justify-between">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">{icon}{title}</h3>
    {to && <Link to={to} className="flex items-center text-xs text-brand-300 hover:text-brand-200">Open<ChevronRight size={14} /></Link>}
  </div>
)
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-slate-500">{children}</p>

// Smart "key travel details": surfaces only what's relevant right now — your
// current (or next) accommodation, plus flights / car pick-ups / transfers within
// the next three days. Each tile expands inline so you don't have to leave Overview.
const SOON_DAYS = 3
const NEAR_TRANSPORT = ['Flight', 'Car rental', 'Train', 'Ferry', 'Transfer']

function KeyTravel({ items, tripId, today }: { items: Item[]; tripId: string; today: string }) {
  const [openId, setOpenId] = useState<string | null>(null)

  const accom = items.filter((i) => i.category === 'Accommodation' && i.date)
  const current = accom.find((i) => i.date! <= today && (i.endDate || i.date!) >= today)
  const nextStay = accom.filter((i) => i.date! > today).sort((a, b) => a.date!.localeCompare(b.date!))[0]
  const stay = current || nextStay

  const soon = items
    .filter((i) => NEAR_TRANSPORT.includes(i.category) && i.date)
    .filter((i) => { const d = daysUntil(i.date); return d !== null && d >= 0 && d <= SOON_DAYS })
    .sort((a, b) => a.date!.localeCompare(b.date!))

  const relevant = [...(stay ? [stay] : []), ...soon]
  if (relevant.length === 0) return null

  return (
    <Card>
      <SecHead icon={<Plane size={16} />} title="Key travel details" to={`/trip/${tripId}/details`} />
      <div className="space-y-2">
        {relevant.map((i) => (
          <TravelTile key={i.id} item={i} isCurrent={i === current}
            open={openId === i.id} onToggle={() => setOpenId(openId === i.id ? null : i.id)} />
        ))}
      </div>
    </Card>
  )
}

function relevanceLabel(i: Item, isCurrent: boolean): string {
  if (i.category === 'Accommodation') {
    return isCurrent
      ? `Now · check out ${fmtDate(i.endDate || i.date)}`
      : `Check-in ${fmtDate(i.date, 'EEE, MMM d')}${i.startTime ? ` · ${i.startTime}` : ''}`
  }
  const d = daysUntil(i.date) ?? 0
  const when = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`
  return `${when}${i.startTime ? ` · ${i.startTime}` : ` · ${fmtDate(i.date, 'EEE')}`}`
}

function TravelTile({ item, isCurrent, open, onToggle }: {
  item: Item; isCurrent: boolean; open: boolean; onToggle: () => void
}) {
  const b = item.booking || {}
  const route = b.legs?.length
    ? [b.legs[0].fromCode, ...b.legs.map((l) => l.toCode)].filter(Boolean).join(' → ')
    : [b.fromCode, b.toCode].filter(Boolean).join(' → ')

  return (
    <div className="overflow-hidden rounded-xl bg-ink-850/60 ring-1 ring-ink-800">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-ink-800">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-800 text-base">{CATEGORY_EMOJI[item.category]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">{item.title || item.category}</span>
          <span className="text-xs text-brand-300">{relevanceLabel(item, isCurrent)}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-1 border-t border-ink-800 px-3 py-2.5">
          <DRow label="Provider" value={b.provider} />
          <DRow label="Reference" value={b.reference} copy />
          <DRow label="Route" value={route || undefined} />
          <DRow label="Flight" value={b.flightNumber} />
          <DRow label="Seat" value={b.seat} />
          <DRow label="Address" value={b.address || item.address} />
          <DRow label="Check-in" value={item.date ? `${fmtDate(item.date)}${item.startTime ? ' ' + item.startTime : ''}` : b.checkIn} />
          <DRow label="Check-out" value={item.endDate ? `${fmtDate(item.endDate)}${item.endTime ? ' ' + item.endTime : ''}` : b.checkOut} />
          <DRow label="Cancel by" value={b.cancellationDeadline ? fmtDate(b.cancellationDeadline) : undefined} />
          <DRow label="Contact" value={b.contact} />
          {item.notes && <p className="pt-1 text-xs text-slate-500">{item.notes}</p>}
          {b.checkInLink && (
            <a href={b.checkInLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 pt-1 text-xs text-brand-300 hover:text-brand-200">Check-in link<ExternalLink size={12} /></a>
          )}
        </div>
      )}
    </div>
  )
}

function DRow({ label, value, copy }: { label: string; value?: string; copy?: boolean }) {
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
