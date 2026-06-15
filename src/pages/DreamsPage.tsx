import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Sparkles, MapPin, Lightbulb } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { tripItems } from '../lib/data'
import { uid } from '../lib/util'
import type { Destination } from '../lib/types'
import { Button, Card, EmptyState, Modal, Field, Input } from '../ui/primitives'
import LocationSearch from '../components/LocationSearch'
import { currencyFromCountry } from '../lib/currencies'

export default function DreamsPage() {
  useApp((s) => s.trips); useApp((s) => s.items)
  const dreams = useApp((s) => s.myDreamTrips())
  const migrateDreams = useApp((s) => s.migrateDreams)
  const [creating, setCreating] = useState(false)

  // Bring any legacy "dream destination" entries into the new dream-trip model.
  useEffect(() => { migrateDreams() }, [migrateDreams])

  return (
    <AppShell title="Dream destinations" bottomNav
      right={<Button size="sm" onClick={() => setCreating(true)}><Plus size={16} />New</Button>}>
      <p className="mb-4 text-sm text-slate-500">Places you'd love to go someday. Collect ideas and recommendations now — turn it into a real trip when you're ready.</p>

      {dreams.length === 0 ? (
        <EmptyState icon={<Sparkles size={28} />} title="No dreams yet"
          hint="Save a destination like “Japan” and start dropping in ideas you come across."
          action={<Button onClick={() => setCreating(true)}><Plus size={16} />Add a dream</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {dreams.map((d) => {
            const ideas = tripItems(d.id).length
            return (
              <Link key={d.id} to={`/dream/${d.id}`}>
                <Card className="transition hover:ring-brand-500/40">
                  <h3 className="text-lg font-bold text-slate-900">{d.name}</h3>
                  {d.destinations.length > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} />{d.destinations.map((x) => x.name).join(', ')}</p>
                  )}
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Lightbulb size={13} />{ideas} idea{ideas === 1 ? '' : 's'}</p>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {creating && <CreateDreamModal onClose={() => setCreating(false)} />}
    </AppShell>
  )
}

function CreateDreamModal({ onClose }: { onClose: () => void }) {
  const createTrip = useApp((s) => s.createTrip)
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [dests, setDests] = useState<Destination[]>([])
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    const t = await createTrip({ name: name.trim(), isDream: true, destinations: dests })
    setBusy(false); onClose(); nav(`/dream/${t.id}`)
  }

  return (
    <Modal open onClose={onClose} title="New dream destination">
      <div className="space-y-4">
        <Field label="Name"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Japan" /></Field>
        <Field label="Where" hint="optional — search a country or city">
          <LocationSearch placeholder="Search a place…" onPick={(r) =>
            setDests((d) => [...d, { id: uid(), name: r.name, lat: r.latitude, lng: r.longitude, countryCode: r.countryCode, currency: currencyFromCountry(r.countryCode) }])} />
          {dests.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{dests.map((d) => (
            <span key={d.id} className="rounded-full bg-ink-800 px-3 py-1 text-sm text-slate-700">{d.name}</span>
          ))}</div>}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="soft" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim() || busy} onClick={create}><Plus size={16} />Create</Button>
        </div>
      </div>
    </Modal>
  )
}
