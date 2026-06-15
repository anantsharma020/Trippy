import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Trippy runs in two modes:
//   - LOCAL (default): no Supabase configured -> everything lives in this
//     browser. Great for trying the app and for a single device.
//   - CLOUD: Supabase configured -> real accounts, login from any device, and
//     shared trips with friends.
export const isCloud = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isCloud
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
