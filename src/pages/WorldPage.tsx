import { useEffect, useMemo, useState } from 'react'
import { Globe2, Plus, X, Search } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { daysUntil } from '../lib/util'
import { reverseCountryCode } from '../lib/api'
import { currencyFromCountry } from '../lib/currencies'
import { STATUS_COLOR, type WorldStatus } from '../lib/world'
import { COUNTRIES, COUNTRY_NAME, COUNTRY_CONTINENT } from '../lib/countries'
import { Button, Card, Modal, Input } from '../ui/primitives'
import WorldMap from '../components/WorldMap'

export default function WorldPage() {
  useApp((s) => s.trips); useApp((s) => s.profiles)
  const myTrips = useApp((s) => s.myTrips())
  const dreams = useApp((s) => s.myDreamTrips())
  const me = useApp((s) => s.me())
  const { saveTrip, updateProfile } = useApp.getState()
  const [adding, setAdding] = useState(false)

  const manualVisited = me?.visitedCountries ?? []

  // Backfill ISO country codes for any destination that lacks one.
  useEffect(() => {
    let live = true
    ;(async () => {
      for (const t of [...myTrips, ...dreams]) {
        const miss = t.destinations.find((d) => d.lat != null && !d.countryCode)
        if (!miss) continue
        const code = await reverseCountryCode(miss.lat!, miss.lng!)
        if (!live || !code) continue
        await saveTrip({ ...t, destinations: t.destinations.map((d) => d.id === miss.id ? { ...d, countryCode: code, currency: d.currency || currencyFromCountry(code) } : d) })
        break
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
      if (!m.get(c) || rank[s] > rank[m.get(c)!]) m.set(c, s)
    }
    myTrips.forEach((t) => {
      const ended = (daysUntil(t.endDate || t.startDate) ?? 1) < -1
      t.destinations.forEach((d) => mark(d.countryCode, ended ? 'visited' : 'planned'))
    })
    dreams.forEach((t) => t.destinations.forEach((d) => mark(d.countryCode, 'want')))
    manualVisited.forEach((c) => mark(c, 'visited'))
    return m
  }, [myTrips, dreams, manualVisited])

  const visitedCodes = useMemo(() => [...status.entries()].filter(([, s]) => s === 'visited').map(([c]) => c), [status])
  const continents = useMemo(() => new Set(visitedCodes.map((c) => COUNTRY_CONTINENT[c]).filter(Boolean)), [visitedCodes])

  const toggleManual = (code: string) => {
    const set = new Set(manualVisited)
    set.has(code) ? set.delete(code) : set.add(code)
    updateProfile({ visitedCountries: [...set] })
  }

  return (
    <AppShell title="Your world" bottomNav
      right={<Button size="sm" onClick={() => setAdding(true)}><Plus size={16} />Visited</Button>}>
      <div className="space-y-4">
        {/* Prominent counters */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <div className="text-4xl font-bold text-emerald-600">{visitedCodes.length}</div>
            <div className="mt-0.5 text-sm text-slate-500">countries visited</div>
          </Card>
          <Card className="text-center">
            <div className="text-4xl font-bold text-emerald-600">{continents.size}<span className="text-2xl text-slate-400">/7</span></div>
            <div className="mt-0.5 text-sm text-slate-500">continents visited</div>
          </Card>
        </div>

        <WorldMap status={status} />
        <div className="flex flex-wrap gap-4 text-sm">
          <Legend color={STATUS_COLOR.visited} label="Visited" />
          <Legend color={STATUS_COLOR.planned} label="Planned" />
          <Legend color={STATUS_COLOR.want} label="Want to go" />
        </div>

        {manualVisited.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Marked visited</p>
            <div className="flex flex-wrap gap-2">
              {manualVisited.map((c) => (
                <button key={c} onClick={() => toggleManual(c)}
                  className="flex items-center gap-1.5 rounded-full bg-ink-850 ring-1 ring-ink-700 py-1 pl-3 pr-2 text-sm text-slate-700 hover:ring-rose-400">
                  {COUNTRY_NAME[c] || c}<X size={13} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {adding && <AddVisitedModal selected={new Set(manualVisited)} onToggle={toggleManual} onClose={() => setAdding(false)} />}
    </AppShell>
  )
}

function AddVisitedModal({ selected, onToggle, onClose }: {
  selected: Set<string>; onToggle: (code: string) => void; onClose: () => void
}) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return COUNTRIES.filter((c) => !s || c.name.toLowerCase().includes(s)).slice(0, 60)
  }, [q])

  return (
    <Modal open onClose={onClose} title="Countries you've visited">
      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a country…" className="pl-9" autoFocus />
      </div>
      <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
        {list.map((c) => {
          const on = selected.has(c.code)
          return (
            <button key={c.code} onClick={() => onToggle(c.code)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${on ? 'bg-emerald-500/15 text-emerald-700' : 'hover:bg-ink-800 text-slate-700'}`}>
              <span>{c.name} <span className="text-xs text-slate-400">· {c.continent}</span></span>
              {on && <span className="text-xs font-medium">✓ Visited</span>}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-slate-700">
      <span className="h-3 w-3 rounded-sm" style={{ background: color }} />{label}
    </span>
  )
}
