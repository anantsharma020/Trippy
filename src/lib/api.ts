// Free, no-API-key data sources:
//   - Geocoding & weather: Open-Meteo (open-meteo.com)
//   - Exchange rates: open.er-api.com
// Responses are cached in localStorage to stay friendly to the public endpoints.

import { differenceInCalendarDays, parseISO, format, subYears } from 'date-fns'
import { parseMapsLink } from './util'

async function cachedJSON(url: string, ttlMs: number): Promise<any> {
  const key = `trippy:cache:${url}`
  try {
    const hit = JSON.parse(localStorage.getItem(key) || 'null')
    if (hit && Date.now() - hit.t < ttlMs) return hit.v
  } catch { /* ignore */ }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  const v = await res.json()
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v })) } catch { /* quota */ }
  return v
}

// --- Geocoding --------------------------------------------------------------
export interface GeoResult {
  name: string; detail?: string; address?: string; country?: string; countryCode?: string; admin1?: string; latitude: number; longitude: number
}

// Nominatim (OpenStreetMap) handles full POI / address / venue search — e.g.
// "Ramen Nagi", "Kyoto Station", "Lofoten" — not just city names.
export async function geocode(query: string): Promise<GeoResult[]> {
  if (query.trim().length < 2) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&limit=10&q=${encodeURIComponent(query)}`
  const data = await cachedJSON(url, 1000 * 60 * 60 * 24 * 30)
  return (Array.isArray(data) ? data : []).map((r: any) => {
    const a = r.address || {}
    const name = r.name || (r.display_name ? String(r.display_name).split(',')[0] : query)
    const place = [a.city || a.town || a.village || a.municipality || a.county, a.state, a.country].filter(Boolean).join(', ')
    return {
      name,
      detail: place || r.display_name,
      address: r.display_name, // full address line
      country: a.country,
      countryCode: a.country_code ? String(a.country_code).toUpperCase() : undefined,
      admin1: a.state,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    }
  }).filter((r: GeoResult) => !Number.isNaN(r.latitude))
}

// Resolve a Google Maps link to coordinates. Full URLs are parsed directly;
// short share links (maps.app.goo.gl) carry no coordinates, so we follow the
// redirect via a public CORS proxy and read the coordinates from the final page.
export async function resolveMapsLink(url: string): Promise<{ lat: number; lng: number; label?: string } | null> {
  const direct = parseMapsLink(url)
  if (direct) return direct
  if (!/^https?:\/\//.test(url)) return null
  const enc = encodeURIComponent(url.trim())
  // Try a couple of public proxies that follow the redirect; whichever responds
  // first with coordinates wins. Aborted after a few seconds so it never hangs.
  for (const [proxy, isJson] of [
    [`https://api.allorigins.win/get?url=${enc}`, true],
    [`https://corsproxy.io/?url=${enc}`, false],
  ] as const) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const res = await fetch(proxy, { signal: ctrl.signal })
      const text = await res.text()
      let finalUrl = '', html = text
      if (isJson) { try { const j = JSON.parse(text); finalUrl = j?.status?.url || ''; html = j?.contents || '' } catch { /* not json */ } }
      // Google's consent page carries the real maps URL in a `continue=` param.
      let cont = ''
      const cm = html.match(/continue=([^"&\\]+)/i)
      if (cm) try { cont = decodeURIComponent(cm[1]) } catch { /* ignore */ }
      const coords = parseMapsLink(finalUrl) || parseMapsLink(cont) || parseMapsLink(html)
      if (coords) {
        let label = coords.label
        if (!label) {
          const m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i)
          if (m) label = m[1].replace(/\s*-\s*Google Maps.*$/i, '').trim()
        }
        return { lat: coords.lat, lng: coords.lng, label }
      }
    } catch { /* try next proxy */ }
    finally { clearTimeout(timer) }
  }
  return null
}

// Reverse geocode coordinates → ISO country code (free, no key). Used to
// backfill a destination's currency when it was added without one.
export async function reverseCountryCode(lat: number, lng: number): Promise<string | undefined> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
  try {
    const d = await cachedJSON(url, 1000 * 60 * 60 * 24 * 90)
    return d.countryCode || undefined
  } catch { return undefined }
}

// --- Weather ----------------------------------------------------------------
export interface DayWeather { date: string; max: number; min: number; code: number; precip?: number }
export interface WeatherResult { kind: 'forecast' | 'seasonal'; days: DayWeather[] }

export async function weatherFor(lat: number, lng: number, start?: string, end?: string): Promise<WeatherResult> {
  const today = new Date()
  const startDate = start ? parseISO(start) : today
  const within = differenceInCalendarDays(startDate, today)

  // Close enough for a real forecast (Open-Meteo gives ~16 days)
  if (within >= -1 && within <= 14) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`
    const d = await cachedJSON(url, 1000 * 60 * 60 * 3)
    return { kind: 'forecast', days: mapDaily(d.daily) }
  }

  // Otherwise show "typical" weather using the same dates one year ago.
  const s = format(subYears(startDate, 1), 'yyyy-MM-dd')
  const e = format(subYears(end ? parseISO(end) : startDate, 1), 'yyyy-MM-dd')
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${s}&end_date=${e}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
  const d = await cachedJSON(url, 1000 * 60 * 60 * 24 * 7)
  return { kind: 'seasonal', days: mapDaily(d.daily) }
}

function mapDaily(daily: any): DayWeather[] {
  if (!daily?.time) return []
  return daily.time.map((date: string, i: number) => ({
    date,
    max: Math.round(daily.temperature_2m_max?.[i]),
    min: Math.round(daily.temperature_2m_min?.[i]),
    code: daily.weathercode?.[i] ?? 0,
    precip: daily.precipitation_probability_max?.[i],
  }))
}

export function weatherLabel(code: number): { emoji: string; text: string } {
  const m: Record<number, [string, string]> = {
    0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
    45: ['🌫️', 'Fog'], 48: ['🌫️', 'Fog'], 51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'],
    55: ['🌧️', 'Heavy drizzle'], 61: ['🌦️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
    71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 80: ['🌦️', 'Showers'],
    81: ['🌧️', 'Showers'], 82: ['⛈️', 'Violent showers'], 95: ['⛈️', 'Thunderstorm'],
    96: ['⛈️', 'Thunderstorm'], 99: ['⛈️', 'Thunderstorm'],
  }
  const [emoji, text] = m[code] ?? ['🌡️', '—']
  return { emoji, text }
}

export function summarize(days: DayWeather[]): { min: number; max: number; label: string; emoji: string } | null {
  if (!days.length) return null
  const min = Math.min(...days.map((d) => d.min))
  const max = Math.max(...days.map((d) => d.max))
  // most common weather code
  const counts: Record<number, number> = {}
  days.forEach((d) => { counts[d.code] = (counts[d.code] || 0) + 1 })
  const code = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
  const { emoji, text } = weatherLabel(code)
  return { min, max, label: text, emoji }
}

// --- Exchange rates (base EUR) ----------------------------------------------
export async function fxRates(): Promise<Record<string, number>> {
  const url = 'https://open.er-api.com/v6/latest/EUR'
  const d = await cachedJSON(url, 1000 * 60 * 60 * 12)
  return d.rates ?? {}
}

// amount in foreign currency -> EUR
export function toEUR(amount: number, foreign: string, rates: Record<string, number>): number | null {
  const r = rates[foreign]
  if (!r) return null
  return amount / r
}
