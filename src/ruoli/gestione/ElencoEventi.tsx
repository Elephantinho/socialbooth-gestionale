import { Link, useSearchParams } from 'react-router-dom'
import { Archive, Plus } from 'lucide-react'
import { usePuo, type Permesso } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { inArchivio } from '@/modules/eventi/logic/archivio'
import type { EventoGestione } from '@/modules/eventi/types'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Filtro = { id: string; etichetta: string; passa: (e: EventoGestione) => boolean; permesso?: Permesso }

const tra = (...stati: string[]) => (e: EventoGestione) => stati.includes(e.stato)

const filtri: Filtro[] = [
  { id: 'tutti', etichetta: 'Tutti', passa: () => true },
  { id: 'assegnare', etichetta: 'Da assegnare', passa: tra('da_assegnare', 'bozza'), permesso: 'eventi.assegna' },
  { id: 'attesa', etichetta: 'In attesa', passa: tra('proposto'), permesso: 'eventi.assegna' },
  { id: 'confermati', etichetta: 'Confermati', passa: tra('confermato') },
  { id: 'corso', etichetta: 'In corso', passa: tra('in_corso') },
]

/** Eventi in programma e in corso. Quelli finiti o annullati stanno in Archivio. */
export function ElencoEventi() {
  const { data, isPending, error } = useEventiGestione()
  const puo = usePuo()
  const [parametri, setParametri] = useSearchParams()
  const visibili = filtri.filter((f) => !f.permesso || puo(f.permesso))
  const attivo = visibili.find((f) => f.id === parametri.get('filtro')) ?? visibili[0]
  const setFiltro = (id: string) => setParametri(id === 'tutti' ? {} : { filtro: id }, { replace: true })

  const inProgramma = (data ?? []).filter((e) => !inArchivio(e))
  const eventi = inProgramma.filter(attivo.passa)
  const archiviati = (data ?? []).length - inProgramma.length

  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra="Lavoro" titolo="Eventi" descrizione="In programma e in corso, dal più vicino."
        azioni={
          <>
            <Link to="/gestione/archivio" className="h-12 px-4 rounded-xl border border-bordo-forte bg-superficie font-bold text-sm flex items-center gap-2 hover:bg-sfondo">
              <Archive className="size-4" aria-hidden /> Archivio{archiviati ? ` · ${archiviati}` : ''}
            </Link>
            {puo('eventi.crea') && (
              <Link to="/gestione/eventi/nuovo"
                className="h-12 px-5 rounded-xl bg-accento text-white font-bold text-sm flex items-center gap-2 hover:bg-accento-scuro transition shadow-[0_6px_16px_-8px_rgba(14,107,98,0.7)]">
                <Plus className="size-[18px]" aria-hidden /> Nuovo evento
              </Link>
            )}
          </>
        } />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {visibili.map((f) => (
          <button key={f.id} role="tab" aria-selected={attivo.id === f.id} onClick={() => setFiltro(f.id)}
            className={cn(
              'h-10 px-4 rounded-full text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2',
              attivo.id === f.id ? 'bg-inchiostro text-white' : 'bg-superficie border border-bordo text-[#3F4047] hover:border-bordo-forte',
            )}>
            {f.etichetta}
            <span className={cn('text-xs', attivo.id === f.id ? 'text-accento-chiaro' : 'text-tenue')}>{inProgramma.filter(f.passa).length}</span>
          </button>
        ))}
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento qui"
            testo={puo('eventi.crea') ? "Crea un evento: se in zona c'è un solo operatore, gli verrà proposto in automatico." : 'Quando ci saranno eventi in programma li trovi qui.'} />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {eventi.map((e) => <RigaEvento key={e.id} e={e} assegna={puo('eventi.assegna')} />)}
        </div>
      )}
    </div>
  )
}
