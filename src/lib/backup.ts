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
// to the signed-in user (the old user id is remapped everywhere), so it works
// whether you're moving between browsers or onto Supabase.
export async function importBackup(file: File): Promise<{ trips: number; total: number }> {
  const data: Backup = JSON.parse(await file.text())
  if (data.app !== 'trippy' || !Array.isArray(data.docs)) throw new Error('That doesn\'t look like a Trippy backup file.')
  const newId = useApp.getState().user?.id
  if (!newId) throw new Error('Sign in first, then import.')
  const oldId = data.primaryUserId

  // Insert trips before their children so cloud row-level security (which checks
  // trip membership) accepts the items/comments that reference them.
  const docs = data.docs
    .filter((d) => PORTABLE.includes(d.collection))
    .sort((a, b) => (a.collection === 'trips' ? 0 : 1) - (b.collection === 'trips' ? 0 : 1))

  let trips = 0
  for (const d of docs) {
    const remapped: Doc = oldId && oldId !== newId
      ? JSON.parse(JSON.stringify(d).split(oldId).join(newId)) // remap every user-id occurrence
      : d
    await store.save(remapped)
    if (d.collection === 'trips') trips++
  }
  await useApp.getState().refresh()
  return { trips, total: docs.length }
}
