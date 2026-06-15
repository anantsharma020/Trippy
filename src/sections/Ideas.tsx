import { useMemo, useState } from 'react'
import { Plus, Search, Lightbulb } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripItems, newItem, saveItem, CATEGORY_EMOJI } from '../lib/data'
import { ITEM_CATEGORIES, type Item } from '../lib/types'
import { Button, Input, SegTabs, Chip, EmptyState, Select } from '../ui/primitives'
import ItemCard from '../components/ItemCard'
import ItemModal from '../components/ItemModal'
import MapView, { type MapPoint } from '../components/MapView'

type View = 'list' | 'category' | 'priority' | 'person' | 'map'

export default function Ideas() {
  const { trip, canEdit } = useTrip()
  useApp((s) => s.items)
  const profile = useApp((s) => s.profile)
  const [view, setView] = useState<View>('list')
  const [opened, setOpened] = useState<{ item: Item; edit: boolean } | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [needsBooking, setNeedsBooking] = useState(false)
  const [quick, setQuick] = useState('')

  // Ideas = items without a date
  const ideas = tripItems(trip.id).filter((i) => !i.date)
  const filtered = useMemo(() => ideas.filter((i) =>
    (!q || i.title.toLowerCase().includes(q.toLowerCase())) &&
    (!cat || i.category === cat) &&
    (!needsBooking || i.bookingStatus === 'Need to book')
  ), [ideas, q, cat, needsBooking])

  async function quickAdd() {
    if (!quick.trim()) return
    await saveItem(newItem(trip.id, { title: quick.trim() }))
    setQuick('')
  }

  const openItem = (i: Item) => setOpened({ item: i, edit: false })

  const mapPoints: MapPoint[] = filtered.filter((i) => i.lat != null).map((i) => ({
    id: i.id, lat: i.lat!, lng: i.lng!, label: i.title, sub: i.category, emoji: CATEGORY_EMOJI[i.category],
  }))

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Lightbulb size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <Input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
              placeholder="Quick capture an idea…" className="pl-9" />
          </div>
          <Button onClick={() => setOpened({ item: newItem(trip.id), edit: true })}><Plus size={16} />Details</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SegTabs value={view} onChange={setView} options={[
          { value: 'list', label: 'List' }, { value: 'category', label: 'Category' },
          { value: 'priority', label: 'Priority' }, { value: 'person', label: 'By person' },
          { value: 'map', label: 'Map' },
        ]} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 pl-8 py-1.5 text-sm" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto py-1.5 text-sm">
          <option value="">All categories</option>
          {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <button onClick={() => setNeedsBooking((v) => !v)}>
          <Chip active={needsBooking}>Needs booking</Chip>
        </button>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} ideas</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Lightbulb size={28} />} title="No ideas yet"
          hint="Capture restaurants, sights, viewpoints, day trips — anything you might want to do. Add a date later to schedule it." />
      ) : view === 'list' ? (
        <div className="grid gap-2 sm:grid-cols-2">{filtered.map((i) => <ItemCard key={i.id} item={i} trip={trip} onOpen={openItem} />)}</div>
      ) : view === 'map' ? (
        mapPoints.length ? <MapView points={mapPoints} /> : <EmptyState title="No locations" hint="Add a location to ideas to see them on the map." />
      ) : (
        <Grouped items={filtered} view={view} trip={trip} onOpen={openItem} profile={profile} />
      )}

      {opened && <ItemModal trip={trip} item={opened.item} edit={opened.edit} canEdit={canEdit} onClose={() => setOpened(null)} />}
    </div>
  )
}

function Grouped({ items, view, trip, onOpen, profile }: {
  items: Item[]; view: View; trip: any; onOpen: (i: Item) => void; profile: (id?: string) => any
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>()
    items.forEach((i) => {
      const key = view === 'category' ? i.category
        : view === 'priority' ? (i.priority || 'No priority')
        : (profile(i.createdBy)?.name || 'Unknown')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    return [...map.entries()]
  }, [items, view, profile])

  return (
    <div className="space-y-5">
      {groups.map(([key, list]) => (
        <div key={key}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            {view === 'category' && <span>{CATEGORY_EMOJI[key as keyof typeof CATEGORY_EMOJI] || '•'}</span>}{key}
            <span className="text-xs font-normal text-slate-500">· {list.length}</span>
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">{list.map((i) => <ItemCard key={i.id} item={i} trip={trip} onOpen={onOpen} />)}</div>
        </div>
      ))}
    </div>
  )
}
