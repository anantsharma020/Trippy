import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, CloudSun, Coins, CalendarRange, CheckSquare, Plane, Luggage, ChevronRight } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripItems, tripActions, tripPacking } from '../lib/data'
import { Card, AvatarStack, Chip } from '../ui/primitives'
import { fmtDateRange, nights, countdownLabel } from '../lib/util'
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
  const packing = tripPacking(trip.id)

  const ideas = items.filter((i) => !i.date)
  // Accommodation lives in Travel Details, not the itinerary.
  const scheduled = items.filter((i) => i.date && i.category !== 'Accommodation')
    .sort((a, b) => (a.date! + (a.startTime || '')).localeCompare(b.date! + (b.startTime || '')))
  const upcomingItin = scheduled.slice(0, 4)

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
              {countdownLabel(trip.startDate) && <Chip className="bg-brand-500/15 text-brand-300">{countdownLabel(trip.startDate)}</Chip>}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SecHead icon={<CloudSun size={16} />} title="Weather" />
          <Weather destinations={trip.destinations} />
        </Card>
        <Card>
          <SecHead icon={<Coins size={16} />} title="Currency → EUR" />
          <Currency currencies={currencies} />
        </Card>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SecHead icon={<CheckSquare size={16} />} title="Open action items" to={`/trip/${trip.id}/actions`} />
          {openActions.length === 0 ? <Empty>No open tasks.</Empty> : (
            <div className="space-y-1.5">
              {openActions.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">{a.title}</span>
                  {a.priority === 'High' && <Chip className="bg-rose-500/15 text-rose-300">High</Chip>}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <SecHead icon={<Plane size={16} />} title="Key travel details" to={`/trip/${trip.id}/details`} />
          {bookings.length === 0 ? <Empty>No bookings saved yet.</Empty> : (
            <div className="space-y-1.5">
              {bookings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">{b.title}</span>
                  <span className="text-xs text-slate-500">{b.category}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

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
