import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Save, Download, Upload, Luggage, ChevronRight } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { isCloud } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { exportBackup, importBackup } from '../lib/backup'
import ImagePicker from '../components/ImagePicker'
import { Button, Card, Field, Input, Avatar } from '../ui/primitives'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'DKK']

export default function ProfilePage() {
  const me = useApp((s) => s.me())
  const updateProfile = useApp((s) => s.updateProfile)
  const [name, setName] = useState(me?.name || '')
  const [photo, setPhoto] = useState(me?.photoUrl || '')
  const [currency, setCurrency] = useState(me?.homeCurrency || 'EUR')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  async function save() {
    await updateProfile({ name: name.trim() || me?.name, photoUrl: photo || undefined, homeCurrency: currency })
    setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg('Importing…')
    try {
      const { trips, total, failed } = await importBackup(file)
      setMsg(`Restored ${trips} trip${trips === 1 ? '' : 's'} (${total} records)${failed ? ` · ${failed} skipped` : ''}.`)
    } catch (err: any) {
      setMsg(err.message || 'Import failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <AppShell title="Profile" back="/">
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={name || '?'} src={photo} size={56} />
          <div><p className="font-semibold text-slate-900">{me?.name}</p><p className="text-sm text-slate-500">{me?.email}</p></div>
        </div>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Profile photo" hint="upload from your phone, or paste a URL"><ImagePicker value={photo} onChange={(v) => setPhoto(v || '')} /></Field>
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

      <Link to="/core-packing" className="mt-5 block">
        <Card className="flex items-center gap-3 transition hover:ring-brand-500/40">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-800 text-brand-600"><Luggage size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Core packing list</p>
            <p className="text-sm text-slate-500">Personal essentials added to every template</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-slate-400" />
        </Card>
      </Link>

      <Card className="mt-5 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-900">Backup & restore</h3>
          <p className="mt-0.5 text-sm text-slate-500">Export your trips to a file, then import on another device or after switching to cloud sync.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => exportBackup()}><Download size={16} />Export my data</Button>
          <Button variant="soft" onClick={() => fileRef.current?.click()}><Upload size={16} />Import from file</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        </div>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
      </Card>

      <div className="mt-5 text-center">
        <Button variant="soft" onClick={() => signOut()}>Sign out</Button>
        <p className="mt-3 text-xs text-slate-600">{isCloud ? 'Synced via Supabase — signed in across devices' : 'Local mode — data stays in this browser'}</p>
      </div>
    </AppShell>
  )
}
