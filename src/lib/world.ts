// Loads a low-res world country GeoJSON (Natural Earth 110m) once per session
// and exposes helpers for the World choropleth. Matched by ISO alpha-2 code.

let cache: any | null = null
let inflight: Promise<any> | null = null

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'

export async function loadWorldGeo(): Promise<any> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = fetch(URL)
    .then((r) => r.json())
    .then((g) => { cache = g; return g })
    .finally(() => { inflight = null })
  return inflight
}

// Natural Earth uses "-99" for some ISO_A2 values; the *_EH variant fills those.
export const featureCode = (f: any): string | undefined => {
  const p = f.properties || {}
  const c = (p.ISO_A2_EH && p.ISO_A2_EH !== '-99' && p.ISO_A2_EH)
    || (p.ISO_A2 && p.ISO_A2 !== '-99' && p.ISO_A2)
  return c ? String(c).toUpperCase() : undefined
}

export type WorldStatus = 'visited' | 'planned' | 'want'
export const STATUS_COLOR: Record<WorldStatus, string> = {
  visited: '#22c55e', // green
  planned: '#8b5cf6', // purple
  want: '#f59e0b',    // yellow/amber
}
