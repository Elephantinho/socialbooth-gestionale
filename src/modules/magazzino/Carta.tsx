import { cn } from '@/shared/lib/cn'
import { cartaBassa, rotoli } from './magazzino'

const numero = (n: number) => n.toLocaleString('it-IT')

/**
 * Quanta carta resta: il numero di stampe e una barra che si riempie fino a tre volte la scorta minima.
 * Verde se basta, arancione se è sotto la scorta: si legge senza bisogno di scritte.
 */
export function IndicatoreCarta({ stampe, minima, grande }: { stampe: number; minima: number; grande?: boolean }) {
  const bassa = cartaBassa({ carta_stampe: stampe, carta_minima: minima })
  const pieno = Math.max(minima * 3, 1)
  const riempito = Math.min(100, Math.round((stampe / pieno) * 100))
  const soglia = Math.min(100, Math.round((minima / pieno) * 100))
  const r = rotoli(stampe)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={cn('font-display font-semibold tabular-nums', grande ? 'text-[32px] leading-none' : 'text-[22px] leading-none', bassa && 'text-avviso-testo')}>{numero(stampe)}</span>
        <span className="text-sm text-tenue">stampe{r > 0 ? `, ${r} ${r === 1 ? 'rotolo' : 'rotoli'}` : ''}</span>
      </div>
      <div className="relative h-2 rounded-full bg-sfondo overflow-hidden" role="img" aria-label={bassa ? 'Carta sotto la scorta minima' : 'Carta sufficiente'}>
        <div className={cn('h-full rounded-full', bassa ? 'bg-avviso-icona' : 'bg-ok')} style={{ width: `${riempito}%` }} />
        <div className="absolute inset-y-0 w-px bg-inchiostro/30" style={{ left: `${soglia}%` }} aria-hidden />
      </div>
    </div>
  )
}
