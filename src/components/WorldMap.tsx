import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON, TileLayer } from 'react-leaflet'
import { loadWorldGeo, featureCode, STATUS_COLOR, type WorldStatus } from '../lib/world'
import { Spinner } from '../ui/primitives'

// World choropleth: each country filled by its status, others faint grey.
export default function WorldMap({ status, height = 460 }: {
  status: Map<string, WorldStatus>; height?: number
}) {
  const [geo, setGeo] = useState<any | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => { loadWorldGeo().then(setGeo).catch(() => setErr(true)) }, [])

  if (err) return <p className="text-sm text-slate-500">Couldn't load the world map. Check your connection and try again.</p>
  if (!geo) return <div style={{ height }} className="grid place-items-center rounded-2xl ring-1 ring-ink-700"><Spinner label="Loading map…" /></div>

  const styleFor = (f: any) => {
    const code = featureCode(f)
    const s = code ? status.get(code) : undefined
    return {
      fillColor: s ? STATUS_COLOR[s] : '#e9e6f2',
      fillOpacity: s ? 0.82 : 1,
      color: '#ffffff',
      weight: 0.6,
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-ink-700" style={{ height }}>
      <MapContainer center={[25, 10]} zoom={1.4} minZoom={1} maxZoom={5} worldCopyJump
        style={{ height: '100%', width: '100%', background: '#dbeafe' }} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
        {/* key forces restyle when the status set changes */}
        <GeoJSON key={status.size} data={geo} style={styleFor as any}
          onEachFeature={(f, layer) => {
            const code = featureCode(f)
            const s = code ? status.get(code) : undefined
            const name = f.properties?.ADMIN || f.properties?.NAME || ''
            if (name) layer.bindTooltip(`${name}${s ? ` · ${s}` : ''}`, { sticky: true })
          }} />
      </MapContainer>
    </div>
  )
}
