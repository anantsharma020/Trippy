import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Users, User, LogOut, Plane } from 'lucide-react'
import { useApp } from '../lib/db'
import { signOut } from '../lib/auth'
import { Avatar } from './primitives'
import BottomNav from './BottomNav'

export default function AppShell({ title, back, children, right, bottomNav, subBar }: {
  title?: React.ReactNode; back?: string; children: React.ReactNode; right?: React.ReactNode
  bottomNav?: boolean; subBar?: React.ReactNode
}) {
  const me = useApp((s) => s.me())
  const [menu, setMenu] = useState(false)
  const nav = useNavigate()

  return (
    <div className="min-h-screen safe-bottom">
      {/* Header + optional sub-bar are one sticky block, so the section nav stays
          glued under the title bar with no gap and never floats over content. */}
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/80 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          {back ? (
            <Link to={back} className="rounded-lg p-1.5 hover:bg-ink-800 text-slate-300"><ChevronLeft size={20} /></Link>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600"><Plane size={16} className="text-white -rotate-12" /></span>
              <span className="text-lg font-bold text-slate-900">Trippy</span>
            </Link>
          )}
          {title && <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>}
          <div className="ml-auto flex items-center gap-1">
            {right}
            <div className="relative">
              <button onClick={() => setMenu((v) => !v)} className="rounded-full ring-2 ring-transparent hover:ring-ink-700">
                {me ? <Avatar name={me.name} src={me.photoUrl} size={32} /> : <User size={20} />}
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl bg-ink-850 ring-1 ring-ink-700 shadow-xl animate-fadein">
                    <div className="border-b border-ink-800 px-3 py-2 text-xs text-slate-400">Signed in as<br /><span className="text-slate-200">{me?.name}</span></div>
                    <MenuItem icon={<User size={16} />} label="Profile" onClick={() => { setMenu(false); nav('/profile') }} />
                    <MenuItem icon={<Users size={16} />} label="Friends" onClick={() => { setMenu(false); nav('/friends') }} />
                    <MenuItem icon={<LogOut size={16} />} label="Sign out" onClick={() => signOut()} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {subBar && <div className="mx-auto max-w-3xl px-4">{subBar}</div>}
      </header>
      <main className={`mx-auto max-w-3xl px-4 py-5 ${bottomNav ? 'pb-24' : ''}`}>{children}</main>
      {bottomNav && <BottomNav />}
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-slate-200 hover:bg-ink-800">
      <span className="text-slate-400">{icon}</span>{label}
    </button>
  )
}
