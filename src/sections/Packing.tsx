import { useState } from 'react'
import { Plus, Luggage, Trash2, Sparkles, Check } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripPacking, newPacking, savePacking, deletePacking } from '../lib/data'
import { PACKING_CATEGORIES, type PackingCategory, type PackingItem } from '../lib/types'
import { PACKING_TEMPLATES } from '../lib/packingTemplates'
import { Button, Input, Select, Modal, EmptyState, Chip } from '../ui/primitives'
import { classNames } from '../lib/util'

export default function Packing() {
  const { trip, canEdit } = useTrip()
  useApp((s) => s.packing)
  const [quick, setQuick] = useState('')
  const [cat, setCat] = useState<PackingCategory>('Clothes')
  const [templates, setTemplates] = useState(false)

  const items = tripPacking(trip.id)
  const packed = items.filter((i) => i.packed).length
  const byCat = PACKING_CATEGORIES.map((c) => ({ cat: c, list: items.filter((i) => i.category === c) })).filter((g) => g.list.length)

  async function quickAdd() {
    if (!quick.trim()) return
    await savePacking(newPacking(trip.id, { title: quick.trim(), category: cat }))
    setQuick('')
  }
  const toggle = (i: PackingItem) => savePacking({ ...i, packed: !i.packed })

  return (
    <div className="space-y-4">
      {canEdit && (
        <>
          <div className="flex gap-2">
            <Select value={cat} onChange={(e) => setCat(e.target.value as PackingCategory)} className="w-auto">{PACKING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
            <Input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Add item…" className="flex-1" />
            <Button onClick={quickAdd}><Plus size={16} /></Button>
          </div>
          <Button variant="soft" size="sm" onClick={() => setTemplates(true)}><Sparkles size={15} />Start from a template</Button>
        </>
      )}

      {items.length > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{packed} of {items.length} packed</span><span>{Math.round((packed / items.length) * 100)}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-800"><div className="h-full bg-brand-500 transition-all" style={{ width: `${(packed / items.length) * 100}%` }} /></div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={<Luggage size={28} />} title="Nothing packed yet" hint="Add items by hand or start from a smart template."
          action={canEdit ? <Button onClick={() => setTemplates(true)}><Sparkles size={16} />Use a template</Button> : undefined} />
      ) : (
        <div className="space-y-4">
          {byCat.map((g) => (
            <div key={g.cat}>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">{g.cat} <span className="text-xs font-normal text-slate-500">· {g.list.filter((i) => i.packed).length}/{g.list.length}</span></h3>
              <div className="space-y-1.5">
                {g.list.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-3 py-2">
                    <button disabled={!canEdit} onClick={() => toggle(i)} className={classNames('grid h-5 w-5 shrink-0 place-items-center rounded-md border', i.packed ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-600')}>{i.packed && <Check size={13} />}</button>
                    <span className={classNames('flex-1 text-sm', i.packed ? 'text-slate-500 line-through' : 'text-slate-100')}>{i.title}</span>
                    {i.quantity > 1 && <Chip>×{i.quantity}</Chip>}
                    {i.bag && <span className="text-xs text-slate-500">{i.bag}</span>}
                    {canEdit && <button onClick={() => deletePacking(i.id)} className="text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {templates && <TemplatePicker trip={trip} onClose={() => setTemplates(false)} />}
    </div>
  )
}

function TemplatePicker({ trip, onClose }: { trip: any; onClose: () => void }) {
  async function apply(name: string) {
    for (const t of PACKING_TEMPLATES[name]) {
      await savePacking(newPacking(trip.id, { title: t.title, category: t.category, quantity: t.quantity || 1 }))
    }
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Packing templates">
      <p className="mb-3 text-sm text-slate-400">Add a ready-made checklist. You can edit or remove anything afterwards.</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.keys(PACKING_TEMPLATES).map((name) => (
          <button key={name} onClick={() => apply(name)} className="rounded-xl bg-ink-850 ring-1 ring-ink-700 px-3 py-3 text-left text-sm font-medium text-slate-200 hover:ring-brand-500">
            {name}<div className="text-xs font-normal text-slate-500">{PACKING_TEMPLATES[name].length} items</div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
