import { Loader2, Inbox } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export function Caricamento({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center py-16 text-tenue', className)} role="status" aria-label="Caricamento">
      <Loader2 className="size-7 animate-spin" />
    </div>
  )
}

export function Vuoto({ titolo, testo, azione }: { titolo: string; testo?: string; azione?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
      <Inbox className="size-6 text-tenue mb-1" aria-hidden />
      <p className="font-semibold text-[16px]">{titolo}</p>
      {testo && <p className="text-sm text-tenue max-w-72">{testo}</p>}
      {azione && <div className="mt-3">{azione}</div>}
    </div>
  )
}

export function Errore({ errore }: { errore: unknown }) {
  const msg = errore instanceof Error ? errore.message : 'Qualcosa è andato storto'
  return (
    <div className="rounded-lg border-l-4 border-urgente bg-urgente-tenue text-urgente-testo px-4 py-3 text-sm font-medium" role="alert">
      {msg}
    </div>
  )
}
