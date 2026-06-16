import { useState } from 'react'
import { Plus, CheckSquare, Check, Trash2, Calendar } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripActions, newAction, saveAction, deleteAction, tripItems } from '../lib/data'
import { ACTION_STATUSES, type ActionItem } from '../lib/types'
import { Button, Input, Modal, Field, Textarea, Select, EmptyState, Avatar, Chip } from '../ui/primitives'
import { fmtDate, daysUntil, classNames } from '../lib/util'

const PRIOS = ['Low', 'Medium', 'High'] as const

export default function ActionItems() {
  const { trip, canEdit } = useTrip()
  useApp((s) => s.actions)
  const profile = useApp((s) => s.profile)
  const [editing, setEditing] = useState<ActionItem | null>(null)
  const [quick, setQuick] = useState('')
  const [fAssignee, setFAssignee] = useState('')
  const [fPriority, setFPriority] = useState('')

  const members = [trip.ownerId, ...trip.members.map((m) => m.userId)].filter((v, i, x) => x.indexOf(v) === i)
  const allActions = tripActions(trip.id).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
  const actions = allActions.filter((a) =>
    (!fAssignee || (fAssignee === 'none' ? !a.assignedTo : a.assignedTo === fAssignee)) &&
    (!fPriority || (a.priority || '') === fPriority))
  const open = actions.filter((a) => a.status !== 'Done' && a.status !== 'Not needed')
  const done = actions.filter((a) => a.status === 'Done' || a.status === 'Not needed')

  async function quickAdd() {
    if (!quick.trim()) return
    await saveAction(newAction(trip.id, { title: quick.trim() }))
    setQuick('')
  }
  const toggle = (a: ActionItem) => saveAction({ ...a, status: a.status === 'Done' ? 'To do' : 'Done' })

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <CheckSquare size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <Input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Add a task… (e.g. Reserve Sushi Dai)" className="pl-9" />
          </div>
          <Button onClick={() => setEditing(newAction(trip.id))}><Plus size={16} />Details</Button>
        </div>
      )}

      {allActions.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} className="flex-1 py-1.5 text-sm">
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {members.map((m) => <option key={m} value={m}>{profile(m)?.name || 'Unknown'}</option>)}
          </Select>
          <Select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="flex-1 py-1.5 text-sm">
            <option value="">Any priority</option>
            {['High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          {(fAssignee || fPriority) && <button onClick={() => { setFAssignee(''); setFPriority('') }} className="shrink-0 text-xs text-slate-500 hover:text-slate-700">Clear</button>}
        </div>
      )}

      {allActions.length === 0 && <EmptyState icon={<CheckSquare size={28} />} title="No action items" hint="Booking flights, visas, reservations — track the to-dos that make the trip happen." />}
      {allActions.length > 0 && actions.length === 0 && <p className="text-sm text-slate-500">No tasks match these filters.</p>}

      {open.length > 0 && (
        <div className="space-y-2">
          {open.map((a) => <ActionRow key={a.id} a={a} trip={trip} profile={profile} canEdit={canEdit} onToggle={() => toggle(a)} onOpen={() => canEdit && setEditing(a)} />)}
        </div>
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-400">Completed · {done.length}</summary>
          <div className="mt-2 space-y-2 opacity-60">
            {done.map((a) => <ActionRow key={a.id} a={a} trip={trip} profile={profile} canEdit={canEdit} onToggle={() => toggle(a)} onOpen={() => canEdit && setEditing(a)} />)}
          </div>
        </details>
      )}

      {editing && <ActionEditor trip={trip} action={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function ActionRow({ a, trip, profile, canEdit, onToggle, onOpen }: any) {
  const done = a.status === 'Done' || a.status === 'Not needed'
  const assignee = profile(a.assignedTo)
  const related = tripItems(trip.id).find((i: any) => i.id === a.relatedItemId)
  const due = daysUntil(a.dueDate)
  const overdue = due != null && due < 0 && !done
  return (
    <div className="flex items-center gap-3 rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-3 py-2.5">
      <button disabled={!canEdit} onClick={onToggle}
        className={classNames('grid h-5 w-5 shrink-0 place-items-center rounded-md border', done ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-600')}>
        {done && <Check size={13} />}
      </button>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className={classNames('truncate text-sm', done ? 'text-slate-500 line-through' : 'text-slate-100')}>{a.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          {a.dueDate && <span className={classNames('flex items-center gap-1', overdue && 'text-rose-400')}><Calendar size={11} />{fmtDate(a.dueDate)}</span>}
          {a.status !== 'To do' && a.status !== 'Done' && <Chip>{a.status}</Chip>}
          {related && <span>· {related.title}</span>}
        </div>
      </button>
      {a.priority === 'High' && <Chip className="bg-rose-500/15 text-rose-300">High</Chip>}
      {assignee && <Avatar name={assignee.name} src={assignee.photoUrl} size={24} />}
    </div>
  )
}

function ActionEditor({ trip, action, onClose }: { trip: any; action: ActionItem; onClose: () => void }) {
  const [a, setA] = useState<ActionItem>(action)
  const { profile } = useApp.getState()
  const isNew = !useApp.getState().actions.some((x) => x.id === action.id)
  const set = (p: Partial<ActionItem>) => setA((prev) => ({ ...prev, ...p }))
  const members = [trip.ownerId, ...trip.members.map((m: any) => m.userId)].filter((v, i, x) => x.indexOf(v) === i)
  const items = tripItems(trip.id)

  return (
    <Modal open onClose={onClose} title={isNew ? 'New task' : 'Edit task'}>
      <div className="space-y-3">
        <Field label="Task"><Input autoFocus value={a.title} onChange={(e) => set({ title: e.target.value })} placeholder="Book rental car" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Due date"><Input type="date" value={a.dueDate || ''} onChange={(e) => set({ dueDate: e.target.value || undefined })} /></Field>
          <Field label="Status"><Select value={a.status} onChange={(e) => set({ status: e.target.value as any })}>{ACTION_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Priority"><Select value={a.priority || ''} onChange={(e) => set({ priority: (e.target.value || undefined) as any })}><option value="">—</option>{PRIOS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label="Assigned to"><Select value={a.assignedTo || ''} onChange={(e) => set({ assignedTo: e.target.value || undefined })}>
            <option value="">Anyone</option>{members.map((m) => <option key={m} value={m}>{profile(m)?.name || 'Unknown'}</option>)}
          </Select></Field>
        </div>
        <Field label="Related item"><Select value={a.relatedItemId || ''} onChange={(e) => set({ relatedItemId: e.target.value || undefined })}>
          <option value="">None</option>{items.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
        </Select></Field>
        <Field label="Link"><Input value={a.link || ''} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Notes"><Textarea value={a.notes || ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <div className="flex items-center gap-2 pt-1">
          {!isNew && <Button variant="ghost" className="text-rose-400" onClick={async () => { await deleteAction(a.id); onClose() }}><Trash2 size={16} /></Button>}
          <div className="ml-auto flex gap-2">
            <Button variant="soft" onClick={onClose}>Cancel</Button>
            <Button disabled={!a.title.trim()} onClick={async () => { await saveAction(a); onClose() }}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
