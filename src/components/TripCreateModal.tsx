import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import { useApp } from '../lib/db'
import { uid } from '../lib/util'
import type { Destination, MemberRole } from '../lib/types'
import { Modal, Field, Input, Button, Avatar } from '../ui/primitives'
import LocationSearch from './LocationSearch'
import ImagePicker from './ImagePicker'
import { currencyFromCountry } from '../lib/currencies'

export default function TripCreateModal({ onClose }: { onClose: () => void }) {
  const { createTrip, setMember, myFriends } = useApp.getState()
  const friends = useApp((s) => s.myFriends())
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [dests, setDests] = useState<Destination[]>([])
  const [partners, setPartners] = useState<Record<string, MemberRole>>({})
  const [cover, setCover] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    const trip = await createTrip({
      name: name.trim(), startDate: start || undefined, endDate: end || undefined, destinations: dests, coverImage: cover,
    })
    for (const [uid, role] of Object.entries(partners)) await setMember(trip, uid, role)
    setBusy(false)
    onClose()
    nav(`/trip/${trip.id}`)
  }

  return (
    <Modal open onClose={onClose} title="Plan a trip">
      <div className="space-y-4">
        <Field label="Trip name"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Japan 2026" /></Field>

        <Field label="Cover photo" hint="optional"><ImagePicker value={cover} onChange={setCover} /></Field>

        <Field label="Destinations" hint="Add one or more — order = your route">
          <LocationSearch placeholder="Add a city or place…" onPick={(r) =>
            setDests((d) => [...d, { id: uid(), name: r.name, lat: r.latitude, lng: r.longitude,
              countryCode: r.countryCode, currency: currencyFromCountry(r.countryCode) }])} />
          {dests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {dests.map((d) => (
                <span key={d.id} className="flex items-center gap-1.5 rounded-full bg-ink-800 py-1 pl-3 pr-1.5 text-sm text-slate-200">
                  {d.name}
                  <button onClick={() => setDests((xs) => xs.filter((x) => x.id !== d.id))} className="rounded-full p-0.5 hover:bg-ink-700"><X size={13} /></button>
                </span>
              ))}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Start date"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End date"><Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>

        <Field label="Travel partners" hint={friends.length ? 'Tap to invite — they can view & edit' : 'Add friends first to invite them'}>
          <div className="flex flex-wrap gap-2">
            {friends.map((f) => {
              const on = partners[f.id]
              return (
                <button key={f.id} onClick={() => setPartners((p) => {
                  const n = { ...p }; if (n[f.id]) delete n[f.id]; else n[f.id] = 'editor'; return n
                })}
                  className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 ring-1 transition ${on ? 'bg-brand-500/20 ring-brand-500/50' : 'bg-ink-850 ring-ink-700'}`}>
                  <Avatar name={f.name} src={f.photoUrl} size={22} /><span className="text-xs text-slate-200">{f.name}</span>
                </button>
              )
            })}
            {friends.length === 0 && <span className="text-sm text-slate-500">No friends yet — invite them from the Friends page.</span>}
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="soft" onClick={onClose}>Cancel</Button>
          <Button onClick={create} disabled={!name.trim() || busy}><Plus size={16} />Create trip</Button>
        </div>
      </div>
    </Modal>
  )
}
