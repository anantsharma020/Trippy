// ---------------------------------------------------------------------------
// Trippy domain model
//
// The central concept is the flexible `Item`. A single item can surface in many
// sections of the app depending on which fields are filled in:
//   - no date            -> Ideas
//   - has a date         -> Itinerary
//   - has booking info   -> Travel Details
//   - has a location     -> Map
//   - has a linked task  -> Action Items
// We never duplicate an item; the views are just filters over the same records.
// ---------------------------------------------------------------------------

export type ID = string

export interface Profile {
  id: ID
  name: string
  email?: string
  photoUrl?: string
  homeCurrency: string // ISO 4217, defaults to EUR
  templatesSeeded?: boolean // have the default packing templates been copied in?
}

// A user-owned, editable packing template.
export interface PackTemplate {
  id: ID
  userId: ID
  name: string
  items: { title: string; category: PackingCategory; quantity?: number }[]
}

export type FriendStatus = 'pending' | 'accepted'

export interface Friend {
  id: ID
  userId: ID // the request sender
  friendId: ID // the request recipient
  status: FriendStatus
  // Direction is derived per current user (sender => outgoing, recipient => incoming),
  // so a single shared row works under both local and Supabase row-level security.
}

export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface TripMember {
  userId: ID
  role: MemberRole
}

export interface Destination {
  id: ID
  name: string
  lat?: number
  lng?: number
  countryCode?: string // ISO-3166 alpha-2, used to infer currency
  currency?: string // ISO 4217
  startDate?: string // ISO date (yyyy-mm-dd)
  endDate?: string
}

export interface Trip {
  id: ID
  name: string
  ownerId: ID
  coverImage?: string
  startDate?: string
  endDate?: string
  destinations: Destination[]
  members: TripMember[]
  createdAt: string
  // A dream is a lightweight "draft trip": a destination you're collecting ideas
  // for, with no dates yet. "Plan trip" flips this off and it becomes a real trip.
  isDream?: boolean
}

// --- The flexible item ------------------------------------------------------

export const ITEM_CATEGORIES = [
  'Sight', 'Restaurant', 'Café', 'Bar', 'Museum', 'Hike', 'Beach', 'Viewpoint',
  'Shop', 'Neighborhood', 'Day trip', 'Activity', 'Event', 'Accommodation',
  'Flight', 'Drive', 'Car rental', 'Train', 'Ferry', 'Transfer', 'General note', 'Custom',
] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

export const ITEM_STATUSES = [
  'New', 'Interested', 'Must-do', 'Maybe', 'Added to itinerary', 'Done', 'Skipped',
] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

export type Priority = 'Low' | 'Medium' | 'High'
export type RoughTime = 'Morning' | 'Afternoon' | 'Evening' | 'Night'
export type BookingStatus = 'None' | 'Need to book' | 'Booked'

export interface Item {
  id: ID
  tripId: ID
  title: string
  category: ItemCategory
  destinationId?: ID
  city?: string
  // free-form location label; lat/lng power the map
  locationLabel?: string
  lat?: number
  lng?: number
  notes?: string
  link?: string
  source?: string // e.g. an Instagram URL or who recommended it
  tags: string[]
  priority?: Priority
  status?: ItemStatus // optional — kept for back-compat, not surfaced in the UI
  cost?: number
  currency?: string
  // scheduling — presence of `date` moves the item into the Itinerary
  date?: string // ISO date
  roughTime?: RoughTime
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  endDate?: string // for multi-day items
  duration?: string // approximate, free-form e.g. "2-3 hours"
  // travel-details payload (flights/hotels/cars/etc.)
  bookingStatus: BookingStatus
  booking?: BookingDetails
  createdBy: ID
  assignedTo: ID[]
  createdAt: string
}

// A single flight segment (for multi-leg itineraries with layovers).
export interface FlightLeg {
  id: ID
  airline?: string
  flightNumber?: string
  fromCode?: string
  toCode?: string
  date?: string
  depTime?: string
  arrTime?: string
  seat?: string
  baggage?: string
}

// Structured confirmation details for the Travel Details section.
export interface BookingDetails {
  provider?: string // airline / hotel / rental company / platform
  reference?: string // booking reference / confirmation number
  // flight (single-leg quick fields, or use `legs` for layovers)
  flightNumber?: string
  fromCode?: string
  toCode?: string
  seat?: string
  baggage?: string
  legs?: FlightLeg[]
  // accommodation / car
  address?: string
  checkIn?: string
  checkOut?: string
  contact?: string
  cancellationDeadline?: string
  // generic
  checkInLink?: string
  attachments?: Attachment[]
  extra?: string
}

export interface Attachment {
  id: ID
  name: string
  url: string
}

// --- Action items (planning tasks, not itinerary events) --------------------

export const ACTION_STATUSES = ['To do', 'In progress', 'Waiting', 'Done', 'Not needed'] as const
export type ActionStatus = (typeof ACTION_STATUSES)[number]

export interface ActionItem {
  id: ID
  tripId: ID
  title: string
  notes?: string
  dueDate?: string
  assignedTo?: ID
  relatedItemId?: ID
  priority?: Priority
  status: ActionStatus
  category?: string
  link?: string
  auto?: boolean // auto-created from an item's "Need to book" flag
  createdBy: ID
  createdAt: string
}

// --- Packing ----------------------------------------------------------------

export const PACKING_CATEGORIES = [
  'Clothes', 'Toiletries', 'Electronics', 'Documents', 'Medication',
  'Beach', 'Hiking', 'Work', 'Kids', 'Miscellaneous',
] as const
export type PackingCategory = (typeof PACKING_CATEGORIES)[number]

export interface PackingItem {
  id: ID
  tripId: ID
  title: string
  category: PackingCategory
  quantity: number
  bag?: string
  person?: ID
  notes?: string
  packed: boolean
}

// --- Social on items --------------------------------------------------------

export interface Comment {
  id: ID
  itemId: ID
  authorId: ID
  body: string
  createdAt: string
}

export interface Reaction {
  id: ID
  itemId: ID
  userId: ID
  emoji: string
}

// --- Dream destinations -----------------------------------------------------

export type DreamStatus = 'Want to go' | 'Planned' | 'Visited'

export interface Dream {
  id: ID
  userId: ID
  name: string
  lat?: number
  lng?: number
  notes?: string
  links: string[]
  priority?: Priority
  bestTime?: string
  status: DreamStatus
}

// Convenience: does an item belong on the itinerary?
export const isScheduled = (i: Item) => Boolean(i.date)
