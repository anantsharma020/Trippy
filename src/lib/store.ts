import { supabase, isCloud } from './supabase'

// A single, generic document shape persists every entity. This lets the exact
// same application logic run against localStorage or a single Supabase table.
export interface Doc<T = any> {
  id: string
  collection: string
  ownerId: string | null
  tripId: string | null
  data: T
  updatedAt: string
  deleted?: boolean
}

export interface Store {
  load(): Promise<Doc[]>
  save(doc: Doc): Promise<void>
  remove(collection: string, id: string): Promise<void>
  subscribe(onChange: () => void): () => void
}

const LS_KEY = 'trippy:db'

// --- Local (single browser) -------------------------------------------------
class LocalStore implements Store {
  private read(): Record<string, Doc> {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
  }
  private write(map: Record<string, Doc>) {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
    // notify other tabs / our own listeners
    window.dispatchEvent(new Event('trippy:changed'))
  }
  async load(): Promise<Doc[]> {
    return Object.values(this.read()).filter((d) => !d.deleted)
  }
  async save(doc: Doc): Promise<void> {
    const map = this.read()
    map[`${doc.collection}:${doc.id}`] = { ...doc, updatedAt: new Date().toISOString() }
    this.write(map)
  }
  async remove(collection: string, id: string): Promise<void> {
    const map = this.read()
    delete map[`${collection}:${id}`]
    this.write(map)
  }
  subscribe(onChange: () => void): () => void {
    const h = () => onChange()
    window.addEventListener('trippy:changed', h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener('trippy:changed', h)
      window.removeEventListener('storage', h)
    }
  }
}

// --- Supabase (cross-device) ------------------------------------------------
// Backed by a single `documents` table. Row Level Security (see schema.sql)
// enforces that you only see documents for trips you are a member of, your own
// profile/friend rows, and the public profiles of your friends.
class SupabaseStore implements Store {
  async load(): Promise<Doc[]> {
    const { data, error } = await supabase!
      .from('documents')
      .select('*')
      .eq('deleted', false)
    if (error) throw error
    return (data ?? []).map(rowToDoc)
  }
  async save(doc: Doc): Promise<void> {
    // We deliberately avoid .upsert(): an upsert compiles to INSERT ... ON
    // CONFLICT DO UPDATE, which makes Postgres evaluate the UPDATE policy too —
    // and that policy needs the row's trip to already exist, so creating a
    // brand-new trip would fail RLS. Insert first; on a duplicate key, update.
    const row = docToRow(doc)
    const { error } = await supabase!.from('documents').insert(row)
    if (!error) return
    // Fall back to UPDATE when the row already exists (23505) OR when inserting
    // is blocked because we don't own it but are allowed to update it — e.g.
    // accepting a friend request, whose row is owned by the sender (42501).
    if (error.code === '23505' || error.code === '42501') {
      const { data, error: upErr } = await supabase!.from('documents').update(row).eq('id', doc.id).select('id')
      if (upErr) throw upErr
      if (!data || data.length === 0) throw error // nothing updated → surface the real error
      return
    }
    throw error
  }
  async remove(collection: string, id: string): Promise<void> {
    // soft delete so other clients converge via realtime
    const { error } = await supabase!
      .from('documents')
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id).eq('collection', collection)
    if (error) throw error
  }
  subscribe(onChange: () => void): () => void {
    const channel = supabase!
      .channel('documents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, onChange)
      .subscribe()
    return () => { supabase!.removeChannel(channel) }
  }
}

const rowToDoc = (r: any): Doc => ({
  id: r.id, collection: r.collection, ownerId: r.owner_id, tripId: r.trip_id,
  data: r.data, updatedAt: r.updated_at, deleted: r.deleted,
})
const docToRow = (d: Doc) => ({
  id: d.id, collection: d.collection, owner_id: d.ownerId, trip_id: d.tripId,
  data: d.data, updated_at: new Date().toISOString(), deleted: d.deleted ?? false,
})

export const store: Store = isCloud ? new SupabaseStore() : new LocalStore()
