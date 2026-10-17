import { cn } from '@/shared/lib/cn'
import type { Enum } from '@/shared/types/database'

const stati: Record<Enum<'stato_evento'>, { etichetta: string; stile: string; punto: string }> = {
  bozza:        { etichetta: 'Bozza',        stile: 'bg-sfondo text-tenue',               punto: 'bg-tenue' },
  da_assegnare: { etichetta: 'Da assegnare', stile: 'bg-urgente-tenue text-urgente-testo', punto: 'bg-urgente' },
  proposto:     { etichetta: 'In attesa',    stile: 'bg-avviso text-avviso-testo',         punto: 'bg-avviso-icona' },
  confermato:   { etichetta: 'Confermato',   stile: 'bg-ok-tenue text-ok',                 punto: 'bg-ok' },
  in_corso:     { etichetta: 'In corso',     stile: 'bg-ok text-white',                    punto: 'bg-white' },
  completato:   { etichetta: 'Completato',   stile: 'bg-ok-tenue text-ok',                 punto: 'bg-ok' },
  annullato:    { etichetta: 'Annullato',    stile: 'bg-sfondo text-tenue line-through',   punto: 'bg-tenue' },
}

export function StatoEvento({ stato, className }: { stato: Enum<'stato_evento'>; className?: string }) {
  const s = stati[stato]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap', s.stile, className)}>
      <span className={cn('size-2 rounded-full', s.punto)} aria-hidden />
      {s.etichetta}
    </span>
  )
}
