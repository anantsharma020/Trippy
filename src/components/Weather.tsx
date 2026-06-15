import { useEffect, useState } from 'react'
import type { Destination } from '../lib/types'
import { weatherFor, summarize, type WeatherResult } from '../lib/api'
import { fmtDate } from '../lib/util'

export default function Weather({ destinations }: { destinations: Destination[] }) {
  const withCoords = destinations.filter((d) => d.lat != null && d.lng != null)
  if (withCoords.length === 0) return <p className="text-sm text-slate-500">Add destinations with a location to see weather.</p>
  return (
    <div className="space-y-2">
      {withCoords.map((d) => <DestWeather key={d.id} dest={d} />)}
    </div>
  )
}

function DestWeather({ dest }: { dest: Destination }) {
  const [res, setRes] = useState<WeatherResult | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let live = true
    setRes(null); setErr(false)
    weatherFor(dest.lat!, dest.lng!, dest.startDate, dest.endDate)
      .then((r) => live && setRes(r)).catch(() => live && setErr(true))
    return () => { live = false }
  }, [dest.lat, dest.lng, dest.startDate, dest.endDate])

  const s = res ? summarize(res.days) : null

  return (
    <div className="flex items-center justify-between rounded-xl bg-ink-850/60 px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-slate-200">{dest.name}</p>
        <p className="text-xs text-slate-500">
          {dest.startDate ? `${fmtDate(dest.startDate)}${dest.endDate ? `–${fmtDate(dest.endDate)}` : ''}` : 'Dates TBD'}
          {res && <span className="ml-1 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-brand-300">{res.kind === 'forecast' ? 'Forecast' : 'Typical'}</span>}
        </p>
      </div>
      <div className="text-right">
        {err && <span className="text-xs text-slate-500">Unavailable</span>}
        {!err && !s && <span className="text-xs text-slate-500">Loading…</span>}
        {s && <p className="text-sm text-slate-100">{s.emoji} {s.min}–{s.max}°C</p>}
        {s && <p className="text-xs text-slate-500">{s.label}</p>}
      </div>
    </div>
  )
}
