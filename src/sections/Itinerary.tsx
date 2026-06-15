import { useMemo, useState } from 'react'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import { Plus, CalendarRange } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripItems, newItem, CATEGORY_EMOJI } from '../lib/data'
import { type Item } from '../lib/types'
import { Button, SegTabs, EmptyState, Select, Chip } from '../ui/primitives'
import ItemCard, { scheduleLabel } from '../components/ItemCard'
import ItemModal from '../components/ItemModal'
import MapView, { type MapPoint } from '../components/MapView'
import { fmtDate, todayISO } from '../lib/util'

type View = 'days' | 'timeline' | 'map'

const sortKey = (i: Item) => (i.date || '') + (i.startTime || (i.roughTime ? ({ Morning: '08', Afternoon: '13', Evening: '18', Night: '22' } as any)[i.roughTime] : 'zz'))

export default function Itinerary() {
  const { trip, canEdit } = useTrip()
  useApp((s) => s.items)
  const [view, setView] = useState<View>('days')
  const [opened, setOpened] = useState<{ item: Item; edit: boolean } | null>(null)

  const all = tripItems(trip.id)
  // Accommodation is kept in Travel Details, not the itinerary.
  const scheduled = useMemo(() => all.filter((i) => i.date && i.category !== 'Accommodation').sort((a, b) => sortKey(a).localeCompare(sortKey(b))), [all])

  // Build the list of days: trip range if set, else the distinct scheduled dates
  const days = useMemo(() => {
    if (trip.startDate && trip.endDate) {
      return eachDayOfInterval({ start: parseISO(trip.startDate), end: parseISO(trip.endDate) }).map((d) => format(d, 'yyyy-MM-dd'))
    }
    return [...new Set(scheduled.map((i) => i.date!))].sort()
  }, [trip.startDate, trip.endDate, scheduled])

  const byDay = (date: string) => scheduled.filter((i) => i.date === date || (i.endDate && i.date! <= date && date <= i.endDate))
  const firstDay = days[0] || todayISO()
  const [mapDay, setMapDay] = useState(firstDay)
  const [showNearby, setShowNearby] = useState(false)

  const addOn = (date: string) => setOpened({ item: newItem(trip.id, { date }), edit: true })

  if (scheduled.length === 0 && view !== 'map') {
    return (
      <>
        <Header view={view} setView={setView} canEdit={canEdit} onAdd={() => addOn(firstDay)} />
        <EmptyState icon={<CalendarRange size={28} />} title="Nothing scheduled yet"
          hint="Give an idea a date and it shows up here. Flights, drives, sights — anything with a day or time."
          action={canEdit ? <Button onClick={() => addOn(firstDay)}><Plus size={16} />Add scheduled item</Button> : undefined} />
        {opened && <ItemModal trip={trip} item={opened.item} edit={opened.edit} canEdit={canEdit} onClose={() => setOpened(null)} />}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <Header view={view} setView={setView} canEdit={canEdit} onAdd={() => addOn(firstDay)} />

      {view === 'days' && (
        <div className="space-y-5">
          {days.map((date, idx) => {
            const items = byDay(date)
            return (
              <div key={date}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">{idx + 1}</span>
                  <h3 className="font-semibold text-slate-100">{fmtDate(date, 'EEEE, MMM d')}</h3>
                  {canEdit && <button onClick={() => addOn(date)} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-ink-800 hover:text-brand-300"><Plus size={16} /></button>}
                </div>
                {items.length === 0 ? <p className="ml-9 text-sm text-slate-600">No plans</p> : (
                  <div className="ml-9 grid gap-2">{items.map((i) => <ItemCard key={i.id} item={i} trip={trip} onOpen={(it) => setOpened({ item: it, edit: false })} />)}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'timeline' && (
        <div className="relative space-y-2 border-l-2 border-ink-800 pl-5">
          {scheduled.map((i) => (
            <div key={i.id} className="relative">
              <span className="absolute -left-[26px] top-3 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-ink-950" />
              <div className="mb-1 text-xs font-medium text-brand-300">{scheduleLabel(i)}</div>
              <ItemCard item={i} trip={trip} onOpen={(it) => setOpened({ item: it, edit: false })} showSchedule={false} />
            </div>
          ))}
        </div>
      )}

      {view === 'map' && (
        <MapDay trip={trip} days={days} byDay={byDay} mapDay={mapDay} setMapDay={setMapDay}
          ideas={all.filter((i) => !i.date && i.lat != null)} showNearby={showNearby} setShowNearby={setShowNearby} />
      )}

      {opened && <ItemModal trip={trip} item={opened.item} edit={opened.edit} canEdit={canEdit} onClose={() => setOpened(null)} />}
    </div>
  )
}

function Header({ view, setView, canEdit, onAdd }: { view: View; setView: (v: View) => void; canEdit: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegTabs value={view} onChange={setView} options={[{ value: 'days', label: 'Day by day' }, { value: 'timeline', label: 'Timeline' }, { value: 'map', label: 'Map' }]} />
      {canEdit && <Button size="sm" className="ml-auto" onClick={onAdd}><Plus size={15} />Add</Button>}
    </div>
  )
}

function MapDay({ trip, days, byDay, mapDay, setMapDay, ideas, showNearby, setShowNearby }: {
  trip: any; days: string[]; byDay: (d: string) => Item[]; mapDay: string; setMapDay: (d: string) => void
  ideas: Item[]; showNearby: boolean; setShowNearby: (v: boolean) => void
}) {
  const dayItems = byDay(mapDay).filter((i) => i.lat != null)
  const points: MapPoint[] = dayItems.map((i, idx) => ({
    id: i.id, lat: i.lat!, lng: i.lng!, label: i.title, sub: scheduleLabel(i),
    number: idx + 1, color: i.category === 'Accommodation' ? '#f59e0b' : '#8b5cf6',
  }))
  if (showNearby) ideas.forEach((i) => points.push({ id: 'idea-' + i.id, lat: i.lat!, lng: i.lng!, label: i.title, sub: 'Idea', emoji: CATEGORY_EMOJI[i.category], color: '#64748b' }))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mapDay} onChange={(e) => setMapDay(e.target.value)} className="w-auto py-1.5 text-sm">
          {days.map((d, i) => <option key={d} value={d}>Day {i + 1} · {fmtDate(d, 'EEE, MMM d')}</option>)}
        </Select>
        <button onClick={() => setShowNearby(!showNearby)}><Chip active={showNearby}>Nearby ideas</Chip></button>
        <span className="ml-auto text-xs text-slate-500">{dayItems.length} stops</span>
      </div>
      {dayItems.length === 0 ? (
        <EmptyState title="No mapped stops this day" hint="Add a location to a scheduled item to plot it and draw the route." />
      ) : (
        <>
          <MapView points={points.filter((p) => !p.id.startsWith('idea-') || showNearby)} route height={420} />
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" />Itinerary</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Accommodation</span>
            {showNearby && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Idea</span>}
          </div>
        </>
      )}
    </div>
  )
}
