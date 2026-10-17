import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Archive, Plus } from 'lucide-react'
import { useOperatori } from '@/modules/anagrafiche/api'
import { usePuo } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { BoxEvento } from '@/modules/eventi/components/BoxEvento'
import { passato } from '@/modules/eventi/logic/archivio'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

/** Eventi in programma, dal più vicino. I passati stanno nell'archivio (il cassetto in alto). */
export function ElencoEventi() {
  const { data, isPending, error } = useEventiGestione()
  const puo = usePuo()
  const [parametri, setParametri] = useSearchParams()
  const archivio = parametri.has('archivio')
  const tutti = data ?? []
  const eventi = archivio ? tutti.filter(passato).reverse() : tutti.filter((e) => !passato(e))

  return (
    <div className="flex flex-col gap-6">
      {archivio ? (
        <div>
          <button onClick={() => setParametri({}, { replace: true })}
            className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro cursor-pointer">
            <ArrowLeft className="size-4" aria-hidden /> In programma
          </button>
          <h1 className="font-display text-[26px] font-semibold leading-tight mt-1">Archivio</h1>
        </div>
      ) : (
        <Intestazione titolo="In programma"
          azioni={
            <div className="flex items-center gap-2">
              <button onClick={() => setParametri({ archivio: '' }, { replace: true })} title="Archivio" aria-label="Archivio"
                className="size-9 rounded-lg text-tenue/70 flex items-center justify-center hover:text-inchiostro hover:bg-superficie cursor-pointer">
                <Archive className="size-[18px]" aria-hidden />
              </button>
              {puo('eventi.crea') && (
                <Link to="/gestione/eventi/nuovo"
                  className="h-11 px-5 rounded-lg bg-accento text-su-accento font-semibold text-sm flex items-center gap-2 hover:bg-accento-hover">
                  <Plus className="size-[18px]" aria-hidden /> Nuovo evento
                </Link>
              )}
            </div>
          } />
      )}

      {puo('eventi.assegna') && !archivio && <ZoneScoperte eventi={eventi} />}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento" testo={archivio ? 'Gli eventi conclusi compariranno qui.' : 'Crea un evento per vederlo qui.'} />
        </Card>
      ) : (
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start">
          {eventi.map((e) => <BoxEvento key={e.id} e={e} assegna={puo('eventi.assegna') && !archivio} />)}
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
      Nessun operatore attivo in {scoperte.join(', ')}: per ora nessuno può prendere quegli eventi.
    </p>
  )
}
