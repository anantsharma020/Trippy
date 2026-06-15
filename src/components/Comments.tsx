import { useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useApp } from '../lib/db'
import { addComment, deleteComment, itemComments } from '../lib/data'
import { Avatar, Input, Button } from '../ui/primitives'
import { fmtDate } from '../lib/util'

export default function Comments({ itemId }: { itemId: string }) {
  const me = useApp((s) => s.user)
  const profile = useApp((s) => s.profile)
  useApp((s) => s.comments) // subscribe to changes
  const comments = itemComments(itemId)
  const [body, setBody] = useState('')

  async function send() {
    if (!body.trim()) return
    await addComment(itemId, body.trim())
    setBody('')
  }

  return (
    <div className="space-y-2">
      {comments.map((c) => {
        const p = profile(c.authorId)
        return (
          <div key={c.id} className="flex items-start gap-2">
            <Avatar name={p?.name || '?'} src={p?.photoUrl} size={26} />
            <div className="flex-1 rounded-xl bg-ink-850 px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-slate-200">{p?.name || 'Unknown'}</span>
                <span className="text-[10px] text-slate-500">{fmtDate(c.createdAt.slice(0, 10), 'MMM d')}</span>
                {c.authorId === me?.id && (
                  <button onClick={() => deleteComment(c.id)} className="ml-auto text-slate-500 hover:text-rose-400"><Trash2 size={12} /></button>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-300 whitespace-pre-wrap">{c.body}</p>
            </div>
          </div>
        )
      })}
      <div className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…"
          onKeyDown={(e) => e.key === 'Enter' && send()} />
        <Button size="sm" onClick={send} disabled={!body.trim()}><Send size={15} /></Button>
      </div>
    </div>
  )
}
