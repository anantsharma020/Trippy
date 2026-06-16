import { useState } from 'react'
import { Save, Plus, X } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { PACKING_CATEGORIES, type PackItem, type PackingCategory } from '../lib/types'
import { Button, Card, Input, Select } from '../ui/primitives'

// Personal essentials, auto-added to every packing template the user applies.
export default function CorePackingPage() {
  const me = useApp((s) => s.me())
  const updateProfile = useApp((s) => s.updateProfile)
  const [items, setItems] = useState<PackItem[]>(me?.corePacking ?? [])
  const [saved, setSaved] = useState(false)

  const setItem = (i: number, patch: Partial<PackItem>) =>
    setItems((arr) => arr.map((it, x) => (x === i ? { ...it, ...patch } : it)))

  async function save() {
    await updateProfile({ corePacking: items.filter((it) => it.title.trim()) })
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  return (
    <AppShell title="Core packing list" back="/profile">
      <Card className="space-y-3">
        <p className="text-sm text-slate-500">Your personal essentials — added automatically to every packing template you apply, so you never forget them. This is yours alone; travel partners have their own.</p>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><Input value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="e.g. Contact lenses" /></div>
              <div className="w-32 shrink-0"><Select value={it.category} onChange={(e) => setItem(i, { category: e.target.value as PackingCategory })} className="py-1.5 text-sm">
                {PACKING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select></div>
              <button onClick={() => setItems((arr) => arr.filter((_, x) => x !== i))} className="shrink-0 text-slate-400 hover:text-rose-500"><X size={15} /></button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-500">No core items yet — add the things you bring on every trip.</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-ink-800 pt-3">
          <Button variant="soft" size="sm" onClick={() => setItems((arr) => [...arr, { title: '', category: 'Miscellaneous' }])}><Plus size={14} />Add item</Button>
          <div className="ml-auto flex items-center gap-2">
            {saved && <span className="text-sm text-emerald-500">Saved!</span>}
            <Button size="sm" onClick={save}><Save size={15} />Save</Button>
          </div>
        </div>
      </Card>
    </AppShell>
  )
}
