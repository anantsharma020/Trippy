import { create } from 'zustand'
import { store, type Doc } from './store'
import { getUser, onAuthChange, type AuthUser } from './auth'
import { isCloud } from './supabase'
import { uid } from './util'
import type {
  ActionItem, Comment, Dream, Friend, Item, MemberRole, PackingItem,
  Profile, Reaction, Trip,
} from './types'

type Coll =
  | 'profiles' | 'friends' | 'trips' | 'items'
  | 'actions' | 'packing' | 'comments' | 'reactions' | 'dreams'

interface AppState {
  ready: boolean
  user: AuthUser | null
  profiles: Profile[]
  friends: Friend[]
  trips: Trip[]
  items: Item[]
  actions: ActionItem[]
  packing: PackingItem[]
  comments: Comment[]
  reactions: Reaction[]
  dreams: Dream[]

  init: () => Promise<void>
  refresh: () => Promise<void>
  setUser: (u: AuthUser | null) => void

  // generic persistence
  put: <T extends { id: string }>(coll: Coll, entity: T, tripId?: string | null, ownerId?: string | null) => Promise<void>
  del: (coll: Coll, id: string) => Promise<void>

  // profiles & friends
  me: () => Profile | undefined
  profile: (id?: string) => Profile | undefined
  ensureProfile: (name?: string) => Promise<void>
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  friendByEmail: (email: string) => Profile | undefined
  sendFriendRequest: (email: string) => Promise<void>
  acceptFriend: (friendId: string) => Promise<void>
  removeFriend: (friendId: string) => Promise<void>
  myFriends: () => Profile[]

  // trips
  myTrips: () => Trip[]
  trip: (id: string) => Trip | undefined
  roleIn: (trip: Trip) => MemberRole | null
  createTrip: (t: Partial<Trip>) => Promise<Trip>
  saveTrip: (t: Trip) => Promise<void>
  deleteTrip: (id: string) => Promise<void>
  setMember: (trip: Trip, userId: string, role: MemberRole) => Promise<void>
  removeMember: (trip: Trip, userId: string) => Promise<void>
}

const group = (docs: Doc[], coll: Coll) =>
  docs.filter((d) => d.collection === coll).map((d) => d.data)

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  user: null,
  profiles: [], friends: [], trips: [], items: [],
  actions: [], packing: [], comments: [], reactions: [], dreams: [],

  setUser: (u) => set({ user: u }),

  init: async () => {
    const apply = async () => {
      const user = await getUser()
      set({ user })
      await get().refresh()
      if (user) await get().ensureProfile(user.name)
      set({ ready: true })
    }
    await apply()
    store.subscribe(() => get().refresh())
    onAuthChange(async () => { await apply() })
  },

  refresh: async () => {
    const docs = await store.load()
    set({
      profiles: group(docs, 'profiles'),
      friends: group(docs, 'friends'),
      trips: group(docs, 'trips'),
      items: group(docs, 'items'),
      actions: group(docs, 'actions'),
      packing: group(docs, 'packing'),
      comments: group(docs, 'comments'),
      reactions: group(docs, 'reactions'),
      dreams: group(docs, 'dreams'),
    })
  },

  put: async (coll, entity, tripId = null, ownerId = null) => {
    const uId = get().user?.id ?? null
    await store.save({
      id: entity.id, collection: coll, ownerId: ownerId ?? uId,
      tripId, data: entity, updatedAt: new Date().toISOString(),
    })
    await get().refresh()
  },

  del: async (coll, id) => { await store.remove(coll, id); await get().refresh() },

  me: () => get().profiles.find((p) => p.id === get().user?.id),
  profile: (id) => get().profiles.find((p) => p.id === id),

  ensureProfile: async (name) => {
    const u = get().user
    if (!u) return
    const existing = get().profiles.find((p) => p.id === u.id)
    if (existing) return
    const profile: Profile = {
      id: u.id,
      name: name || u.name || (u.email ? u.email.split('@')[0] : 'Traveler'),
      email: u.email,
      homeCurrency: 'EUR',
    }
    await get().put('profiles', profile, null, u.id)
  },

  updateProfile: async (patch) => {
    const me = get().me()
    if (!me) return
    await get().put('profiles', { ...me, ...patch }, null, me.id)
  },

  friendByEmail: (email) =>
    get().profiles.find((p) => p.email?.toLowerCase() === email.toLowerCase()),

  sendFriendRequest: async (email) => {
    const u = get().user
    if (!u) throw new Error('Not signed in')
    const target = get().friendByEmail(email)
    if (!target) throw new Error('No Trippy profile uses that email yet.')
    if (target.id === u.id) throw new Error("That's you!")
    const existing = get().friends.find(
      (f) => (f.userId === u.id && f.friendId === target.id) ||
             (f.friendId === u.id && f.userId === target.id))
    if (existing) throw new Error('You are already connected or have a pending request.')
    // A single shared row, owned by the sender. RLS lets both parties read it.
    const row: Friend = { id: uid(), userId: u.id, friendId: target.id, status: 'pending' }
    await get().put('friends', row, null, u.id)
  },

  acceptFriend: async (otherId) => {
    const u = get().user!
    const row = get().friends.find(
      (f) => (f.userId === otherId && f.friendId === u.id) || (f.userId === u.id && f.friendId === otherId))
    if (row) await get().put('friends', { ...row, status: 'accepted' }, null, row.userId)
  },

  removeFriend: async (otherId) => {
    const u = get().user!
    const rows = get().friends.filter(
      (f) => (f.userId === u.id && f.friendId === otherId) || (f.userId === otherId && f.friendId === u.id))
    for (const r of rows) await get().del('friends', r.id)
  },

  myFriends: () => {
    const u = get().user
    if (!u) return []
    const ids = get().friends
      .filter((f) => f.status === 'accepted' && (f.userId === u.id || f.friendId === u.id))
      .map((f) => (f.userId === u.id ? f.friendId : f.userId))
    return get().profiles.filter((p) => ids.includes(p.id))
  },

  myTrips: () => {
    const u = get().user
    if (!u) return []
    return get().trips
      .filter((t) => t.ownerId === u.id || t.members.some((m) => m.userId === u.id))
      .sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'))
  },

  trip: (id) => get().trips.find((t) => t.id === id),

  roleIn: (trip) => {
    const u = get().user
    if (!u) return null
    if (trip.ownerId === u.id) return 'owner'
    return trip.members.find((m) => m.userId === u.id)?.role ?? null
  },

  createTrip: async (t) => {
    const u = get().user!
    const trip: Trip = {
      id: uid(),
      name: t.name || 'Untitled trip',
      ownerId: u.id,
      coverImage: t.coverImage,
      startDate: t.startDate,
      endDate: t.endDate,
      destinations: t.destinations || [],
      members: [{ userId: u.id, role: 'owner' }],
      createdAt: new Date().toISOString(),
    }
    await get().put('trips', trip, trip.id, u.id)
    return trip
  },

  saveTrip: async (t) => { await get().put('trips', t, t.id, t.ownerId) },
  deleteTrip: async (id) => { await get().del('trips', id) },

  setMember: async (trip, userId, role) => {
    const members = trip.members.filter((m) => m.userId !== userId)
    members.push({ userId, role })
    await get().saveTrip({ ...trip, members })
  },
  removeMember: async (trip, userId) => {
    await get().saveTrip({ ...trip, members: trip.members.filter((m) => m.userId !== userId) })
  },
}))

export { isCloud }
