import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Archive, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { useArchivio, useEventiInProgramma } from '@/modules/eventi/api'
import { BarraCoperti } from '@/modules/eventi/components/BarraCoperti'
import { COLONNE, RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { ZoneScoperte } from '@/modules/eventi/components/ZoneScoperte'
import { passato } from '@/modules/eventi/logic/archivio'
import { filtra, type Filtri } from '@/modules/eventi/logic/filtri'
import { perGiorno } from '@/modules/eventi/logic/giorni'
import { giornoRoma, intervalloGiorni, meseRoma, piuGiorni, titoloGiorno, ultimiMesi } from '@/shared/lib/date'
import { cn } from '@/shared/lib/cn'
import { useAdesso } from '@/shared/lib/tempo'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'
import { FiltriEventi } from './FiltriEventi'
import { SettimanaEventi } from './SettimanaEventi'

type Modifiche = Partial<Record<keyof Filtri, string | undefined>>

/**
 * Pagina Eventi.
 * - In programma, senza filtro di stato: la settimana a colonne, con le frecce.
 * - Con un filtro di stato (da assegnare, in attesa, in ritardo): l'elenco di tutti quelli che corrispondono.
 * - Archivio (il cassetto): gli eventi conclusi, a elenco, un mese per volta.
 * Filtri e settimana stanno nell'indirizzo della pagina, così un link riapre la stessa vista.
 */
export function ElencoEventi() {
  const puo = usePuo()
  const adesso = useAdesso()
  const oggi = giornoRoma(adesso)
  const [parametri, setParametri] = useSearchParams()
  const archivio = parametri.has('archivio')
  const filtri: Filtri = {
    mese: parametri.get('mese') ?? undefined,
    giorno: parametri.get('giorno') ?? undefined,
    regione: parametri.get('regione') ?? undefined,
    stato: (parametri.get('stato') as Filtri['stato']) ?? undefined,
  }

  const programma = useEventiInProgramma()
  const vecchi = useArchivio(archivio ? filtri.mese : undefined)
  const { data, isPending, error } = archivio ? vecchi : programma
  const base = (data ?? []).filter((e) => passato(e, adesso) === archivio)

  const settimana = !archivio && !filtri.stato
  const inizio = settimana ? filtri.giorno ?? parametri.get('da') ?? oggi : oggi
  const fine = piuGiorni(inizio, 6)
  const eventi = settimana
    ? filtra(base, { regione: filtri.regione }, adesso).filter((e) => { const g = giornoRoma(e.allestimento_il); return g >= inizio && g <= fine })
    : filtra(base, filtri, adesso)
  // Eventi di giorni già passati rimasti aperti (manca il check-out): fuori dalla settimana, vanno segnalati
  const rimastiAperti = settimana ? base.filter((e) => giornoRoma(e.allestimento_il) < oggi) : []
  const filtrato = Object.values(filtri).some(Boolean)

  /** Cambia i filtri tenendo gli altri (e l'archivio); mese e giorno si escludono */
  function imposta(modifiche: Modifiche) {
    const p = new URLSearchParams(parametri)
    for (const [k, v] of Object.entries(modifiche)) {
      if (v) p.set(k, v); else p.delete(k)
      if (v && k === 'giorno') p.delete('mese')
      if (v && k === 'mese') p.delete('giorno')
    }
    setParametri(p, { replace: true })
  }
  function vaiAllaSettimana(g: string) {
    const p = new URLSearchParams(parametri)
    p.delete('giorno'); p.delete('mese')
    if (g === oggi) p.delete('da'); else p.set('da', g)
    setParametri(p, { replace: true })
  }
  const azzera = () => setParametri(archivio ? { archivio: '' } : settimana && inizio !== oggi ? { da: inizio } : {}, { replace: true })
  const puoAssegnare = puo('eventi.assegna') && !archivio

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

      <FiltriEventi eventi={base} filtri={filtri} imposta={imposta} archivio={archivio} senzaQuando={settimana}
        mesi={archivio ? ultimiMesi(meseRoma(adesso), 24) : undefined}
        azzera={(settimana ? filtri.regione : filtrato) ? azzera : undefined} />

      {settimana && (
        <div className="flex flex-wrap items-center gap-3 -mt-1">
          <div className="flex items-center gap-1.5">
            <Freccia indietro disabled={inizio <= oggi} onClick={() => vaiAllaSettimana(piuGiorni(inizio, -7) < oggi ? oggi : piuGiorni(inizio, -7))} />
            <p className="font-semibold min-w-44 text-center">{intervalloGiorni(inizio, fine)}</p>
            <Freccia onClick={() => vaiAllaSettimana(piuGiorni(inizio, 7))} />
            {inizio !== oggi && (
              <button onClick={() => vaiAllaSettimana(oggi)} className="h-9 px-3 rounded-lg text-sm font-semibold text-tenue hover:text-inchiostro hover:bg-superficie cursor-pointer">Torna a oggi</button>
            )}
          </div>
          {eventi.length > 0 && <div className="flex-1 min-w-60"><BarraCoperti eventi={eventi} /></div>}
        </div>
      )}

      {rimastiAperti.length > 0 && (
        <button onClick={() => imposta({ stato: 'ritardo' })}
          className="text-left rounded-lg border-l-4 border-urgente bg-urgente-tenue px-4 py-3 text-sm cursor-pointer -mt-2">
          <span className="font-semibold text-urgente-testo">{rimastiAperti.length === 1 ? '1 evento dei giorni scorsi è ancora aperto' : `${rimastiAperti.length} eventi dei giorni scorsi sono ancora aperti`}</span>
          <span className="text-inchiostro">: manca il check-out. Vedili</span>
        </button>
      )}
      {puoAssegnare && <ZoneScoperte eventi={eventi} />}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento" testo={settimana ? 'Nessun evento in questa settimana.' : filtrato ? 'Nessun evento con questi filtri.' : archivio ? 'Gli eventi conclusi compariranno qui.' : 'Crea un evento per vederlo qui.'} />
        </Card>
      ) : settimana ? (
        <SettimanaEventi eventi={eventi} inizio={inizio} oggi={oggi} assegna={puoAssegnare} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className={cn('max-md:hidden px-4 pr-3 text-xs font-semibold text-tenue -mb-2', COLONNE)}>
            <span>Ora</span><span>Evento</span><span>Project</span><span>Operatore</span><span className="justify-self-end">Stato</span>
          </div>
          {perGiorno(eventi, archivio).map(([giorno, lista]) => (
            <Card key={giorno} className="overflow-visible">
              <h2 className="px-4 py-2.5 border-b border-bordo bg-sfondo/60 rounded-t-xl text-sm font-semibold flex items-baseline gap-2">
                <span className={cn(giorno !== oggi && 'text-tenue')}>{titoloGiorno(giorno, oggi)}</span>
                <span className="font-medium text-tenue/70">{lista.length === 1 ? '1 evento' : `${lista.length} eventi`}</span>
              </h2>
              <div className="divide-y divide-bordo">
                {lista.map((e) => <RigaEvento key={e.id} e={e} assegna={puoAssegnare} />)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Freccia({ indietro, disabled, onClick }: { indietro?: boolean; disabled?: boolean; onClick: () => void }) {
  const Icona = indietro ? ChevronLeft : ChevronRight
  return (
    <button onClick={onClick} disabled={disabled} aria-label={indietro ? 'Settimana prima' : 'Settimana dopo'}
      className="size-9 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo disabled:opacity-40 disabled:cursor-default">
      <Icona className="size-[18px]" aria-hidden />
    </button>
  )
}
