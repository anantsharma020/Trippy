import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Dream, DreamStatus } from '../lib/types'
import { saveDream, deleteDream } from '../lib/data'
import { useApp } from '../lib/db'
import { Modal, Field, Input, Textarea, Select, Button } from '../ui/primitives'
import LocationSearch from './LocationSearch'

const STATUSES: DreamStatus[] = ['Want to go', 'Planned', 'Visited']
const PRIOS = ['Low', 'Medium', 'High'] as const

export default function DreamModal({ dream, onClose }: { dream: Dream; onClose: () => void }) {
  const [d, setD] = useState<Dream>(dream)
  const isNew = !useApp.getState().dreams.some((x) => x.id === dream.id)
  const set = (p: Partial<Dream>) => setD((prev) => ({ ...prev, ...p }))

  return (
    <Modal open onClose={onClose} title={isNew ? 'Dream destination' : d.name || 'Dream destination'}>
      <div className="space-y-4">
        <Field label="Place">
          {d.lat != null ? (
            <div className="flex items-center justify-between rounded-xl bg-ink-850 px-3 py-2.5 ring-1 ring-ink-700">
              <span className="text-sm text-slate-200">{d.name}</span>
              <button onClick={() => set({ lat: undefined, lng: undefined })} className="text-xs text-slate-400 hover:text-rose-400">Change</button>
            </div>
          ) : (
            <LocationSearch placeholder="Search a country or city…" onPick={(r) => set({ name: r.name, lat: r.latitude, lng: r.longitude })} />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status"><Select value={d.status} onChange={(e) => set({ status: e.target.value as DreamStatus })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Priority"><Select value={d.priority || ''} onChange={(e) => set({ priority: (e.target.value || undefined) as any })}><option value="">—</option>{PRIOS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
        </div>
        <Field label="Best time to visit"><Input value={d.bestTime || ''} onChange={(e) => set({ bestTime: e.target.value })} placeholder="Spring, shoulder season…" /></Field>
        <Field label="Notes & inspiration"><Textarea value={d.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <Field label="Links" hint="comma separated"><Input value={d.links.join(', ')} onChange={(e) => set({ links: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="https://…" /></Field>
        <div className="flex items-center gap-2 pt-1">
          {!isNew && <Button variant="ghost" className="text-rose-400" onClick={async () => { await deleteDream(d.id); onClose() }}><Trash2 size={16} /></Button>}
          <div className="ml-auto flex gap-2">
            <Button variant="soft" onClick={onClose}>Cancel</Button>
            <Button disabled={!d.name.trim()} onClick={async () => { await saveDream(d); onClose() }}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
