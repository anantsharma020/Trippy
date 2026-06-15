import { differenceInCalendarDays, format, parseISO } from 'date-fns'

export const uid = (): string =>
  (crypto.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`)

export const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export const fmtDate = (iso?: string, f = 'MMM d') => {
  if (!iso) return ''
  try { return format(parseISO(iso), f) } catch { return iso }
}

export const fmtDateRange = (start?: string, end?: string) => {
  if (!start) return 'Dates TBD'
  if (!end || end === start) return fmtDate(start, 'MMM d, yyyy')
  const s = parseISO(start), e = parseISO(end)
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  return sameMonth
    ? `${format(s, 'MMM d')}–${format(e, 'd, yyyy')}`
    : `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
}

export const nights = (start?: string, end?: string) => {
  if (!start || !end) return 0
  return Math.max(0, differenceInCalendarDays(parseISO(end), parseISO(start)))
}

export const daysUntil = (iso?: string): number | null => {
  if (!iso) return null
  return differenceInCalendarDays(parseISO(iso), new Date())
}

export const countdownLabel = (iso?: string): string => {
  const d = daysUntil(iso)
  if (d === null) return ''
  if (d > 1) return `${d} days to go`
  if (d === 1) return 'Tomorrow'
  if (d === 0) return 'Today'
  if (d === -1) return 'Ended yesterday'
  return `Ended ${Math.abs(d)} days ago`
}

export const classNames = (...xs: (string | false | null | undefined)[]) =>
  xs.filter(Boolean).join(' ')

// "09:30" + "18:20" -> "8h 50m". Handles crossing midnight.
export const durationBetween = (start?: string, end?: string): string | undefined => {
  if (!start || !end) return undefined
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  if (mins === 0) return undefined
  const h = Math.floor(mins / 60), m = mins % 60
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ')
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?'

// Deterministic pleasant colour from a string (avatars, category chips)
export const colorFromString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return `hsl(${h} 55% 45%)`
}

export const money = (amount?: number, currency = 'EUR') => {
  if (amount == null || Number.isNaN(amount)) return ''
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
