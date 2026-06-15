import { useState } from 'react'
import { Plane, Users, MapPin, Sparkles } from 'lucide-react'
import { signIn, signUp, localProfiles, switchLocalProfile } from '../lib/auth'
import { isCloud } from '../lib/supabase'
import { Button, Input, Field, Avatar } from '../ui/primitives'

export default function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>(localProfiles().length ? 'in' : 'up')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const profiles = localProfiles()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      if (mode === 'up') await signUp(name.trim(), email.trim(), pw)
      else await signIn(email.trim(), pw)
    } catch (e: any) { setErr(e.message || 'Something went wrong') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 shadow-xl shadow-brand-900/50">
            <Plane size={30} className="text-white -rotate-12" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Trippy</h1>
          <p className="mt-2 text-slate-400">Plan as little or as much as you want.</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
          <Feat icon={<Sparkles size={16} />} label="Capture ideas" />
          <Feat icon={<MapPin size={16} />} label="Map & itinerary" />
          <Feat icon={<Users size={16} />} label="Plan together" />
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-ink-900/70 ring-1 ring-ink-800 p-5">
          <div className="flex rounded-xl bg-ink-850 p-1 ring-1 ring-ink-700">
            {(['up', 'in'] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setErr('') }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${mode === m ? 'bg-brand-600 text-white' : 'text-slate-300'}`}>
                {m === 'up' ? 'Create profile' : 'Sign in'}
              </button>
            ))}
          </div>

          {mode === 'up' && (
            <Field label="Your name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Traveler" required /></Field>
          )}
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required /></Field>
          <Field label="Password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required minLength={4} /></Field>

          {err && <p className="text-sm text-rose-400">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'up' ? 'Create profile' : 'Sign in'}
          </Button>
        </form>

        {!isCloud && profiles.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-center text-xs uppercase tracking-wide text-slate-500">Profiles on this device</p>
            <div className="flex flex-wrap justify-center gap-2">
              {profiles.map((p) => (
                <button key={p.id} onClick={() => switchLocalProfile(p.id)}
                  className="flex items-center gap-2 rounded-full bg-ink-850 ring-1 ring-ink-700 py-1.5 pl-1.5 pr-3 hover:ring-brand-500">
                  <Avatar name={p.name} size={26} />
                  <span className="text-sm text-slate-200">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          {isCloud
            ? 'Your trips sync across every device you sign in on.'
            : 'Running in local mode — data stays in this browser. Add Supabase keys to sync across devices and invite friends.'}
        </p>
      </div>
    </div>
  )
}

function Feat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-ink-900/50 ring-1 ring-ink-800 py-3">
      <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-lg bg-ink-800 text-brand-300">{icon}</div>
      {label}
    </div>
  )
}
