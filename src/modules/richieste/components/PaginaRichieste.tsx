import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useRichieste } from '../api'
import { ListaRichieste, perMe } from './ListaRichieste'
import { NuovaRichiesta } from './NuovaRichiesta'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/**
 * Richieste: cosa devo fare io (per me o per il mio ruolo) e cosa ho chiesto agli altri.
 * La usano sia l'ufficio sia l'app dell'operatore.
 */
export function PaginaRichieste({ compatta }: { compatta?: boolean }) {
  const io = useProfilo()
  const { data, isPending, error } = useRichieste()
  const [nuova, setNuova] = useState(false)
  const [parametri] = useSearchParams()
  const evidenzia = parametri.get('id')

  useEffect(() => {
    if (evidenzia && data) document.getElementById(`richiesta-${evidenzia}`)?.scrollIntoView({ block: 'center' })
  }, [evidenzia, data])

  const aperte = (r: { stato: string }) => r.stato === 'aperta' || r.stato === 'in_corso'
  const tutte = data ?? []
  const daFare = tutte.filter((r) => aperte(r) && perMe(r, io))
  const mie = tutte.filter((r) => aperte(r) && r.da_id === io.id)
  const chiuse = tutte.filter((r) => !aperte(r))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={compatta ? 'font-display text-[28px] font-semibold tracking-tight' : 'font-display text-[32px] font-semibold tracking-tight'}>Richieste</h1>
          <p className="text-tenue mt-1">
            {io.ruolo === 'operatore' ? 'Chiedi carta, attrezzatura o aiuto: arriva subito a chi se ne occupa.' : 'Cosa ti chiedono e cosa hai chiesto agli altri.'}
          </p>
        </div>
        <Pulsante variante={nuova ? 'secondario' : 'primario'} icona={nuova ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          onClick={() => setNuova((n) => !n)}>{nuova ? 'Chiudi' : 'Nuova richiesta'}</Pulsante>
      </div>

      {nuova && (
        <section className="rounded-xl border border-bordo bg-superficie p-4 md:p-5">
          <NuovaRichiesta onFatto={() => setNuova(false)} />
        </section>
      )}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <>
          {io.ruolo !== 'operatore' && (
            <section>
              <h2 className="font-semibold text-lg mb-1">Da fare per te <span className="text-tenue font-semibold">{daFare.length}</span></h2>
              <ListaRichieste richieste={daFare} vuoto="Niente da fare: quando qualcuno ti chiede qualcosa, compare qui." />
            </section>
          )}
          <section>
            <h2 className="font-semibold text-lg mb-1">{io.ruolo === 'operatore' ? 'Le tue richieste' : 'Hai chiesto'} <span className="text-tenue font-semibold">{mie.length}</span></h2>
            <ListaRichieste richieste={mie} vuoto="Nessuna richiesta aperta." />
          </section>
          {chiuse.length > 0 && (
            <details>
              <summary className="font-semibold cursor-pointer select-none">Chiuse <span className="text-tenue font-semibold">{chiuse.length}</span></summary>
              <div className="mt-2"><ListaRichieste richieste={chiuse} vuoto="" /></div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
