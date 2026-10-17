import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Archive, Plus } from 'lucide-react'
import { useOperatori } from '@/modules/anagrafiche/api'
import { usePuo } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { BoxEvento } from '@/modules/eventi/components/BoxEvento'
import { passato } from '@/modules/eventi/logic/archivio'
import type { EventoGestione } from '@/modules/eventi/types'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

/** Eventi in programma, divisi per mese. I passati stanno nell'archivio (il cassetto in alto). */
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

      {!archivio && eventi.length > 0 && <Avanzamento eventi={eventi} />}
      {puo('eventi.assegna') && !archivio && <ZoneScoperte eventi={eventi} />}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento" testo={archivio ? 'Gli eventi conclusi compariranno qui.' : 'Crea un evento per vederlo qui.'} />
        </Card>
      ) : (
        perMese(eventi).map(([mese, lista]) => (
          <section key={mese} className="flex flex-col gap-2.5">
            <h2 className="text-sm font-semibold text-tenue capitalize">{mese}<span className="font-medium ml-2 text-tenue/70">{lista.length}</span></h2>
            <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
              {lista.map((e) => <BoxEvento key={e.id} e={e} />)}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function perMese(eventi: EventoGestione[]) {
  const gruppi = new Map<string, EventoGestione[]>()
  for (const e of eventi) {
    const mese = new Date(e.allestimento_il).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'Europe/Rome' })
    gruppi.set(mese, [...(gruppi.get(mese) ?? []), e])
  }
  return [...gruppi]
}

/** Quanti eventi in programma sono già coperti: la barra verde cresce man mano che si conferma. */
function Avanzamento({ eventi }: { eventi: EventoGestione[] }) {
  const coperti = eventi.filter((e) => e.stato === 'confermato' || e.stato === 'in_corso').length
  const attesa = eventi.filter((e) => e.stato === 'proposto').length
  const scoperti = eventi.length - coperti - attesa
  const tutti = coperti === eventi.length
  const pct = (n: number) => `${(n / eventi.length) * 100}%`
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold">
          {tutti ? 'Tutti gli eventi sono coperti' : <><span className="text-ok">{coperti} su {eventi.length}</span> eventi già coperti</>}
        </p>
        <p className="text-sm text-tenue flex gap-4">
          {attesa > 0 && <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-avviso-icona" />{attesa} in attesa</span>}
          {scoperti > 0 && <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-urgente" />{scoperti} da assegnare</span>}
        </p>
      </div>
      <div className="h-2 rounded-full bg-sfondo overflow-hidden flex" aria-hidden>
        <span className="bg-ok h-full" style={{ width: pct(coperti) }} />
        <span className="bg-avviso-icona h-full" style={{ width: pct(attesa) }} />
      </div>
    </Card>
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
