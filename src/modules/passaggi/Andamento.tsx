import { Check } from 'lucide-react'
import { ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { PASSAGGI } from './passaggi'
import { usePassaggi } from './api'

/** I sei passaggi dell'evento: fatti in verde con l'ora, il prossimo evidenziato, gli altri in grigio. */
export function Andamento({ eventoId, compatto }: { eventoId: string; compatto?: boolean }) {
  const { data } = usePassaggi(eventoId)
  const fatti = new Map((data ?? []).map((p) => [p.passaggio, p.fatto_il]))
  const prossimo = PASSAGGI.find((p) => !fatti.has(p.id))?.id

  return (
    <ol>
      {PASSAGGI.map((p, i) => {
        const quando = fatti.get(p.id)
        const ultimo = i === PASSAGGI.length - 1
        return (
          <li key={p.id} className="flex gap-3">
            <span className="flex flex-col items-center" aria-hidden>
              <span className={cn('size-6 rounded-full flex items-center justify-center shrink-0',
                quando ? 'bg-ok text-white' : p.id === prossimo ? 'border-2 border-inchiostro bg-superficie' : 'border-2 border-bordo-forte bg-superficie')}>
                {quando && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              {!ultimo && <span className={cn('w-0.5 flex-1 min-h-3', quando && fatti.has(PASSAGGI[i + 1].id) ? 'bg-ok' : 'bg-bordo')} />}
            </span>
            <div className={cn('flex-1 flex items-baseline justify-between gap-3', !ultimo && (compatto ? 'pb-2.5' : 'pb-4'))}>
              <p className={cn('text-[15px] leading-6', quando ? 'font-semibold' : p.id === prossimo ? 'font-semibold' : 'text-tenue')}>
                {p.fatto}
              </p>
              {quando
                ? <span className="text-sm font-semibold text-ok tabular-nums">{ora(quando)}</span>
                : p.id === prossimo && <span className="text-xs font-semibold text-tenue">prossimo</span>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
