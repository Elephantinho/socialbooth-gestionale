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
      <div className="size-14 rounded-full bg-accento-tenue text-accento flex items-center justify-center mb-2">
        <Inbox className="size-6" aria-hidden />
      </div>
      <p className="font-bold text-[16px]">{titolo}</p>
      {testo && <p className="text-sm text-tenue max-w-72">{testo}</p>}
      {azione && <div className="mt-3">{azione}</div>}
    </div>
  )
}

export function Errore({ errore }: { errore: unknown }) {
  const msg = errore instanceof Error ? errore.message : 'Qualcosa è andato storto'
  return (
    <div className="rounded-2xl bg-urgente-tenue text-urgente-testo p-4 text-sm font-semibold" role="alert">
      {msg}
    </div>
  )
}
