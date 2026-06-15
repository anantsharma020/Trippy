import type { PackingCategory } from './types'

type T = { title: string; category: PackingCategory; quantity?: number }

const base: T[] = [
  { title: 'Passport / ID', category: 'Documents' },
  { title: 'Phone + charger', category: 'Electronics' },
  { title: 'Wallet & cards', category: 'Documents' },
  { title: 'Toothbrush & toothpaste', category: 'Toiletries' },
  { title: 'Underwear', category: 'Clothes', quantity: 5 },
  { title: 'Socks', category: 'Clothes', quantity: 5 },
]

export const PACKING_TEMPLATES: Record<string, T[]> = {
  'Weekend city trip': [...base, { title: 'Comfortable shoes', category: 'Clothes' }, { title: 'Day bag', category: 'Miscellaneous' }, { title: 'Portable battery', category: 'Electronics' }],
  'Beach holiday': [...base, { title: 'Swimsuit', category: 'Beach', quantity: 2 }, { title: 'Sunscreen', category: 'Beach' }, { title: 'Sunglasses', category: 'Beach' }, { title: 'Flip-flops', category: 'Beach' }, { title: 'Beach towel', category: 'Beach' }, { title: 'Sun hat', category: 'Beach' }],
  'Hiking trip': [...base, { title: 'Hiking boots', category: 'Hiking' }, { title: 'Rain jacket', category: 'Hiking' }, { title: 'Water bottle', category: 'Hiking' }, { title: 'Daypack', category: 'Hiking' }, { title: 'First-aid kit', category: 'Medication' }, { title: 'Trail snacks', category: 'Hiking' }],
  'Ski trip': [...base, { title: 'Ski jacket', category: 'Clothes' }, { title: 'Thermal base layers', category: 'Clothes', quantity: 2 }, { title: 'Gloves', category: 'Clothes' }, { title: 'Goggles', category: 'Miscellaneous' }, { title: 'Lip balm', category: 'Toiletries' }],
  'Road trip': [...base, { title: 'Driving licence', category: 'Documents' }, { title: 'Phone car mount', category: 'Electronics' }, { title: 'Snacks', category: 'Miscellaneous' }, { title: 'Offline maps', category: 'Electronics' }, { title: 'Reusable water bottle', category: 'Miscellaneous' }],
  'Backpacking trip': [...base, { title: 'Backpack rain cover', category: 'Miscellaneous' }, { title: 'Quick-dry towel', category: 'Toiletries' }, { title: 'Padlock', category: 'Miscellaneous' }, { title: 'Universal adapter', category: 'Electronics' }, { title: 'Laundry bag', category: 'Miscellaneous' }],
  'Business trip': [...base, { title: 'Laptop + charger', category: 'Work' }, { title: 'Business attire', category: 'Work', quantity: 2 }, { title: 'Notebook & pen', category: 'Work' }, { title: 'Dress shoes', category: 'Work' }],
  'Festival trip': [...base, { title: 'Tickets / wristband', category: 'Documents' }, { title: 'Power bank', category: 'Electronics' }, { title: 'Earplugs', category: 'Miscellaneous' }, { title: 'Poncho', category: 'Clothes' }, { title: 'Cash', category: 'Documents' }],
  'Camping trip': [...base, { title: 'Tent', category: 'Miscellaneous' }, { title: 'Sleeping bag', category: 'Miscellaneous' }, { title: 'Head torch', category: 'Electronics' }, { title: 'Camp stove', category: 'Miscellaneous' }, { title: 'Insect repellent', category: 'Toiletries' }],
  'Long-haul flight': [...base, { title: 'Neck pillow', category: 'Miscellaneous' }, { title: 'Eye mask & earplugs', category: 'Miscellaneous' }, { title: 'Compression socks', category: 'Clothes' }, { title: 'Refillable water bottle', category: 'Miscellaneous' }, { title: 'Downloaded entertainment', category: 'Electronics' }],
  'Traveling with baby': [...base, { title: 'Diapers', category: 'Kids', quantity: 20 }, { title: 'Wipes', category: 'Kids' }, { title: 'Baby food / formula', category: 'Kids' }, { title: 'Stroller', category: 'Kids' }, { title: 'Favourite toy', category: 'Kids' }],
  'Rainy destination': [...base, { title: 'Umbrella', category: 'Miscellaneous' }, { title: 'Waterproof jacket', category: 'Clothes' }, { title: 'Waterproof shoes', category: 'Clothes' }, { title: 'Dry bag for electronics', category: 'Electronics' }],
  'Hot destination': [...base, { title: 'Sunscreen SPF50', category: 'Toiletries' }, { title: 'Light breathable clothes', category: 'Clothes', quantity: 4 }, { title: 'Sun hat', category: 'Clothes' }, { title: 'Electrolyte tablets', category: 'Medication' }],
  'Cold destination': [...base, { title: 'Warm coat', category: 'Clothes' }, { title: 'Thermal layers', category: 'Clothes', quantity: 2 }, { title: 'Beanie & gloves', category: 'Clothes' }, { title: 'Hand warmers', category: 'Miscellaneous' }, { title: 'Moisturizer', category: 'Toiletries' }],
}
