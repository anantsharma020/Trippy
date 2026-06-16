import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Trash2, UserPlus, Crown } from 'lucide-react'
import { useApp } from '../lib/db'
import { uid } from '../lib/util'
import type { Destination, MemberRole, Trip } from '../lib/types'
import { Modal, Field, Input, Select, Button, Avatar, DateTimeField } from '../ui/primitives'
import LocationSearch from './LocationSearch'
import ImagePicker from './ImagePicker'
import { currencyFromCountry } from '../lib/currencies'

export default function TripSettingsModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { saveTrip, deleteTrip, removeMember, profile, user } = useApp.getState()
  const friends = useApp((s) => s.myFriends())
  const nav = useNavigate()
  const [t, setT] = useState<Trip>(trip)
  const isOwner = trip.ownerId === user?.id
  const set = (p: Partial<Trip>) => setT((prev) => ({ ...prev, ...p }))
  const setDest = (id: string, p: Partial<Destination>) =>
    set({ destinations: t.destinations.map((d) => (d.id === id ? { ...d, ...p } : d)) })

  async function save() { await saveTrip(t); onClose() }

  // Member edits accumulate in form state and persist once on Save — writing
  // immediately would get overwritten by Save's (stale) copy of the trip.
  const invite = (uid: string) => set({ members: [...t.members.filter((m) => m.userId !== uid), { userId: uid, role: 'editor' }] })
  const changeRole = (uid: string, role: MemberRole) => set({ members: t.members.map((m) => (m.userId === uid ? { ...m, role } : m)) })
  const kick = (uid: string) => set({ members: t.members.filter((m) => m.userId !== uid) })

  const memberRows = [{ userId: t.ownerId, role: 'owner' as MemberRole }, ...t.members.filter((m) => m.userId !== t.ownerId)]
  const friendsNotMembers = friends.filter((f) => !memberRows.some((m) => m.userId === f.id))

  return (
    <Modal open onClose={onClose} wide title="Trip settings">
      <div className="space-y-5">
        <Field label="Trip name"><Input value={t.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><DateTimeField type="date" value={t.startDate} onChange={(v) => set({ startDate: v })} placeholder="Pick date" /></Field>
          <Field label="End date"><DateTimeField type="date" value={t.endDate} onChange={(v) => set({ endDate: v })} placeholder="Pick date" /></Field>
        </div>
        <Field label="Cover photo" hint="optional"><ImagePicker value={t.coverImage} onChange={(v) => set({ coverImage: v })} /></Field>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Destinations</p>
          <div className="space-y-2">
            {t.destinations.map((d) => (
              <div key={d.id} className="rounded-xl bg-ink-850/60 ring-1 ring-ink-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{d.name}</span>
                  <button onClick={() => set({ destinations: t.destinations.filter((x) => x.id !== d.id) })} className="text-slate-400 hover:text-rose-400"><X size={15} /></button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label="From"><DateTimeField type="date" value={d.startDate} onChange={(v) => setDest(d.id, { startDate: v })} placeholder="Pick date" /></Field>
                  <Field label="To"><DateTimeField type="date" value={d.endDate} onChange={(v) => setDest(d.id, { endDate: v })} placeholder="Pick date" /></Field>
                  <div className="col-span-2"><Field label="Currency"><Input value={d.currency || ''} onChange={(e) => setDest(d.id, { currency: e.target.value.toUpperCase() || undefined })} placeholder="JPY" /></Field></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <LocationSearch placeholder="Add a destination…" onPick={(r) =>
              set({ destinations: [...t.destinations, { id: uid(), name: r.name, lat: r.latitude, lng: r.longitude,
                countryCode: r.countryCode, currency: currencyFromCountry(r.countryCode) }] })} />
          </div>
        </div>

        {/* Sharing */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Travel partners</p>
          <div className="space-y-2">
            {memberRows.map((m) => {
              const p = profile(m.userId)
              return (
                <div key={m.userId} className="flex items-center gap-2 rounded-xl bg-ink-850/60 px-3 py-2">
                  <Avatar name={p?.name || '?'} src={p?.photoUrl} size={28} />
                  <span className="text-sm text-slate-200">{p?.name || 'Unknown'}{m.userId === user?.id && ' (you)'}</span>
                  {m.role === 'owner' ? (
                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-300"><Crown size={13} />Owner</span>
                  ) : isOwner ? (
                    <div className="ml-auto flex items-center gap-1">
                      <Select value={m.role} onChange={(e) => changeRole(m.userId, e.target.value as MemberRole)} className="py-1 text-xs">
                        <option value="editor">Can edit</option><option value="viewer">Can view</option>
                      </Select>
                      <button onClick={() => kick(m.userId)} className="text-slate-400 hover:text-rose-400"><Trash2 size={15} /></button>
                    </div>
                  ) : <span className="ml-auto text-xs text-slate-500">{m.role === 'editor' ? 'Can edit' : 'Can view'}</span>}
                </div>
              )
            })}
          </div>
          {isOwner && friendsNotMembers.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs text-slate-500">Invite a friend:</p>
              <div className="flex flex-wrap gap-2">
                {friendsNotMembers.map((f) => (
                  <button key={f.id} onClick={() => invite(f.id)}
                    className="flex items-center gap-1.5 rounded-full bg-ink-850 ring-1 ring-ink-700 py-1 pl-1 pr-2.5 hover:ring-brand-500">
                    <Avatar name={f.name} src={f.photoUrl} size={22} /><span className="text-xs text-slate-200">{f.name}</span><UserPlus size={13} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {isOwner && friends.length === 0 && <p className="mt-1 text-xs text-slate-500">Add friends to invite them as travel partners.</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-ink-800 pt-4">
          {isOwner ? (
            <Button variant="ghost" className="text-rose-400" onClick={async () => { if (confirm('Delete this trip for everyone?')) { await deleteTrip(trip.id); nav('/') } }}><Trash2 size={16} />Delete trip</Button>
          ) : (
            <Button variant="ghost" className="text-rose-400" onClick={async () => { await removeMember(trip, user!.id); nav('/') }}>Leave trip</Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="soft" onClick={onClose}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
