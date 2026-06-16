import { NavLink, Outlet, useParams, useOutletContext, Navigate } from 'react-router-dom'
import { LayoutGrid, CalendarRange, Lightbulb, Plane, CheckSquare, Luggage, Map as MapIcon } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import type { MemberRole, Trip } from '../lib/types'
import { classNames } from '../lib/util'

export interface TripCtx { trip: Trip; role: MemberRole | null; canEdit: boolean }
export const useTrip = () => useOutletContext<TripCtx>()

const TABS = [
  { to: '.', end: true, label: 'Overview', icon: LayoutGrid },
  { to: 'itinerary', label: 'Itinerary', icon: CalendarRange },
  { to: 'ideas', label: 'Ideas', icon: Lightbulb },
  { to: 'details', label: 'Travel', icon: Plane },
  { to: 'actions', label: 'Actions', icon: CheckSquare },
  { to: 'packing', label: 'Packing', icon: Luggage },
  { to: 'map', label: 'Map', icon: MapIcon },
]

export default function TripLayout() {
  const { id } = useParams()
  const trip = useApp((s) => s.trips.find((t) => t.id === id))
  const role = useApp((s) => (trip ? s.roleIn(trip) : null))

  if (!trip) return <Navigate to="/" replace />
  const canEdit = role === 'owner' || role === 'editor'
  const ctx: TripCtx = { trip, role, canEdit }

  return (
    <AppShell title={trip.name} back="/">
      <nav className="-mx-4 mb-5 flex gap-1 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <NavLink key={t.label} to={t.to} end={t.end} replace
            className={({ isActive }) => classNames(
              'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-brand-600 text-white' : 'bg-ink-900/60 text-slate-300 hover:bg-ink-800')}>
            <t.icon size={15} />{t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={ctx} />
    </AppShell>
  )
}
