import { NavLink } from 'react-router-dom'
import { Plane, Globe2, Sparkles } from 'lucide-react'
import { classNames } from '../lib/util'

const TABS = [
  { to: '/', end: true, label: 'Trips', icon: Plane },
  { to: '/world', label: 'World', icon: Globe2 },
  { to: '/dreams', label: 'Dreams', icon: Sparkles },
]

// Bottom tab bar for the top-level sections (not shown inside a trip).
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-700 bg-ink-950/90 backdrop-blur-xl safe-bottom">
      <div className="mx-auto flex max-w-3xl">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => classNames(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition',
              isActive ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700')}>
            <t.icon size={20} />{t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
