import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Plane, Lightbulb, CheckSquare, Luggage } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import type { Trip } from '../lib/types'
import { Button, Card, AvatarStack, EmptyState, Chip } from '../ui/primitives'
import { fmtDateRange, countdownLabel, daysUntil, colorFromString } from '../lib/util'
import TripCreateModal from '../components/TripCreateModal'

export default function Home() {
  const trips = useApp((s) => s.myTrips())
  const items = useApp((s) => s.items)
  const actions = useApp((s) => s.actions)
  const profile = useApp((s) => s.profile)
  const [creating, setCreating] = useState(false)

  const upcoming = trips.filter((t) => (daysUntil(t.endDate || t.startDate) ?? 0) >= -1)
  const past = trips.filter((t) => (daysUntil(t.endDate || t.startDate) ?? 1) < -1)

  return (
    <AppShell bottomNav right={<Button size="sm" onClick={() => setCreating(true)}><Plus size={16} />Plan trip</Button>}>
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400"><Plane size={15} />Upcoming trips</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={<Plane size={28} />} title="No trips yet" hint="Start with just a name and a destination — add the rest whenever you like."
            action={<Button onClick={() => setCreating(true)}><Plus size={16} />Plan your first trip</Button>} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {upcoming.map((t) => <TripCard key={t.id} trip={t} items={items} actions={actions} profile={profile} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Past trips</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {past.map((t) => <TripCard key={t.id} trip={t} items={items} actions={actions} profile={profile} />)}
          </div>
        </section>
      )}

      {creating && <TripCreateModal onClose={() => setCreating(false)} />}
    </AppShell>
  )
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
