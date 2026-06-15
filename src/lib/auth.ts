import { supabase, isCloud } from './supabase'
import { uid } from './util'

// Unified auth surface over Supabase (cloud) and a local profile store.
// In local mode credentials never leave the browser — it exists so you can try
// the whole app, including multi-profile collaboration, with zero setup.

export interface AuthUser { id: string; email?: string; name?: string }

const SESSION_KEY = 'trippy:session'
const CRED_KEY = 'trippy:auth'

type Creds = Record<string, { id: string; name: string; hash: string }>

const readCreds = (): Creds => {
  try { return JSON.parse(localStorage.getItem(CRED_KEY) || '{}') } catch { return {} }
}
const writeCreds = (c: Creds) => localStorage.setItem(CRED_KEY, JSON.stringify(c))

async function hash(pw: string): Promise<string> {
  // Web Crypto is only available in secure contexts (HTTPS / localhost). When
  // serving over plain HTTP on a LAN IP it's undefined, so fall back to a small
  // deterministic hash. Local mode is demo-only auth, never real security.
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < pw.length; i++) {
    const ch = pw.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 'fnv' + (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

export const localSessionId = () => localStorage.getItem(SESSION_KEY) || null

export async function getUser(): Promise<AuthUser | null> {
  if (isCloud) {
    const { data } = await supabase!.auth.getUser()
    if (!data.user) return null
    return { id: data.user.id, email: data.user.email ?? undefined }
  }
  const id = localSessionId()
  if (!id) return null
  const cred = Object.values(readCreds()).find((c) => c.id === id)
  return { id, name: cred?.name }
}

export async function signUp(name: string, email: string, password: string): Promise<AuthUser> {
  if (isCloud) {
    const { data, error } = await supabase!.auth.signUp({
      email, password, options: { data: { name } },
    })
    if (error) throw error
    if (!data.user) throw new Error('Check your email to confirm your account, then sign in.')
    return { id: data.user.id, email, name }
  }
  const creds = readCreds()
  const key = email.toLowerCase()
  if (creds[key]) throw new Error('A profile with that email already exists.')
  const id = uid()
  creds[key] = { id, name, hash: await hash(password) }
  writeCreds(creds)
  localStorage.setItem(SESSION_KEY, id)
  window.dispatchEvent(new Event('trippy:changed'))
  return { id, email, name }
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (isCloud) {
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { id: data.user.id, email: data.user.email ?? undefined }
  }
  const creds = readCreds()
  const cred = creds[email.toLowerCase()]
  if (!cred || cred.hash !== (await hash(password))) throw new Error('Wrong email or password.')
  localStorage.setItem(SESSION_KEY, cred.id)
  window.dispatchEvent(new Event('trippy:changed'))
  return { id: cred.id, email, name: cred.name }
}

export async function signOut(): Promise<void> {
  if (isCloud) { await supabase!.auth.signOut(); return }
  localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('trippy:changed'))
}

// Local-only helper: list the profiles registered in this browser so people can
// switch between them to experience shared trips.
export function localProfiles(): { id: string; name: string; email: string }[] {
  if (isCloud) return []
  return Object.entries(readCreds()).map(([email, c]) => ({ id: c.id, name: c.name, email }))
}
export function switchLocalProfile(id: string) {
  if (isCloud) return
  localStorage.setItem(SESSION_KEY, id)
  window.dispatchEvent(new Event('trippy:changed'))
}

export function onAuthChange(cb: () => void): () => void {
  if (isCloud) {
    const { data } = supabase!.auth.onAuthStateChange(() => cb())
    return () => data.subscription.unsubscribe()
  }
  const h = () => cb()
  window.addEventListener('trippy:changed', h)
  return () => window.removeEventListener('trippy:changed', h)
}
