import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Plus, Lightbulb, MapPin, Rocket, Trash2, Plane } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { tripItems, newItem, saveItem } from '../lib/data'
import type { Item } from '../lib/types'
import { Button, Input, EmptyState, Card } from '../ui/primitives'
import ItemCard from '../components/ItemCard'
import ItemModal from '../components/ItemModal'

export default function DreamDetail() {
  const { id } = useParams()
  useApp((s) => s.items)
  const dream = useApp((s) => s.trips.find((t) => t.id === id))
  const { convertDreamToTrip, deleteTrip } = useApp.getState()
  const nav = useNavigate()
  const [opened, setOpened] = useState<{ item: Item; edit: boolean } | null>(null)
  const [quick, setQuick] = useState('')

  if (!dream || !dream.isDream) return <Navigate to="/dreams" replace />
  const ideas = tripItems(dream.id)

  async function quickAdd() {
    if (!quick.trim()) return
    await saveItem(newItem(dream!.id, { title: quick.trim() }))
    setQuick('')
  }
  async function planTrip() {
    await convertDreamToTrip(dream!.id)
    nav(`/trip/${dream!.id}`)
  }

  return (
    <AppShell title={dream.name} back="/dreams">
      <div className="space-y-4">
        <Card>
          {dream.destinations.length > 0 && (
            <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{dream.destinations.map((d) => d.name).join(', ')}</p>
          )}
          <p className="mt-1 text-sm text-slate-500">A place you're dreaming about. Add ideas below, then turn it into a real trip to build the itinerary.</p>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={planTrip}><Rocket size={16} />Plan this trip</Button>
            <Button variant="ghost" className="text-rose-500" onClick={async () => { if (confirm('Delete this dream and its ideas?')) { await deleteTrip(dream!.id); nav('/dreams') } }}><Trash2 size={16} /></Button>
          </div>
        </Card>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Lightbulb size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <Input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Quick add an idea…" className="pl-9" />
          </div>
          <Button onClick={() => setOpened({ item: newItem(dream.id), edit: true })}><Plus size={16} />Details</Button>
        </div>

        {ideas.length === 0 ? (
          <EmptyState icon={<Plane size={26} />} title="No ideas yet" hint="Restaurants, sights, neighbourhoods — anything you might want to do there." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {ideas.map((i) => <ItemCard key={i.id} item={i} trip={dream} onOpen={(it) => setOpened({ item: it, edit: false })} />)}
          </div>
        )}

        {opened && <ItemModal trip={dream} item={opened.item} edit={opened.edit} canEdit onClose={() => setOpened(null)} />}
      </div>
    </AppShell>
  )
}
