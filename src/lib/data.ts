import { useApp } from './db'
import { uid } from './util'
import { PACKING_TEMPLATES, DEFAULT_CORE } from './packingTemplates'
import type {
  ActionItem, Comment, Dream, Item, ItemCategory, PackingItem, PackTemplate, Reaction,
} from './types'

// Thin typed helpers over the generic store for the per-trip collections.
// Components call these and then read derived state from `useApp`.

const app = () => useApp.getState()

// --- Items (the flexible object) -------------------------------------------
export function newItem(tripId: string, partial: Partial<Item> = {}): Item {
  const u = app().user!
  return {
    id: uid(),
    tripId,
    title: partial.title || '',
    category: partial.category || 'General note',
    tags: partial.tags || [],
    bookingStatus: partial.bookingStatus || 'None',
    assignedTo: partial.assignedTo || [],
    createdBy: u.id,
    createdAt: new Date().toISOString(),
    ...partial,
  }
}
export const saveItem = async (i: Item) => {
  await app().put('items', i, i.tripId, i.createdBy)
  await reconcileBookingAction(i)
}

// Keep a "Book <title>" action item in sync with an item's "Need to book" flag.
async function reconcileBookingAction(i: Item) {
  const st = app()
  const existing = st.actions.find((a) => a.relatedItemId === i.id && a.auto)
  const needs = i.bookingStatus === 'Need to book'
  const wantTitle = `Book ${i.title || 'item'}`
  if (needs && !existing) {
    await st.put('actions', newAction(i.tripId, { title: wantTitle, relatedItemId: i.id, auto: true, category: 'Booking', priority: i.priority }), i.tripId, i.createdBy)
  } else if (needs && existing && existing.title !== wantTitle && existing.status !== 'Done') {
    await st.put('actions', { ...existing, title: wantTitle }, i.tripId, existing.createdBy)
  } else if (!needs && existing && existing.status !== 'Done') {
    await st.del('actions', existing.id)
  }
}

export const deleteItem = async (id: string) => {
  // cascade: drop comments/reactions/actions linked to this item
  const st = app()
  for (const c of st.comments.filter((c) => c.itemId === id)) await st.del('comments', c.id)
  for (const r of st.reactions.filter((r) => r.itemId === id)) await st.del('reactions', r.id)
  for (const a of st.actions.filter((a) => a.relatedItemId === id && a.auto)) await st.del('actions', a.id)
  await st.del('items', id)
}
export const tripItems = (tripId: string): Item[] =>
  app().items.filter((i) => i.tripId === tripId)

// --- Action items -----------------------------------------------------------
export function newAction(tripId: string, partial: Partial<ActionItem> = {}): ActionItem {
  const u = app().user!
  return {
    id: uid(), tripId, title: partial.title || '', status: partial.status || 'To do',
    createdBy: u.id, createdAt: new Date().toISOString(), ...partial,
  }
}
export const saveAction = (a: ActionItem) => app().put('actions', a, a.tripId, a.createdBy)
export const deleteAction = (id: string) => app().del('actions', id)
export const tripActions = (tripId: string) => app().actions.filter((a) => a.tripId === tripId)

// --- Packing ----------------------------------------------------------------
export function newPacking(tripId: string, partial: Partial<PackingItem> = {}): PackingItem {
  return {
    id: uid(), tripId, title: partial.title || '', category: partial.category || 'Miscellaneous',
    quantity: partial.quantity ?? 1, packed: partial.packed ?? false, ...partial,
  }
}
export const savePacking = (p: PackingItem) => app().put('packing', p, p.tripId)
export const deletePacking = (id: string) => app().del('packing', id)
export const tripPacking = (tripId: string) => app().packing.filter((p) => p.tripId === tripId)

// --- Packing templates (per-user, editable) ---------------------------------
export const myTemplates = (): PackTemplate[] => {
  const u = app().user
  return app().packTemplates.filter((t) => t.userId === u?.id)
}
export const savePackTemplate = (t: PackTemplate) => app().put('packtemplates', t, null, t.userId)
export const deletePackTemplate = (id: string) => app().del('packtemplates', id)
export function newPackTemplate(name = ''): PackTemplate {
  return { id: uid(), userId: app().user!.id, name, items: [] }
}

// Seed (and upgrade) the user's packing setup. Version 2 moves common items into
// the personal core list and makes templates theme-only. `seeding` guards against
// React StrictMode double-invoking the effect before the first write lands.
const TEMPLATE_VERSION = 3
let seeding = false
export async function seedTemplates() {
  const st = app()
  const me = st.me()
  if (!me || seeding || (me.templatesVersion ?? 0) >= TEMPLATE_VERSION) return
  seeding = true
  try {
    // Replace the default templates (old bloated ones / any matching a default
    // name) with the new theme-only set. Custom-named templates are untouched.
    for (const t of myTemplates().filter((t) => t.auto || PACKING_TEMPLATES[t.name])) await st.del('packtemplates', t.id)
    for (const [name, items] of Object.entries(PACKING_TEMPLATES)) {
      await st.put('packtemplates', { id: uid(), userId: me.id, name, items, auto: true }, null, me.id)
    }
    // Merge the everyday defaults into the core list (dedup by title). Done last
    // and only on success, so a failed run retries cleanly next time.
    const coreSeen = new Set<string>()
    const mergedCore = [...(me.corePacking ?? []), ...DEFAULT_CORE].filter((it) => {
      const k = it.title.trim().toLowerCase()
      if (!k || coreSeen.has(k)) return false
      coreSeen.add(k); return true
    })
    await st.updateProfile({ templatesVersion: TEMPLATE_VERSION, corePacking: mergedCore })
  } finally {
    seeding = false
  }
}

// --- Comments & reactions ---------------------------------------------------
export const addComment = (itemId: string, body: string) => {
  const u = app().user!
  const tripId = app().items.find((i) => i.id === itemId)?.tripId ?? null
  const c: Comment = { id: uid(), itemId, authorId: u.id, body, createdAt: new Date().toISOString() }
  return app().put('comments', c, tripId, u.id)
}
export const deleteComment = (id: string) => app().del('comments', id)
export const itemComments = (itemId: string) =>
  app().comments.filter((c) => c.itemId === itemId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))

export const toggleReaction = async (itemId: string, emoji: string) => {
  const u = app().user!
  const existing = app().reactions.find((r) => r.itemId === itemId && r.userId === u.id && r.emoji === emoji)
  if (existing) return app().del('reactions', existing.id)
  const tripId = app().items.find((i) => i.id === itemId)?.tripId ?? null
  const r: Reaction = { id: uid(), itemId, userId: u.id, emoji }
  return app().put('reactions', r, tripId, u.id)
}
export const itemReactions = (itemId: string) => app().reactions.filter((r) => r.itemId === itemId)

// --- Dream destinations -----------------------------------------------------
export function newDream(partial: Partial<Dream> = {}): Dream {
  const u = app().user!
  return {
    id: uid(), userId: u.id, name: partial.name || '', links: partial.links || [],
    status: partial.status || 'Want to go', ...partial,
  }
}
export const saveDream = (d: Dream) => app().put('dreams', d, null, d.userId)
export const deleteDream = (id: string) => app().del('dreams', id)
export const myDreams = () => {
  const u = app().user
  return app().dreams.filter((d) => d.userId === u?.id)
}

// --- Category visuals -------------------------------------------------------
export const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  Sight: '🏛️', Restaurant: '🍽️', 'Café': '☕', Bar: '🍸', Museum: '🖼️',
  Hike: '🥾', Beach: '🏖️', Viewpoint: '🌄', Shop: '🛍️', Neighborhood: '🏘️',
  'Day trip': '🚌', Activity: '🎟️', Event: '🎉', Accommodation: '🏨',
  Flight: '✈️', Drive: '🚗', 'Car rental': '🚙', Train: '🚆', Ferry: '⛴️', Transfer: '🚕',
  'General note': '📝', Custom: '⭐',
}
export const TRANSPORT_CATS: ItemCategory[] = ['Flight', 'Drive', 'Train', 'Ferry', 'Transfer']
export const BOOKABLE_CATS: ItemCategory[] = ['Accommodation', 'Car rental', ...TRANSPORT_CATS]
