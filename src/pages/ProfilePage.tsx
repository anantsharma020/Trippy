import { useState } from 'react'
import { Save } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { isCloud } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { Button, Card, Field, Input, Avatar } from '../ui/primitives'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'DKK']

export default function ProfilePage() {
  const me = useApp((s) => s.me())
  const updateProfile = useApp((s) => s.updateProfile)
  const [name, setName] = useState(me?.name || '')
  const [photo, setPhoto] = useState(me?.photoUrl || '')
  const [currency, setCurrency] = useState(me?.homeCurrency || 'EUR')
  const [saved, setSaved] = useState(false)

  async function save() {
    await updateProfile({ name: name.trim() || me?.name, photoUrl: photo || undefined, homeCurrency: currency })
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  return (
    <AppShell title="Profile" back="/">
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={name || '?'} src={photo} size={56} />
          <div><p className="font-semibold text-slate-900">{me?.name}</p><p className="text-sm text-slate-500">{me?.email}</p></div>
        </div>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Profile photo URL" hint="optional"><Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" /></Field>
        <Field label="Home currency">
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button key={c} onClick={() => setCurrency(c)} className={`rounded-full px-3 py-1 text-sm font-medium transition ${currency === c ? 'bg-brand-600 text-white' : 'bg-ink-800 text-slate-300'}`}>{c}</button>
            ))}
          </div>
        </Field>
        <div className="flex items-center gap-2">
          <Button onClick={save}><Save size={16} />Save</Button>
          {saved && <span className="text-sm text-emerald-400">Saved!</span>}
        </div>
      </Card>

      <div className="mt-5 text-center">
        <Button variant="soft" onClick={() => signOut()}>Sign out</Button>
        <p className="mt-3 text-xs text-slate-600">{isCloud ? 'Synced via Supabase' : 'Local mode — data stays in this browser'}</p>
      </div>
    </AppShell>
  )
}
