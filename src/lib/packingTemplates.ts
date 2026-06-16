import type { PackItem } from './types'

// Everyday essentials almost everyone brings. Seeded into each user's editable
// "core packing list" (Profile → Core packing list) and auto-added to every
// template they apply. Templates below hold only theme-specific extras.
export const DEFAULT_CORE: PackItem[] = [
  { title: 'Passport / ID', category: 'Documents' },
  { title: 'Wallet & cards', category: 'Documents' },
  { title: 'Phone + charger', category: 'Electronics' },
  { title: 'Toothbrush & toothpaste', category: 'Toiletries' },
  { title: 'Deodorant', category: 'Toiletries' },
  { title: 'Underwear', category: 'Clothes', quantity: 5 },
  { title: 'Socks', category: 'Clothes', quantity: 5 },
  { title: 'Medications', category: 'Medication' },
]

// Theme-specific items only — your core list is merged in automatically.
export const PACKING_TEMPLATES: Record<string, PackItem[]> = {
  'Weekend city trip': [{ title: 'Comfortable shoes', category: 'Clothes' }, { title: 'Day bag', category: 'Miscellaneous' }, { title: 'Portable battery', category: 'Electronics' }],
  'Beach holiday': [{ title: 'Swimsuit', category: 'Beach', quantity: 2 }, { title: 'Sunscreen', category: 'Beach' }, { title: 'Sunglasses', category: 'Beach' }, { title: 'Flip-flops', category: 'Beach' }, { title: 'Beach towel', category: 'Beach' }, { title: 'Sun hat', category: 'Beach' }],
  'Hiking trip': [{ title: 'Hiking boots', category: 'Hiking' }, { title: 'Rain jacket', category: 'Hiking' }, { title: 'Water bottle', category: 'Hiking' }, { title: 'Daypack', category: 'Hiking' }, { title: 'First-aid kit', category: 'Medication' }, { title: 'Trail snacks', category: 'Hiking' }],
  'Ski trip': [{ title: 'Ski jacket', category: 'Clothes' }, { title: 'Thermal base layers', category: 'Clothes', quantity: 2 }, { title: 'Gloves', category: 'Clothes' }, { title: 'Goggles', category: 'Miscellaneous' }, { title: 'Lip balm', category: 'Toiletries' }],
  'Road trip': [{ title: "Driver's licence", category: 'Documents' }, { title: 'Phone car mount', category: 'Electronics' }, { title: 'Snacks', category: 'Miscellaneous' }, { title: 'Offline maps', category: 'Electronics' }],
  'Backpacking trip': [{ title: 'Quick-dry towel', category: 'Toiletries' }, { title: 'Padlock', category: 'Miscellaneous' }, { title: 'Universal adapter', category: 'Electronics' }, { title: 'Laundry bag', category: 'Miscellaneous' }],
  'Business trip': [{ title: 'Laptop + charger', category: 'Work' }, { title: 'Business attire', category: 'Work', quantity: 2 }, { title: 'Notebook & pen', category: 'Work' }, { title: 'Dress shoes', category: 'Work' }],
  'Festival trip': [{ title: 'Tickets / wristband', category: 'Documents' }, { title: 'Power bank', category: 'Electronics' }, { title: 'Earplugs', category: 'Miscellaneous' }, { title: 'Poncho', category: 'Clothes' }, { title: 'Cash', category: 'Documents' }],
  'Camping trip': [{ title: 'Tent', category: 'Miscellaneous' }, { title: 'Sleeping bag', category: 'Miscellaneous' }, { title: 'Head torch', category: 'Electronics' }, { title: 'Camp stove', category: 'Miscellaneous' }, { title: 'Insect repellent', category: 'Toiletries' }],
  'Long-haul flight': [{ title: 'Neck pillow', category: 'Miscellaneous' }, { title: 'Eye mask & earplugs', category: 'Miscellaneous' }, { title: 'Compression socks', category: 'Clothes' }, { title: 'Downloaded entertainment', category: 'Electronics' }],
  'Traveling with baby': [{ title: 'Diapers', category: 'Kids', quantity: 20 }, { title: 'Wipes', category: 'Kids' }, { title: 'Baby food / formula', category: 'Kids' }, { title: 'Stroller', category: 'Kids' }, { title: 'Favourite toy', category: 'Kids' }],
  'Rainy destination': [{ title: 'Umbrella', category: 'Miscellaneous' }, { title: 'Waterproof jacket', category: 'Clothes' }, { title: 'Waterproof shoes', category: 'Clothes' }, { title: 'Dry bag for electronics', category: 'Electronics' }],
  'Hot destination': [{ title: 'Sunscreen SPF50', category: 'Toiletries' }, { title: 'Light breathable clothes', category: 'Clothes', quantity: 4 }, { title: 'Sun hat', category: 'Clothes' }, { title: 'Electrolyte tablets', category: 'Medication' }],
  'Cold destination': [{ title: 'Warm coat', category: 'Clothes' }, { title: 'Thermal layers', category: 'Clothes', quantity: 2 }, { title: 'Beanie & gloves', category: 'Clothes' }, { title: 'Hand warmers', category: 'Miscellaneous' }, { title: 'Moisturizer', category: 'Toiletries' }],
}
