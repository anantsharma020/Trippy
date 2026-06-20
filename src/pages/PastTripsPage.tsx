import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { EmptyState } from '../ui/primitives'
import { History } from 'lucide-react'
import { TripCard, isPast } from './Home'

// Archived trips — anything whose last day has passed. Still fully openable.
export default function PastTripsPage() {
  const trips = useApp((s) => s.myTrips())
  const items = useApp((s) => s.items)
  const actions = useApp((s) => s.actions)
  const profile = useApp((s) => s.profile)

  const past = trips.filter(isPast).sort((a, b) => (b.endDate || b.startDate || '').localeCompare(a.endDate || a.startDate || ''))

  return (
    <AppShell title="Past trips" back="/">
      {past.length === 0 ? (
        <EmptyState icon={<History size={28} />} title="No past trips yet" hint="Trips move here the day after they end." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {past.map((t) => <TripCard key={t.id} trip={t} items={items} actions={actions} profile={profile} />)}
        </div>
      )}
    </AppShell>
  )
}
