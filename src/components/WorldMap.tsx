import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import { X, Maximize2 } from 'lucide-react'
import { loadWorldGeo, featureCode, STATUS_COLOR, type WorldStatus } from '../lib/world'
import { Spinner } from '../ui/primitives'

const WORLD_BOUNDS: [[number, number], [number, number]] = [[-56, -170], [78, 190]]

function FitWorld() {
  const map = useMap()
  useEffect(() => { map.fitBounds(WORLD_BOUNDS, { padding: [2, 2], animate: false }) }, [map])
  return null
}

function styleFor(status: Map<string, WorldStatus>) {
  return (f: any) => {
    const code = featureCode(f)
    const s = code ? status.get(code) : undefined
    return { fillColor: s ? STATUS_COLOR[s] : '#e9e6f2', fillOpacity: s ? 0.85 : 1, color: '#ffffff', weight: 0.5 }
  }
}

// The actual Leaflet map. `interactive` toggles pan/zoom; static is a clean,
// fully-visible thumbnail with no controls.
function Choropleth({ geo, status, interactive }: { geo: any; status: Map<string, WorldStatus>; interactive: boolean }) {
  return (
    <MapContainer
      style={{ height: '100%', width: '100%', background: '#eaf2fb' }}
      attributionControl={false} zoomControl={false}
      dragging={interactive} scrollWheelZoom={interactive} touchZoom={interactive}
      doubleClickZoom={interactive} boxZoom={false} keyboard={false}
      maxBounds={WORLD_BOUNDS} maxBoundsViscosity={1}>
      <FitWorld />
      <GeoJSON key={status.size} data={geo} style={styleFor(status) as any}
        onEachFeature={interactive ? (f, layer) => {
          const code = featureCode(f); const s = code ? status.get(code) : undefined
          const name = f.properties?.ADMIN || f.properties?.NAME || ''
          if (name) layer.bindTooltip(`${name}${s ? ` · ${s}` : ''}`, { sticky: true })
        } : undefined} />
    </MapContainer>
  )
}

export default function WorldMap({ status, height = 300 }: { status: Map<string, WorldStatus>; height?: number }) {
  const [geo, setGeo] = useState<any | null>(null)
  const [err, setErr] = useState(false)
  const [full, setFull] = useState(false)

  useEffect(() => { loadWorldGeo().then(setGeo).catch(() => setErr(true)) }, [])

  if (err) return <p className="text-sm text-slate-500">Couldn't load the world map. Check your connection and try again.</p>
  if (!geo) return <div style={{ height }} className="grid place-items-center rounded-2xl ring-1 ring-ink-700"><Spinner label="Loading map…" /></div>

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-ink-700" style={{ height }}>
        <Choropleth geo={geo} status={status} interactive={false} />
        {/* Transparent tap target → fullscreen zoomable map */}
        <button onClick={() => setFull(true)} aria-label="Open full map"
          className="absolute inset-0 z-[500] flex items-end justify-end p-2">
          <span className="rounded-lg bg-white/90 p-1.5 text-slate-600 ring-1 ring-ink-700 shadow-sm"><Maximize2 size={15} /></span>
        </button>
      </div>

      {full && (
        <div className="fixed inset-0 z-[1100] bg-ink-950">
          <Choropleth geo={geo} status={status} interactive />
          <button onClick={() => setFull(false)} aria-label="Close map"
            className="absolute right-3 top-3 z-[1200] safe-top rounded-full bg-white/95 p-2 text-slate-700 shadow-lg ring-1 ring-ink-700">
            <X size={20} />
          </button>
          <div className="absolute inset-x-0 bottom-0 z-[1200] safe-bottom flex justify-center gap-4 bg-white/90 py-2 text-xs text-slate-600 backdrop-blur">
            <Legend color={STATUS_COLOR.visited} label="Visited" />
            <Legend color={STATUS_COLOR.planned} label="Planned" />
            <Legend color={STATUS_COLOR.want} label="Want to go" />
          </div>
        </div>
      )}
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{label}</span>
}
