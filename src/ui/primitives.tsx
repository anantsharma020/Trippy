import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { classNames, initials, colorFromString } from '../lib/util'

export function Button({
  variant = 'primary', size = 'md', className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger' | 'outline'; size?: 'sm' | 'md'
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
  const sizes = { sm: 'px-2.5 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm' }
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/30',
    soft: 'bg-ink-800 hover:bg-ink-700 text-slate-100',
    ghost: 'hover:bg-ink-800 text-slate-300',
    outline: 'border border-ink-700 hover:bg-ink-800 text-slate-200',
    danger: 'bg-rose-600/90 hover:bg-rose-500 text-white',
  }
  return <button className={classNames(base, sizes[size], variants[variant], className)} {...props} />
}

export function Chip({
  active, color, className, children, ...props
}: React.HTMLAttributes<HTMLSpanElement> & { active?: boolean; color?: string }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-default select-none transition',
        active ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40' : 'bg-ink-800 text-slate-300',
        className)}
      style={color ? { background: `${color}22`, color } : undefined}
      {...props}
    >{children}</span>
  )
}

export function Avatar({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
  if (src) return <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover ring-2 ring-ink-900" style={{ width: size, height: size }} />
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-ink-900"
      style={{ width: size, height: size, fontSize: size * 0.38, background: colorFromString(name) }}
    >{initials(name)}</span>
  )
}

export function AvatarStack({ names, max = 4, size = 26 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((n, i) => <div key={i} style={{ zIndex: max - i }}><Avatar name={n} size={size} /></div>)}
      {extra > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-ink-700 text-slate-200 ring-2 ring-ink-900 font-medium"
          style={{ width: size, height: size, fontSize: size * 0.36 }}>+{extra}</span>
      )}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide, align = 'top' }: {
  open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean
  align?: 'bottom' | 'top'
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className={classNames(
      'fixed inset-0 z-[1000] flex justify-center p-0 sm:p-4',
      align === 'top' ? 'items-start sm:items-center' : 'items-end sm:items-center')} role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={classNames(
        'relative w-full bg-ink-900 ring-1 ring-ink-700 shadow-2xl animate-fadein overflow-y-auto',
        align === 'top' ? 'rounded-b-3xl sm:rounded-3xl max-h-[88vh]' : 'rounded-t-3xl sm:rounded-3xl max-h-[92vh] safe-bottom',
        wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-ink-900/95 backdrop-blur px-5 py-4 border-b border-ink-800">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-ink-800 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

const inputBase = 'w-full min-w-0 box-border rounded-xl bg-ink-850 border border-ink-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 transition'

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) =>
  <input {...p} className={classNames(inputBase, p.className)} />
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
  <textarea {...p} className={classNames(inputBase, 'resize-y min-h-[80px]', p.className)} />
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...p} className={classNames(inputBase, 'appearance-none', p.className)} />

export function SegTabs<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]
}) {
  return (
    <div className="inline-flex rounded-xl bg-ink-850 p-1 ring-1 ring-ink-700 overflow-x-auto max-w-full">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={classNames('rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
            value === o.value ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-slate-900')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: {
  icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-500">{icon}</div>}
      <p className="font-medium text-slate-200">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames('rounded-2xl bg-ink-900 ring-1 ring-ink-700 shadow-sm shadow-ink-600/20 p-4', className)} {...props}>{children}</div>
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-700 border-t-brand-400" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
