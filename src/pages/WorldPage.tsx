import { useEffect, useMemo } from 'react'
import { Globe2 } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { daysUntil } from '../lib/util'
import { reverseCountryCode } from '../lib/api'
import { currencyFromCountry } from '../lib/currencies'
import { STATUS_COLOR, type WorldStatus } from '../lib/world'
import WorldMap from '../components/WorldMap'

export default function WorldPage() {
  useApp((s) => s.trips)
  const myTrips = useApp((s) => s.myTrips())
  const dreams = useApp((s) => s.myDreamTrips())
  const { saveTrip } = useApp.getState()

  // Backfill ISO country codes for any destination that lacks one, so it colours in.
  useEffect(() => {
    let live = true
    ;(async () => {
      for (const t of [...myTrips, ...dreams]) {
        const miss = t.destinations.find((d) => d.lat != null && !d.countryCode)
        if (!miss) continue
        const code = await reverseCountryCode(miss.lat!, miss.lng!)
        if (!live || !code) continue
        await saveTrip({ ...t, destinations: t.destinations.map((d) => d.id === miss.id ? { ...d, countryCode: code, currency: d.currency || currencyFromCountry(code) } : d) })
        break // one per pass; effect re-runs as state updates
      }
    })()
    return () => { live = false }
  }, [myTrips, dreams, saveTrip])

  const status = useMemo(() => {
    const m = new Map<string, WorldStatus>()
    const rank: Record<WorldStatus, number> = { want: 0, planned: 1, visited: 2 }
    const mark = (code: string | undefined, s: WorldStatus) => {
      if (!code) return
      const c = code.toUpperCase()
      const cur = m.get(c)
      if (!cur || rank[s] > rank[cur]) m.set(c, s)
    }
    myTrips.forEach((t) => {
      const ended = (daysUntil(t.endDate || t.startDate) ?? 1) < -1
      t.destinations.forEach((d) => mark(d.countryCode, ended ? 'visited' : 'planned'))
    })
    dreams.forEach((t) => t.destinations.forEach((d) => mark(d.countryCode, 'want')))
    return m
  }, [myTrips, dreams])

  const counts = useMemo(() => {
    const c = { visited: 0, planned: 0, want: 0 }
    status.forEach((s) => c[s]++)
    return c
  }, [status])

  return (
    <AppShell title="Your world" bottomNav>
      <div className="space-y-4">
        <WorldMap status={status} />
        <div className="flex flex-wrap gap-4 text-sm">
          <Legend color={STATUS_COLOR.visited} label="Visited" n={counts.visited} />
          <Legend color={STATUS_COLOR.planned} label="Planned" n={counts.planned} />
          <Legend color={STATUS_COLOR.want} label="Want to go" n={counts.want} />
        </div>
        {status.size === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 p-6 text-center text-sm text-slate-500">
            <Globe2 className="mx-auto mb-2 text-slate-400" size={26} />
            Add destinations to your trips and dreams — the countries will light up here.
          </div>
        )}
      </div>
    </AppShell>
  )
}

function Legend({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="flex items-center gap-2 text-slate-700">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} />
      {label} <span className="text-slate-400">{n}</span>
    </span>
  )
}
