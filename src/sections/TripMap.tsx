import { useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { useTrip } from '../pages/TripLayout'
import { useApp } from '../lib/db'
import { tripItems, CATEGORY_EMOJI } from '../lib/data'
import { EmptyState, Chip } from '../ui/primitives'
import MapView, { type MapPoint } from '../components/MapView'

const FOOD = ['Restaurant', 'Café', 'Bar']

export default function TripMap() {
  const { trip } = useTrip()
  useApp((s) => s.items)
  const [layers, setLayers] = useState({ itinerary: true, ideas: true, accommodation: true, food: true })
  const toggle = (k: keyof typeof layers) => setLayers((l) => ({ ...l, [k]: !l[k] }))

  const items = tripItems(trip.id).filter((i) => i.lat != null)
  const points: MapPoint[] = []
  items.forEach((i) => {
    const isAccom = i.category === 'Accommodation'
    const isFood = FOOD.includes(i.category)
    const scheduled = Boolean(i.date)
    if (isAccom && !layers.accommodation) return
    if (isFood && !layers.food) return
    if (scheduled && !isAccom && !isFood && !layers.itinerary) return
    if (!scheduled && !isAccom && !isFood && !layers.ideas) return
    const color = isAccom ? '#f59e0b' : isFood ? '#ec4899' : scheduled ? '#8b5cf6' : '#64748b'
    points.push({ id: i.id, lat: i.lat!, lng: i.lng!, label: i.title, sub: `${i.category}${i.city ? ' · ' + i.city : ''}`, color, emoji: CATEGORY_EMOJI[i.category] })
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {([['itinerary', 'Itinerary'], ['ideas', 'Ideas'], ['accommodation', 'Accommodation'], ['food', 'Food & drink']] as const).map(([k, label]) => (
          <button key={k} onClick={() => toggle(k)}><Chip active={layers[k]}>{label}</Chip></button>
        ))}
      </div>
      {points.length === 0 ? (
        <EmptyState icon={<MapIcon size={28} />} title="No locations yet" hint="Add a location to ideas or itinerary items and they'll show up here, colour-coded by type." />
      ) : (
        <>
          <MapView points={points} height={480} />
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            <Legend c="#8b5cf6" l="Itinerary" /><Legend c="#64748b" l="Idea" /><Legend c="#f59e0b" l="Accommodation" /><Legend c="#ec4899" l="Food & drink" />
          </div>
        </>
      )}
    </div>
  )
}
const Legend = ({ c, l }: { c: string; l: string }) => <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
