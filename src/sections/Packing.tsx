import { useEffect, useState } from 'react'
import { Plus, Luggage, Trash2, Sparkles, Check, Pencil, X } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import {
  tripPacking, newPacking, savePacking, deletePacking,
  myTemplates, savePackTemplate, deletePackTemplate, newPackTemplate, seedTemplates,
} from '../lib/data'
import { PACKING_CATEGORIES, type PackingCategory, type PackingItem, type PackTemplate } from '../lib/types'
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
  const byCat = PACKING_CATEGORIES
    .map((c) => ({ cat: c, list: items.filter((i) => i.category === c).sort((a, b) => a.title.localeCompare(b.title)) }))
    .filter((g) => g.list.length)

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
            <div className="min-w-0 flex-1"><Input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Add item…" /></div>
            <div className="w-32 shrink-0"><Select value={cat} onChange={(e) => setCat(e.target.value as PackingCategory)} className="py-1.5 text-sm">{PACKING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></div>
            <Button onClick={quickAdd} className="shrink-0"><Plus size={16} /></Button>
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
                {g.list.map((i) => <PackRow key={i.id} item={i} canEdit={canEdit} onToggle={() => toggle(i)} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {templates && <TemplatePicker trip={trip} onClose={() => setTemplates(false)} />}
    </div>
  )
}

// A single packing row with an editable title. The title commits on blur so the
// list doesn't re-sort (and the row jump) while you're still typing.
function PackRow({ item, canEdit, onToggle }: { item: PackingItem; canEdit: boolean; onToggle: () => void }) {
  const [title, setTitle] = useState(item.title)
  // Keep in sync if the stored title changes elsewhere.
  useEffect(() => { setTitle(item.title) }, [item.title])
  const commit = () => { const t = title.trim(); if (t && t !== item.title) savePacking({ ...item, title: t }); else if (!t) setTitle(item.title) }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-3 py-2">
      <button disabled={!canEdit} onClick={onToggle} className={classNames('grid h-5 w-5 shrink-0 place-items-center rounded-md border', item.packed ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-600')}>{item.packed && <Check size={13} />}</button>
      {canEdit ? (
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={classNames('min-w-0 flex-1 bg-transparent text-sm outline-none', item.packed ? 'text-slate-500 line-through' : 'text-slate-900')} />
      ) : (
        <span className={classNames('min-w-0 flex-1 truncate text-sm', item.packed ? 'text-slate-500 line-through' : 'text-slate-100')}>{item.title}</span>
      )}
      {item.bag && <span className="shrink-0 text-xs text-slate-500">{item.bag}</span>}
      {canEdit ? (
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-ink-850 ring-1 ring-ink-700">
          <button onClick={() => savePacking({ ...item, quantity: Math.max(1, item.quantity - 1) })} className="grid h-6 w-6 place-items-center text-slate-500 hover:text-slate-800">−</button>
          <span className="w-5 text-center text-xs tabular-nums text-slate-700">{item.quantity}</span>
          <button onClick={() => savePacking({ ...item, quantity: item.quantity + 1 })} className="grid h-6 w-6 place-items-center text-slate-500 hover:text-slate-800">+</button>
        </div>
      ) : item.quantity > 1 && <Chip>×{item.quantity}</Chip>}
      {canEdit && <button onClick={() => deletePacking(item.id)} className="shrink-0 text-slate-500 hover:text-rose-400"><Trash2 size={14} /></button>}
    </div>
  )
}

function TemplatePicker({ trip, onClose }: { trip: any; onClose: () => void }) {
  useApp((s) => s.packTemplates)
  const me = useApp((s) => s.me())
  const templates = myTemplates()
  const [editing, setEditing] = useState<PackTemplate | null>(null)
  const core = me?.corePacking ?? []

  // Copy the built-in templates into the user's editable library on first open.
  useEffect(() => { seedTemplates() }, [])

  async function apply(t: PackTemplate) {
    // Fold in your personal core list, and skip anything already on the trip's
    // list — so the core items (and shared basics) never double up across templates.
    const seen = new Set(tripPacking(trip.id).map((p) => p.title.trim().toLowerCase()))
    for (const it of [...core, ...t.items]) {
      const k = it.title.trim().toLowerCase()
      if (!k || seen.has(k)) continue
      seen.add(k)
      await savePacking(newPacking(trip.id, { title: it.title, category: it.category, quantity: it.quantity || 1 }))
    }
    onClose()
  }

  if (editing) return <TemplateEditor template={editing} onClose={() => setEditing(null)} />

  return (
    <Modal open onClose={onClose} title="Packing templates">
      <p className="mb-3 text-sm text-slate-500">Your templates — tap to add to this trip{core.length > 0 ? ', including your core list' : ''}. Edit or delete to make them your own.</p>
      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl bg-ink-850 ring-1 ring-ink-700 px-3 py-2.5">
            <button onClick={() => apply(t)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-slate-900">{t.name || 'Untitled'}</span>
              <span className="text-xs text-slate-500">{t.items.length} items · tap to add</span>
            </button>
            <button onClick={() => setEditing(t)} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800 hover:text-brand-600"><Pencil size={15} /></button>
            <button onClick={() => deletePackTemplate(t.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-800 hover:text-rose-500"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <Button variant="soft" size="sm" className="mt-3" onClick={() => setEditing(newPackTemplate())}><Plus size={15} />New template</Button>
    </Modal>
  )
}

function TemplateEditor({ template, onClose }: { template: PackTemplate; onClose: () => void }) {
  const [t, setT] = useState<PackTemplate>(template)
  const isNew = !useApp.getState().packTemplates.some((x) => x.id === template.id)
  const setItem = (idx: number, patch: Partial<PackTemplate['items'][number]>) =>
    setT((p) => ({ ...p, items: p.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }))

  return (
    <Modal open onClose={onClose} title={isNew ? 'New template' : 'Edit template'}>
      <div className="space-y-3">
        <Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Template name (e.g. Ski trip)" />
        <div className="space-y-2">
          {t.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><Input value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="Item" /></div>
              <div className="w-32 shrink-0"><Select value={it.category} onChange={(e) => setItem(i, { category: e.target.value as PackingCategory })} className="py-1.5 text-sm">
                {PACKING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select></div>
              <button onClick={() => setT({ ...t, items: t.items.filter((_, x) => x !== i) })} className="shrink-0 text-slate-400 hover:text-rose-500"><X size={15} /></button>
            </div>
          ))}
        </div>
        <Button variant="soft" size="sm" onClick={() => setT({ ...t, items: [...t.items, { title: '', category: 'Miscellaneous' }] })}><Plus size={14} />Add item</Button>
        <div className="flex items-center gap-2 border-t border-ink-800 pt-3">
          {!isNew && <Button variant="ghost" className="text-rose-400" onClick={async () => { await deletePackTemplate(t.id); onClose() }}><Trash2 size={16} /></Button>}
          <div className="ml-auto flex gap-2">
            <Button variant="soft" onClick={onClose}>Cancel</Button>
            <Button disabled={!t.name.trim()} onClick={async () => { await savePackTemplate({ ...t, items: t.items.filter((it) => it.title.trim()) }); onClose() }}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
