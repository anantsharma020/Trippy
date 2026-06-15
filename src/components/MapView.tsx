import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  label: string
  sub?: string
  color?: string
  number?: number
  emoji?: string
}

function pin(p: MapPoint) {
  const color = p.color || '#8b5cf6'
  const inner = p.number != null ? `<span style="font-size:12px;font-weight:700">${p.number}</span>`
    : p.emoji ? `<span style="font-size:14px">${p.emoji}</span>` : ''
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};
      display:grid;place-items:center;box-shadow:0 2px 6px rgba(80,60,140,.35);border:2px solid #ffffff">
      <div style="transform:rotate(45deg);color:#fff;line-height:1">${inner}</div></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28],
  })
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 12); return }
    const b = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
    map.fitBounds(b, { padding: [40, 40], maxZoom: 14 })
  }, [points, map])
  return null
}

export default function MapView({ points, route, height = 380 }: {
  points: MapPoint[]; route?: boolean; height?: number | string
}) {
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : [35.68, 139.76]
  const line = route ? points.map((p) => [p.lat, p.lng] as [number, number]) : []

  return (
    <div className="isolate overflow-hidden rounded-2xl ring-1 ring-ink-800" style={{ height }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#8b5cf6', weight: 3, opacity: 0.7, dashArray: '6 8' }} />}
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pin(p)}>
            <Popup><div className="text-sm font-medium">{p.label}</div>{p.sub && <div className="text-xs opacity-70">{p.sub}</div>}</Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  )
}
