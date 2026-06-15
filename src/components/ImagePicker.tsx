import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Input, Button } from '../ui/primitives'

// Pick a cover photo: upload (downscaled to a data URL so it survives in local
// mode) or paste a URL. Stored as a string on the trip's coverImage.
async function fileToDataUrl(file: File, max = 1100): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function ImagePicker({ value, onChange }: {
  value?: string; onChange: (v: string | undefined) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try { onChange(await fileToDataUrl(file)) }
    catch { /* ignore */ }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative h-28 w-full overflow-hidden rounded-xl ring-1 ring-ink-700">
          <img src={value} alt="cover" className="h-full w-full object-cover" />
          <button onClick={() => onChange(undefined)} className="absolute right-2 top-2 rounded-lg bg-black/50 p-1 text-white hover:bg-black/70"><X size={15} /></button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-600 bg-ink-850 text-slate-500 hover:border-brand-500 hover:text-brand-600">
          <ImagePlus size={22} />
          <span className="text-sm">{busy ? 'Processing…' : 'Upload a cover photo'}</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="flex items-center gap-2">
        <Input value={value && !value.startsWith('data:') ? value : ''} onChange={(e) => onChange(e.target.value || undefined)} placeholder="…or paste an image URL" className="text-sm" />
        {!value && <Button variant="soft" size="sm" onClick={() => fileRef.current?.click()}>Upload</Button>}
      </div>
    </div>
  )
}
