import { useMemo, useState } from 'react'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import { Plus, CalendarRange, LogIn, LogOut } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripItems, newItem, CATEGORY_EMOJI } from '../lib/data'
import { type Item, type RoughTime } from '../lib/types'
import { Button, SegTabs, EmptyState, Select, Chip } from '../ui/primitives'
import ItemCard, { scheduleLabel } from '../components/ItemCard'
import ItemModal from '../components/ItemModal'
import MapView, { type MapPoint } from '../components/MapView'
import { fmtDate, todayISO } from '../lib/util'

type View = 'days' | 'timeline' | 'map'

const ROUGH_TIME: Record<string, string> = { Morning: '08:00', Afternoon: '13:00', Evening: '18:00', Night: '22:00' }

// An itinerary line. Accommodation expands into two: a check-in (on the
// check-in date) and a check-out (on the check-out date) — nothing in between.
interface Entry {
  key: string; date: string; time?: string; rough?: RoughTime
  item: Item; label: string; kind: 'normal' | 'checkin' | 'checkout'
}

const buildEntries = (items: Item[]): Entry[] => {
  const out: Entry[] = []
  for (const i of items) {
    if (!i.date) continue
    if (i.category === 'Accommodation') {
      out.push({ key: i.id + '-in', date: i.date, time: i.startTime, item: i, label: `Check in · ${i.title || 'Accommodation'}`, kind: 'checkin' })
      if (i.endDate && i.endDate !== i.date) out.push({ key: i.id + '-out', date: i.endDate, time: i.endTime, item: i, label: `Check out · ${i.title || 'Accommodation'}`, kind: 'checkout' })
    } else {
      out.push({ key: i.id, date: i.date, time: i.startTime, rough: i.roughTime, item: i, label: i.title, kind: 'normal' })
    }
  }
  return out
}
const slot = (e: Entry) => e.date + (e.time || (e.rough ? ROUGH_TIME[e.rough] : 'zz'))

export default function Itinerary() {
  const { trip, canEdit } = useTrip()
  useApp((s) => s.items)
  const [view, setView] = useState<View>('days')
  const [opened, setOpened] = useState<{ item: Item; edit: boolean } | null>(null)

  const all = tripItems(trip.id)
  const entries = useMemo(() => buildEntries(all).sort((a, b) => slot(a).localeCompare(slot(b))), [all])

  const days = useMemo(() => {
    if (trip.startDate && trip.endDate) {
      return eachDayOfInterval({ start: parseISO(trip.startDate), end: parseISO(trip.endDate) }).map((d) => format(d, 'yyyy-MM-dd'))
    }
    return [...new Set(entries.map((e) => e.date))].sort()
  }, [trip.startDate, trip.endDate, entries])

  const entriesByDay = (date: string) => entries.filter((e) => e.date === date)
  const itemsByDay = (date: string) => {
    const seen = new Set<string>()
    return entriesByDay(date).map((e) => e.item).filter((i) => i.lat != null && !seen.has(i.id) && seen.add(i.id))
  }
  const firstDay = days[0] || todayISO()
  const [mapDay, setMapDay] = useState(firstDay)
  const [showNearby, setShowNearby] = useState(false)

  const addOn = (date: string) => setOpened({ item: newItem(trip.id, { date }), edit: true })
  const openItem = (it: Item) => setOpened({ item: it, edit: false })

  if (entries.length === 0 && view !== 'map') {
    return (
      <>
        <Header view={view} setView={setView} canEdit={canEdit} onAdd={() => addOn(firstDay)} />
        <EmptyState icon={<CalendarRange size={28} />} title="Nothing scheduled yet"
          hint="Give an idea a date and it shows up here. Flights, drives, sights, hotel stays — anything with a day or time."
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
            const dayEntries = entriesByDay(date)
            return (
              <div key={date}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">{idx + 1}</span>
                  <h3 className="font-semibold text-slate-900">{fmtDate(date, 'EEEE, MMM d')}</h3>
                  {canEdit && <button onClick={() => addOn(date)} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-ink-800 hover:text-brand-600"><Plus size={16} /></button>}
                </div>
                {dayEntries.length === 0 ? <p className="ml-9 text-sm text-slate-500">No plans</p> : (
                  <div className="ml-9 grid gap-2">{dayEntries.map((e) => <EntryView key={e.key} entry={e} trip={trip} onOpen={openItem} />)}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'timeline' && (
        <div className="relative space-y-2 border-l-2 border-ink-700 pl-5">
          {entries.map((e) => (
            <div key={e.key} className="relative">
              <span className="absolute -left-[26px] top-3 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-ink-950" />
              <div className="mb-1 text-xs font-medium text-brand-600">{e.kind === 'normal' ? scheduleLabel(e.item) : `${fmtDate(e.date, 'EEE, MMM d')}${e.time ? ` · ${e.time}` : ''}`}</div>
              <EntryView entry={e} trip={trip} onOpen={openItem} hideSchedule />
            </div>
          ))}
        </div>
      )}

      {view === 'map' && (
        <MapDay trip={trip} days={days} itemsByDay={itemsByDay} mapDay={mapDay} setMapDay={setMapDay}
          ideas={all.filter((i) => !i.date && i.lat != null)} showNearby={showNearby} setShowNearby={setShowNearby} />
      )}

      {opened && <ItemModal trip={trip} item={opened.item} edit={opened.edit} canEdit={canEdit} onClose={() => setOpened(null)} />}
    </div>
  )
}

// Renders an itinerary entry: a normal item uses the full card; an accommodation
// check-in/out uses a compact row.
function EntryView({ entry, trip, onOpen, hideSchedule }: {
  entry: Entry; trip: any; onOpen: (i: Item) => void; hideSchedule?: boolean
}) {
  if (entry.kind === 'normal') {
    return <ItemCard item={entry.item} trip={trip} onOpen={onOpen} showSchedule={!hideSchedule} />
  }
  const checkin = entry.kind === 'checkin'
  return (
    <button onClick={() => onOpen(entry.item)}
      className="flex w-full items-center gap-3 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 px-3 py-2.5 text-left hover:ring-amber-500/50">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-600">
        {checkin ? <LogIn size={17} /> : <LogOut size={17} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">{entry.label}</span>
        <span className="text-xs text-slate-500">{checkin ? 'Check-in' : 'Check-out'}{entry.time ? ` · ${entry.time}` : ''}</span>
      </span>
      <span className="text-lg">🏨</span>
    </button>
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

function MapDay({ trip, days, itemsByDay, mapDay, setMapDay, ideas, showNearby, setShowNearby }: {
  trip: any; days: string[]; itemsByDay: (d: string) => Item[]; mapDay: string; setMapDay: (d: string) => void
  ideas: Item[]; showNearby: boolean; setShowNearby: (v: boolean) => void
}) {
  const [route, setRoute] = useState(false)
  const allDays = mapDay === 'all'
  // In "all days" mode each pin is numbered by the day it falls on.
  const dayIndex = new Map(days.map((d, i) => [d, i + 1]))
  const dayItems = allDays
    ? days.flatMap((d) => itemsByDay(d))
    : itemsByDay(mapDay)
  const points: MapPoint[] = dayItems.map((i, idx) => {
    const isAccom = i.category === 'Accommodation'
    const num = allDays ? (i.date ? dayIndex.get(i.date) : undefined) : (isAccom ? undefined : idx + 1)
    return {
      id: i.id, lat: i.lat!, lng: i.lng!, label: i.title,
      sub: scheduleLabel(i) || i.category,
      number: isAccom && !allDays ? undefined : num,
      emoji: isAccom && !allDays ? '🏨' : undefined,
      color: isAccom ? '#f59e0b' : '#8b5cf6',
    }
  })
  if (showNearby) ideas.forEach((i) => points.push({ id: 'idea-' + i.id, lat: i.lat!, lng: i.lng!, label: i.title, sub: 'Idea', emoji: CATEGORY_EMOJI[i.category], color: '#64748b' }))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mapDay} onChange={(e) => setMapDay(e.target.value)} className="w-auto py-1.5 text-sm">
          <option value="all">All days</option>
          {days.map((d, i) => <option key={d} value={d}>Day {i + 1} · {fmtDate(d, 'EEE, MMM d')}</option>)}
        </Select>
        <button onClick={() => setShowNearby(!showNearby)}><Chip active={showNearby}>Nearby ideas</Chip></button>
        <button onClick={() => setRoute(!route)}><Chip active={route}>Route</Chip></button>
        <span className="ml-auto text-xs text-slate-500">{dayItems.length} stops</span>
      </div>
      {dayItems.length === 0 ? (
        <EmptyState title="No mapped stops this day" hint="Add a location to a scheduled item to plot it on the map." />
      ) : (
        <>
          <MapView points={points.filter((p) => !p.id.startsWith('idea-') || showNearby)} route={route} height={420} />
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" />Itinerary</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Accommodation</span>
            {showNearby && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" />Idea</span>}
          </div>
        </>
      )}
    </div>
  )
}
