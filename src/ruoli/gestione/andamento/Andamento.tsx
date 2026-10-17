import { useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Futuro } from './Futuro'
import { Passato } from './Passato'

const viste = [
  { id: 'passato', etichetta: 'Consuntivo' },
  { id: 'futuro', etichetta: 'Previsione' },
] as const

/**
 * Tutti i numeri in un posto solo.
 * Consuntivo: eventi fatti (ricavi, costi, margini per mese, regione, operatore, cliente).
 * Previsione: dagli eventi già inseriti (compensi, carta, extra).
 * Il project vede solo i suoi eventi.
 */
export function Andamento() {
  const [parametri, setParametri] = useSearchParams()
  const vista = parametri.get('vista') === 'futuro' ? 'futuro' : 'passato'

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Andamento" />

      <div className="flex rounded-xl bg-superficie border border-bordo p-1.5 w-full sm:w-fit" role="tablist">
        {viste.map((v) => (
          <button key={v.id} role="tab" aria-selected={vista === v.id}
            onClick={() => setParametri(v.id === 'passato' ? {} : { vista: v.id }, { replace: true })}
            className={cn('flex-1 sm:flex-none h-11 px-5 rounded-lg text-[15px] font-semibold cursor-pointer inline-flex items-center justify-center gap-2 transition',
              vista === v.id ? 'bg-accento-tenue text-accento-scuro' : 'text-tenue hover:text-inchiostro')}>
            {v.etichetta}
          </button>
        ))}
      </div>

      {vista === 'passato' ? <Passato /> : <Futuro />}
    </div>
  )
}
