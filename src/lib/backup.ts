import { store, type Doc } from './store'
import { useApp } from './db'

// Trip data that should travel with a backup. Profiles/friends/templates are
// intentionally left out — they're account-specific and re-seed on the new device.
const PORTABLE = ['trips', 'items', 'actions', 'packing', 'comments', 'reactions', 'dreams']

export interface Backup {
  app: 'trippy'
  version: 1
  exportedAt: string
  primaryUserId?: string
  docs: Doc[]
}

// Download everything the current user can see as a JSON file.
export async function exportBackup() {
  const docs = await store.load()
  const user = useApp.getState().user
  const payload: Backup = {
    app: 'trippy', version: 1, exportedAt: new Date().toISOString(),
    primaryUserId: user?.id, docs,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trippy-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Restore a backup into the current account. All trips/items are re-attributed
// to the signed-in user, so it works whether you're moving between browsers or
// onto Supabase (whose row-level security requires owner_id == your id).
export async function importBackup(file: File): Promise<{ trips: number; total: number; failed: number }> {
  const data: Backup = JSON.parse(await file.text())
  if (data.app !== 'trippy' || !Array.isArray(data.docs)) throw new Error('That doesn\'t look like a Trippy backup file.')
  const newId = useApp.getState().user?.id
  if (!newId) throw new Error('Sign in first, then import.')
  const oldId = data.primaryUserId

  // Map each item id -> its trip, so comments/reactions (which only carry an
  // itemId) can be tagged with the trip_id that RLS checks on insert.
  const itemTrip = new Map<string, string | null>()
  for (const d of data.docs) if (d.collection === 'items') itemTrip.set(d.id, d.tripId ?? (d.data?.tripId ?? null))

  // Insert trips before their children so trip-membership checks pass.
  const docs = data.docs
    .filter((d) => PORTABLE.includes(d.collection))
    .sort((a, b) => (a.collection === 'trips' ? 0 : 1) - (b.collection === 'trips' ? 0 : 1))

  let trips = 0, failed = 0
  for (const d of docs) {
    // Remap any embedded user ids, then force ownership to the current user.
    const remapped: Doc = (oldId && oldId !== newId)
      ? JSON.parse(JSON.stringify(d).split(oldId).join(newId))
      : JSON.parse(JSON.stringify(d))
    remapped.ownerId = newId
    if (remapped.collection === 'comments' || remapped.collection === 'reactions') {
      remapped.tripId = remapped.tripId ?? itemTrip.get(remapped.data?.itemId) ?? null
      if (!remapped.tripId) { failed++; continue } // orphaned — nowhere to attach
    }
    try {
      await store.save(remapped)
      if (d.collection === 'trips') trips++
    } catch {
      failed++
    }
  }
  await useApp.getState().refresh()
  return { trips, total: docs.length - failed, failed }
}
