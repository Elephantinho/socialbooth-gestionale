import { useOperatori } from '@/modules/anagrafiche/api'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { usePuo, type Permesso } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { passato } from '@/modules/eventi/logic/archivio'
import type { EventoGestione } from '@/modules/eventi/types'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Filtro = { id: string; etichetta: string; passa: (e: EventoGestione) => boolean; permesso?: Permesso }

const tra = (...stati: string[]) => (e: EventoGestione) => stati.includes(e.stato)

const filtri: Filtro[] = [
  { id: 'tutti', etichetta: 'In programma', passa: (e) => !passato(e) },
  { id: 'assegnare', etichetta: 'Da assegnare', passa: (e) => !passato(e) && tra('da_assegnare', 'bozza')(e), permesso: 'eventi.assegna' },
  { id: 'attesa', etichetta: 'In attesa', passa: (e) => !passato(e) && tra('proposto')(e), permesso: 'eventi.assegna' },
  { id: 'confermati', etichetta: 'Confermati', passa: (e) => !passato(e) && tra('confermato', 'in_corso')(e) },
  { id: 'passati', etichetta: 'Passati', passa: (e) => passato(e) },
]

/** Elenco eventi: quelli in programma divisi per stato, e i passati. */
export function ElencoEventi() {
  const { data, isPending, error } = useEventiGestione()
  const puo = usePuo()
  const [parametri, setParametri] = useSearchParams()
  const visibili = filtri.filter((f) => !f.permesso || puo(f.permesso))
  const attivo = visibili.find((f) => f.id === parametri.get('filtro')) ?? visibili[0]
  const setFiltro = (id: string) => setParametri(id === 'tutti' ? {} : { filtro: id }, { replace: true })
  const tutti = data ?? []
  // I passati dal più recente, quelli in programma dal più vicino
  const eventi = tutti.filter(attivo.passa)
  if (attivo.id === 'passati') eventi.reverse()

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Eventi"
        azioni={puo('eventi.crea') && (
          <Link to="/gestione/eventi/nuovo"
            className="h-11 px-5 rounded-lg bg-accento text-su-accento font-semibold text-sm flex items-center gap-2 hover:bg-accento-hover">
            <Plus className="size-[18px]" aria-hidden /> Nuovo evento
          </Link>
        )} />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {visibili.map((f) => (
          <button key={f.id} role="tab" aria-selected={attivo.id === f.id} onClick={() => setFiltro(f.id)}
            className={cn(
              'h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer flex items-center gap-2',
              attivo.id === f.id ? 'bg-inchiostro text-white' : 'bg-superficie border border-bordo text-tenue hover:border-bordo-forte',
            )}>
            {f.etichetta}
            {f.id !== 'passati' && <span className={cn('text-xs', attivo.id === f.id ? 'text-white/70' : 'text-tenue')}>{tutti.filter(f.passa).length}</span>}
          </button>
        ))}
      </div>

      {puo('eventi.assegna') && attivo.id !== 'passati' && <ZoneScoperte eventi={tutti.filter((e) => !passato(e))} />}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento" testo={attivo.id === 'passati' ? 'Gli eventi conclusi compariranno qui.' : 'Nessun evento in questo elenco.'} />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {eventi.map((e) => <RigaEvento key={e.id} e={e} assegna={puo('eventi.assegna')} />)}
        </div>
      )}
    </div>
  )
}

/** Regioni con eventi in programma ma nessun operatore attivo che ci lavori */
function ZoneScoperte({ eventi }: { eventi: { regione: string }[] }) {
  const operatori = useOperatori()
  if (!operatori.data) return null
  const coperte = new Set(operatori.data.filter((o) => o.attivo).flatMap((o) => o.zone.map((z) => z.regione as string)))
  const scoperte = [...new Set(eventi.map((e) => e.regione))].filter((r) => !coperte.has(r))
  if (!scoperte.length) return null
  return (
    <p className="rounded-lg border border-avviso-icona/40 bg-avviso text-avviso-testo px-4 py-3 text-sm">
      Nessun operatore attivo in {scoperte.join(', ')}: gli eventi lì vanno assegnati a mano.
    </p>
  )
}
