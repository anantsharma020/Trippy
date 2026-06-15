import { useState } from 'react'
import { UserPlus, Check, X, Users, Mail } from 'lucide-react'
import AppShell from '../ui/AppShell'
import { useApp } from '../lib/db'
import { isCloud } from '../lib/supabase'
import { Button, Input, Card, Avatar, EmptyState, Field } from '../ui/primitives'

export default function Friends() {
  const { sendFriendRequest, acceptFriend, removeFriend } = useApp.getState()
  const user = useApp((s) => s.user)
  const friendsRows = useApp((s) => s.friends)
  const profile = useApp((s) => s.profile)
  const accepted = useApp((s) => s.myFriends())
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const incoming = friendsRows.filter((f) => f.status === 'pending' && f.friendId === user?.id)
  const outgoing = friendsRows.filter((f) => f.status === 'pending' && f.userId === user?.id)

  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    try { await sendFriendRequest(email.trim()); setEmail(''); setMsg({ kind: 'ok', text: 'Request sent!' }) }
    catch (e: any) { setMsg({ kind: 'err', text: e.message }) }
  }

  return (
    <AppShell title="Friends" back="/">
      <div className="space-y-5">
        <Card>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200"><UserPlus size={16} />Add a friend</h3>
          <form onSubmit={add} className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@email.com" className="pl-9" />
            </div>
            <Button type="submit" disabled={!email.trim()}>Send</Button>
          </form>
          {msg && <p className={`mt-2 text-sm ${msg.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}
          <p className="mt-2 text-xs text-slate-500">
            {isCloud ? 'They need a Trippy account with that email. Once connected, you can add them to trips.'
              : 'Local mode: create a second profile (sign out → Create profile) using this email, then send the request. Switch profiles to accept.'}
          </p>
        </Card>

        {incoming.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Requests</h3>
            <div className="space-y-2">
              {incoming.map((f) => {
                const p = profile(f.userId) // sender
                return (
                  <div key={f.id} className="flex items-center gap-3 rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-3 py-2.5">
                    <Avatar name={p?.name || '?'} src={p?.photoUrl} size={32} />
                    <span className="flex-1 text-sm text-slate-200">{p?.name || p?.email || 'Someone'}</span>
                    <Button size="sm" onClick={() => acceptFriend(f.userId)}><Check size={15} />Accept</Button>
                    <Button size="sm" variant="ghost" className="text-rose-400" onClick={() => removeFriend(f.userId)}><X size={15} /></Button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Your friends</h3>
          {accepted.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="No friends yet" hint="Add travel partners by email so you can plan trips together." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {accepted.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-ink-900/70 ring-1 ring-ink-800 px-3 py-2.5">
                  <Avatar name={p.name} src={p.photoUrl} size={34} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-100">{p.name}</p><p className="truncate text-xs text-slate-500">{p.email}</p></div>
                  <button onClick={() => removeFriend(p.id)} className="text-xs text-slate-500 hover:text-rose-400">Remove</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {outgoing.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Pending requests</h3>
            <div className="space-y-2">
              {outgoing.map((f) => {
                const p = profile(f.friendId)
                return (
                  <div key={f.id} className="flex items-center gap-3 rounded-xl bg-ink-900/40 ring-1 ring-ink-800 px-3 py-2 text-slate-400">
                    <Avatar name={p?.name || '?'} size={28} />
                    <span className="flex-1 text-sm">{p?.name || p?.email}</span>
                    <span className="text-xs">Pending…</span>
                    <button onClick={() => removeFriend(f.friendId)} className="text-xs hover:text-rose-400">Cancel</button>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
