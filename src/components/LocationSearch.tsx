import { useEffect, useRef, useState } from 'react'
import { Search, MapPin } from 'lucide-react'
import { geocode, type GeoResult } from '../lib/api'
import { Input } from '../ui/primitives'

// Debounced geocoding search. Calls back with a chosen place (name + coords).
export default function LocationSearch({ placeholder = 'Search a place…', onPick }: {
  placeholder?: string
  onPick: (r: GeoResult) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<number>()

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    timer.current = window.setTimeout(async () => {
      try { setResults(await geocode(q)); setOpen(true) } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
    return () => window.clearTimeout(timer.current)
  }, [q])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder} className="pl-9" />
      </div>
      {open && (q.trim().length >= 2) && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl bg-ink-850 ring-1 ring-ink-700 shadow-xl">
          {loading && <div className="px-3 py-3 text-sm text-slate-500">Searching…</div>}
          {!loading && results.length === 0 && <div className="px-3 py-3 text-sm text-slate-500">No matches</div>}
          {results.map((r, i) => (
            <button key={i} type="button"
              // Use pointerdown (not click): on touch keyboards the input blur can
              // swallow the click before it registers. preventDefault keeps focus.
              onPointerDown={(e) => { e.preventDefault(); onPick(r); setQ(''); setResults([]); setOpen(false) }}
              className="flex w-full items-start gap-2 px-3 py-3 text-left hover:bg-ink-800">
              <MapPin size={15} className="mt-0.5 text-brand-500 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-800">{r.name}</span>
                {r.detail && <span className="block truncate text-xs text-slate-500">{r.detail}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
