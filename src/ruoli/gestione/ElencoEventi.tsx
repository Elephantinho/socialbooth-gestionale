import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Archive, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useOperatori } from '@/modules/anagrafiche/api'
import { usePuo } from '@/modules/auth/permessi'
import { useArchivio, useEventiInProgramma } from '@/modules/eventi/api'
import { COLONNE, RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { passato } from '@/modules/eventi/logic/archivio'
import { filtra, giornoRoma, type Filtri } from '@/modules/eventi/logic/filtri'
import { FiltriEventi } from './FiltriEventi'
import { SettimanaEventi, piuGiorni } from './SettimanaEventi'
import type { EventoGestione } from '@/modules/eventi/types'
import { Card } from '@/shared/ui/Card'
import { cn } from '@/shared/lib/cn'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

/** Eventi in programma, divisi per giorno. I passati stanno nell'archivio (il cassetto in alto). */
export function ElencoEventi() {
  const puo = usePuo()
  const [parametri, setParametri] = useSearchParams()
  const archivio = parametri.has('archivio')
  const programma = useEventiInProgramma()
  // L'archivio si legge a parte, un mese per volta (o gli ultimi 500)
  const vecchi = useArchivio(archivio ? parametri.get('mese') ?? undefined : undefined)
  const { data, isPending, error } = archivio ? vecchi : programma
  const tutti = data ?? []
  const base = archivio ? tutti.filter((e) => passato(e)) : tutti.filter((e) => !passato(e))
  const filtri: Filtri = {
    mese: parametri.get('mese') ?? undefined,
    giorno: parametri.get('giorno') ?? undefined,
    regione: parametri.get('regione') ?? undefined,
    stato: (parametri.get('stato') as Filtri['stato']) ?? undefined,
  }
  const oggi = giornoRoma(new Date().toISOString())
  // Vista a settimana (7 colonne) per "In programma"; con un filtro di stato si passa all'elenco di tutti quelli che corrispondono
  const settimana = !archivio && !filtri.stato
  const inizio = settimana ? parametri.get('giorno') ?? parametri.get('da') ?? oggi : oggi
  const fine = piuGiorni(inizio, 6)
  const eventi = settimana
    ? filtra(base, { regione: filtri.regione }).filter((e) => { const g = giornoRoma(e.allestimento_il); return g >= inizio && g <= fine })
    : filtra(base, filtri)
  // Eventi di giorni già passati rimasti aperti (manca il check-out): non stanno nella settimana, vanno segnalati
  const rimastiAperti = settimana ? base.filter((e) => giornoRoma(e.allestimento_il) < oggi) : []
  const filtrato = Object.values(filtri).some(Boolean)
  const giorni = perGiorno(eventi, archivio)
  const vaiA = (g: string) => {
    const p = new URLSearchParams(parametri)
    p.delete('giorno'); p.delete('mese')
    if (g === oggi) p.delete('da'); else p.set('da', g)
    setParametri(p, { replace: true })
  }
  /** Cambia un filtro tenendo gli altri (e l'archivio) */
  const imposta = (modifiche: Partial<Record<keyof Filtri, string | undefined>>) => {
    const p = new URLSearchParams(parametri)
    for (const [k, v] of Object.entries(modifiche)) {
      if (v) p.set(k, v); else p.delete(k)
      // mese e giorno si escludono
      if (v && k === 'giorno') p.delete('mese')
      if (v && k === 'mese') p.delete('giorno')
    }
    setParametri(p, { replace: true })
  }
  const azzera = () => setParametri(archivio ? { archivio: '' } : settimana && inizio !== oggi ? { da: inizio } : {}, { replace: true })

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

      <FiltriEventi eventi={base} filtri={filtri} mesi={archivio ? ultimiMesi(24) : undefined} imposta={imposta}
        azzera={(settimana ? filtri.regione : filtrato) ? azzera : undefined} archivio={archivio} senzaQuando={settimana} />
      {settimana && (
        <div className="flex flex-wrap items-center gap-3 -mt-1">
          <div className="flex items-center gap-1.5">
            <button onClick={() => vaiA(piuGiorni(inizio, -7) < oggi ? oggi : piuGiorni(inizio, -7))} disabled={inizio <= oggi} aria-label="Settimana prima"
              className="size-9 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo disabled:opacity-40 disabled:cursor-default">
              <ChevronLeft className="size-[18px]" aria-hidden />
            </button>
            <p className="font-semibold min-w-44 text-center">{intervallo(inizio, fine)}</p>
            <button onClick={() => vaiA(piuGiorni(inizio, 7))} aria-label="Settimana dopo"
              className="size-9 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
              <ChevronRight className="size-[18px]" aria-hidden />
            </button>
            {inizio !== oggi && (
              <button onClick={() => vaiA(oggi)} className="h-9 px-3 rounded-lg text-sm font-semibold text-tenue hover:text-inchiostro hover:bg-superficie cursor-pointer">Torna a oggi</button>
            )}
          </div>
          {eventi.length > 0 && <div className="flex-1 min-w-60"><Avanzamento eventi={eventi} /></div>}
        </div>
      )}
      {rimastiAperti.length > 0 && (
        <button onClick={() => imposta({ stato: 'ritardo' })}
          className="text-left rounded-lg border-l-4 border-urgente bg-urgente-tenue px-4 py-3 text-sm cursor-pointer -mt-2">
          <span className="font-semibold text-urgente-testo">{rimastiAperti.length === 1 ? '1 evento dei giorni scorsi è ancora aperto' : `${rimastiAperti.length} eventi dei giorni scorsi sono ancora aperti`}</span>
          <span className="text-inchiostro">: manca il check-out. Vedili</span>
        </button>
      )}
      {puo('eventi.assegna') && !archivio && <ZoneScoperte eventi={eventi} />}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento" testo={settimana ? 'Nessun evento in questa settimana.' : filtrato ? 'Nessun evento con questi filtri.' : archivio ? 'Gli eventi conclusi compariranno qui.' : 'Crea un evento per vederlo qui.'} />
        </Card>
      ) : settimana ? (
        <SettimanaEventi eventi={eventi} inizio={inizio} assegna={puo('eventi.assegna')} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className={cn('max-md:hidden px-4 pr-3 text-xs font-semibold text-tenue -mb-2', COLONNE)}>
            <span>Ora</span><span>Evento</span><span>Project</span><span>Operatore</span><span className="justify-self-end">Stato</span>
          </div>
          {giorni.map(([giorno, lista]) => (
            <Card key={giorno} className="overflow-visible">
              <h2 className="px-4 py-2.5 border-b border-bordo bg-sfondo/60 rounded-t-xl text-sm font-semibold flex items-baseline gap-2">
                <span className={cn(giorno !== oggi && 'text-tenue')}>{titoloGiorno(giorno)}</span>
                <span className="font-medium text-tenue/70">{lista.length === 1 ? '1 evento' : `${lista.length} eventi`}</span>
              </h2>
              <div className="divide-y divide-bordo">
                {lista.map((e) => <RigaEvento key={e.id} e={e} assegna={puo('eventi.assegna') && !archivio} />)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function perGiorno(eventi: EventoGestione[], recenti = false) {
  const gruppi = new Map<string, EventoGestione[]>()
  for (const e of eventi) {
    const g = giornoRoma(e.allestimento_il)
    const lista = gruppi.get(g)
    if (lista) lista.push(e); else gruppi.set(g, [e])
  }
  for (const lista of gruppi.values()) lista.sort((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))
  // In ordine di data; nell'archivio dal più recente
  return [...gruppi].sort(([a], [b]) => (recenti ? b.localeCompare(a) : a.localeCompare(b)))
}

/** "Oggi, sabato 17 ottobre", "Domani, …", "Lunedì 19 ottobre" (anno solo se diverso) */
function titoloGiorno(g: string) {
  const d = new Date(`${g}T12:00:00Z`)
  const testo = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getUTCFullYear() !== new Date().getFullYear() && { year: 'numeric' }) })
  const oggi = giornoRoma(new Date().toISOString())
  const domani = giornoRoma(new Date(Date.now() + 86_400_000).toISOString())
  const ieri = giornoRoma(new Date(Date.now() - 86_400_000).toISOString())
  if (g === oggi) return `Oggi, ${testo}`
  if (g === domani) return `Domani, ${testo}`
  if (g === ieri) return `Ieri, ${testo}`
  return testo[0].toUpperCase() + testo.slice(1)
}

/** "2026-10", "2026-09", … gli ultimi n mesi, per scegliere nell'archivio */
function ultimiMesi(n: number) {
  const d = new Date()
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
  })
}

/** Quanti eventi in programma sono già coperti: la barra verde cresce man mano che si conferma. */
function Avanzamento({ eventi }: { eventi: EventoGestione[] }) {
  const coperti = eventi.filter((e) => e.stato === 'confermato' || e.stato === 'in_corso').length
  const attesa = eventi.filter((e) => e.stato === 'proposto').length
  const pct = (n: number) => `${(n / eventi.length) * 100}%`
  return (
    <div className="flex items-center gap-4 -mt-1">
      <p className="text-sm font-semibold whitespace-nowrap">
        {coperti === eventi.length ? <span className="text-ok">Tutti coperti</span> : <><span className="text-ok">{coperti} su {eventi.length}</span> coperti</>}
      </p>
      <div className="h-2 flex-1 rounded-full bg-bordo/70 overflow-hidden flex" aria-hidden>
        <span className="bg-ok h-full" style={{ width: pct(coperti) }} />
        <span className="bg-avviso-icona h-full" style={{ width: pct(attesa) }} />
      </div>
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

/** "17 – 23 ottobre", oppure "28 ottobre – 3 novembre" */
function intervallo(a: string, b: string) {
  const f = (g: string, o: Intl.DateTimeFormatOptions) => new Date(`${g}T12:00:00Z`).toLocaleDateString('it-IT', { timeZone: 'UTC', ...o })
  return a.slice(5, 7) === b.slice(5, 7) ? `${f(a, { day: 'numeric' })} – ${f(b, { day: 'numeric', month: 'long' })}` : `${f(a, { day: 'numeric', month: 'long' })} – ${f(b, { day: 'numeric', month: 'long' })}`
}
