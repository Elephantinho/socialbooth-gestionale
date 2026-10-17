import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { REGIONI, type Enum } from '@/shared/types/database'

/** Scelta multipla delle regioni, a pillole. */
export function SceltaRegioni({ valore, onChange, etichetta = 'Regioni in cui lavori' }: {
  valore: Enum<'regione'>[]
  onChange: (r: Enum<'regione'>[]) => void
  etichetta?: string
}) {
  const cambia = (r: Enum<'regione'>) => onChange(valore.includes(r) ? valore.filter((x) => x !== r) : [...valore, r])
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[13px] font-semibold text-tenue mb-1.5">{etichetta}</legend>
      <div className="flex flex-wrap gap-1.5">
        {REGIONI.map((r) => {
          const scelta = valore.includes(r)
          return (
            <button key={r} type="button" aria-pressed={scelta} onClick={() => cambia(r)}
              className={cn(
                'h-9 px-3 rounded-full text-[13px] font-semibold border transition cursor-pointer inline-flex items-center gap-1',
                scelta ? 'bg-accento border-accento text-su-accento' : 'bg-superficie border-bordo-forte text-tenue hover:border-tenue',
              )}>
              {scelta && <Check className="size-3.5" aria-hidden />}{r}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
