import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { fxRates, toEUR } from '../lib/api'
import { Input } from '../ui/primitives'

// Shows destination currencies converted to EUR with a quick converter.
export default function Currency({ currencies }: { currencies: string[] }) {
  const list = currencies.filter((c) => c && c !== 'EUR').filter((v, i, a) => a.indexOf(v) === i)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [cur, setCur] = useState(list[0] || '')
  const [amount, setAmount] = useState('1000')

  useEffect(() => { fxRates().then(setRates).catch(() => {}) }, [])
  useEffect(() => { if (!cur && list[0]) setCur(list[0]) }, [list, cur])

  if (list.length === 0) return <p className="text-sm text-slate-500">Destination currency is EUR — no conversion needed.</p>

  const rate = rates[cur]
  const eur = rate ? toEUR(Number(amount) || 0, cur, rates) : null
  const samples = [1000, 5000, 10000]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <button key={c} onClick={() => setCur(c)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${cur === c ? 'bg-brand-600 text-white' : 'bg-ink-800 text-slate-300'}`}>
            {c} → EUR
          </button>
        ))}
      </div>
      {rate ? (
        <>
          <div className="flex items-center gap-2">
            <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className="w-32" />
            <span className="text-sm text-slate-400">{cur}</span>
            <ArrowRight size={16} className="text-slate-500" />
            <span className="text-lg font-semibold text-brand-300">≈ €{eur != null ? eur.toFixed(2) : '—'}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            {samples.map((s) => {
              const e = toEUR(s, cur, rates)
              return <span key={s} className="rounded-lg bg-ink-850 px-2 py-1">{s.toLocaleString()} {cur} ≈ €{e != null ? Math.round(e) : '—'}</span>
            })}
          </div>
          <p className="text-[11px] text-slate-600">1 EUR ≈ {rate.toFixed(rate > 50 ? 0 : 2)} {cur}</p>
        </>
      ) : <p className="text-sm text-slate-500">Loading rates…</p>}
    </div>
  )
}
