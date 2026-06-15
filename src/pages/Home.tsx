import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Sparkles, Globe2, Plane, Lightbulb, CheckSquare, Luggage } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { newDream, myDreams } from '../lib/data'
import type { Dream, Trip } from '../lib/types'
import { Button, Card, AvatarStack, EmptyState, Chip } from '../ui/primitives'
import { fmtDateRange, countdownLabel, daysUntil, colorFromString } from '../lib/util'
import TripCreateModal from '../components/TripCreateModal'
import DreamModal from '../components/DreamModal'
import MapView, { type MapPoint } from '../components/MapView'

export default function Home() {
  const trips = useApp((s) => s.myTrips())
  const items = useApp((s) => s.items)
  const actions = useApp((s) => s.actions)
  const profile = useApp((s) => s.profile)
  useApp((s) => s.dreams)
  const dreams = myDreams()
  const [creating, setCreating] = useState(false)
  const [dream, setDream] = useState<Dream | null>(null)

  const upcoming = trips.filter((t) => (daysUntil(t.endDate || t.startDate) ?? 0) >= -1)
  const past = trips.filter((t) => (daysUntil(t.endDate || t.startDate) ?? 1) < -1)

  const worldPoints: MapPoint[] = useMemo(() => {
    const pts: MapPoint[] = []
    trips.forEach((t) => t.destinations.forEach((d) => {
      if (d.lat != null && d.lng != null) {
        const planned = (daysUntil(t.endDate || t.startDate) ?? 0) >= -1
        pts.push({ id: `${t.id}-${d.id}`, lat: d.lat, lng: d.lng, label: d.name, sub: t.name, color: planned ? '#8b5cf6' : '#64748b' })
      }
    }))
    dreams.forEach((d) => { if (d.lat != null && d.lng != null) pts.push({ id: d.id, lat: d.lat, lng: d.lng, label: d.name, sub: 'Dream destination', color: '#f59e0b' }) })
    return pts
  }, [trips, dreams])

  return (
    <AppShell right={<Button size="sm" onClick={() => setCreating(true)}><Plus size={16} />Plan trip</Button>}>
      {/* Upcoming trips */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400"><Plane size={15} />Upcoming trips</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={<Plane size={28} />} title="No trips yet" hint="Start with just a name and a destination — add the rest whenever you like."
            action={<Button onClick={() => setCreating(true)}><Plus size={16} />Plan your first trip</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((t) => <TripCard key={t.id} trip={t} items={items} actions={actions} profile={profile} />)}
          </div>
        )}
      </section>

      {/* Dream destinations */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400"><Sparkles size={15} />Dream destinations</h2>
          <Button size="sm" variant="soft" onClick={() => setDream(newDream())}><Plus size={15} />Add</Button>
        </div>
        {dreams.length === 0 ? (
          <p className="text-sm text-slate-500">Places you want to visit someday. Add one, then turn it into a trip when you're ready.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dreams.map((d) => (
              <button key={d.id} onClick={() => setDream(d)}
                className="group flex items-center gap-2 rounded-2xl bg-ink-900/70 ring-1 ring-ink-800 px-3 py-2 hover:ring-brand-500/50">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.status === 'Visited' ? '#10b981' : d.status === 'Planned' ? '#8b5cf6' : '#f59e0b' }} />
                <span className="text-sm font-medium text-slate-200">{d.name}</span>
                {d.priority === 'High' && <Chip className="bg-rose-500/15 text-rose-300">★</Chip>}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* World map */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400"><Globe2 size={15} />Your world</h2>
        {worldPoints.length === 0 ? (
          <p className="text-sm text-slate-500">Trips and dream destinations will appear on the map here.</p>
        ) : (
          <>
            <MapView points={worldPoints} height={300} />
            <div className="mt-2 flex gap-4 text-xs text-slate-400">
              <Legend color="#8b5cf6" label="Planned" /><Legend color="#64748b" label="Visited" /><Legend color="#f59e0b" label="Want to go" />
            </div>
          </>
        )}
      </section>

      {past.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Past trips</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((t) => <TripCard key={t.id} trip={t} items={items} actions={actions} profile={profile} />)}
          </div>
        </section>
      )}

      {creating && <TripCreateModal onClose={() => setCreating(false)} />}
      {dream && <DreamModal dream={dream} onClose={() => setDream(null)} />}
    </AppShell>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>
}

function TripCard({ trip, items, actions, profile }: {
  trip: Trip; items: any[]; actions: any[]; profile: (id?: string) => any
}) {
  const ti = items.filter((i) => i.tripId === trip.id)
  const ideas = ti.filter((i) => !i.date).length
  const bookings = ti.filter((i) => i.bookingStatus === 'Booked').length
  const openActions = actions.filter((a) => a.tripId === trip.id && a.status !== 'Done' && a.status !== 'Not needed').length
  const route = trip.destinations.map((d) => d.name).join(' → ')
  const partners = [trip.ownerId, ...trip.members.map((m) => m.userId)].filter((v, i, a) => a.indexOf(v) === i)
    .map((id) => profile(id)?.name).filter(Boolean)
  const cd = countdownLabel(trip.startDate)

  return (
    <Link to={`/trip/${trip.id}`}>
      <Card className="relative overflow-hidden p-0 transition hover:ring-brand-500/40">
        <div className="h-24 w-full" style={{ background: trip.coverImage ? `url(${trip.coverImage}) center/cover` : `linear-gradient(135deg, ${colorFromString(trip.name)}, #0f172a)` }} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">{trip.name}</h3>
            {cd && <Chip className="bg-brand-500/15 text-brand-300 shrink-0">{cd}</Chip>}
          </div>
          {route && <p className="mt-0.5 truncate text-sm text-slate-400">{route}</p>}
          <p className="mt-1 text-sm text-slate-400">{fmtDateRange(trip.startDate, trip.endDate)}</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Lightbulb size={13} />{ideas}</span>
              <span className="flex items-center gap-1"><CheckSquare size={13} />{openActions}</span>
              <span className="flex items-center gap-1"><Luggage size={13} />{bookings}</span>
            </div>
            {partners.length > 0 && <AvatarStack names={partners} />}
          </div>
        </div>
      </Card>
    </Link>
  )
}
