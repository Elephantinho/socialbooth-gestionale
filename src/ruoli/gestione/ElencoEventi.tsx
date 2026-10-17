import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Archive, Plus, X } from 'lucide-react'
import { useOperatori } from '@/modules/anagrafiche/api'
import { usePuo } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { BoxEvento } from '@/modules/eventi/components/BoxEvento'
import { passato } from '@/modules/eventi/logic/archivio'
import { filtra, giornoRoma, type Filtri } from '@/modules/eventi/logic/filtri'
import { cn } from '@/shared/lib/cn'
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
  const base = archivio ? tutti.filter(passato).reverse() : tutti.filter((e) => !passato(e))
  const filtri: Filtri = {
    mese: parametri.get('mese') ?? undefined,
    giorno: parametri.get('giorno') ?? undefined,
    regione: parametri.get('regione') ?? undefined,
    stato: (parametri.get('stato') as Filtri['stato']) ?? undefined,
  }
  const eventi = filtra(base, filtri)
  const filtrato = Object.values(filtri).some(Boolean)
  /** Cambia un filtro tenendo gli altri (e l'archivio) */
  const imposta = (k: keyof Filtri, v: string | undefined) => {
    const p = new URLSearchParams(parametri)
    if (v) p.set(k, v); else p.delete(k)
    if (k === 'giorno' && v) p.delete('mese')
    if (k === 'mese' && v) p.delete('giorno')
    setParametri(p, { replace: true })
  }
  const azzera = () => setParametri(archivio ? { archivio: '' } : {}, { replace: true })

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

      <BarraFiltri eventi={base} filtri={filtri} imposta={imposta} azzera={filtrato ? azzera : undefined} archivio={archivio} />
      {!archivio && !filtri.stato && eventi.length > 0 && <Avanzamento eventi={eventi} />}
      {puo('eventi.assegna') && !archivio && <ZoneScoperte eventi={eventi} />}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento" testo={filtrato ? 'Nessun evento con questi filtri.' : archivio ? 'Gli eventi conclusi compariranno qui.' : 'Crea un evento per vederlo qui.'} />
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

const selezione = 'h-10 rounded-lg border bg-superficie px-3 text-sm font-semibold cursor-pointer'

function BarraFiltri({ eventi, filtri, imposta, azzera, archivio }: {
  eventi: EventoGestione[]; filtri: Filtri; archivio: boolean
  imposta: (k: keyof Filtri, v: string | undefined) => void; azzera?: () => void
}) {
  const mesi = [...new Set(eventi.map((e) => giornoRoma(e.allestimento_il).slice(0, 7)))]
  const regioni = [...new Set(eventi.map((e) => e.regione))].sort()
  const nomeMese = (m: string) => { const t = new Date(`${m}-15T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1) }
  const attivo = (v?: string) => (v ? 'border-inchiostro text-inchiostro' : 'border-bordo text-tenue')
  const stati = [['da_assegnare', 'Da assegnare', 'bg-urgente'], ['proposto', 'In attesa', 'bg-avviso-icona']] as const

  return (
    <div className="flex flex-wrap items-center gap-2 -mt-2">
      <select aria-label="Mese" value={filtri.mese ?? ''} onChange={(e) => imposta('mese', e.target.value || undefined)} className={cn(selezione, attivo(filtri.mese))}>
        <option value="">Tutti i mesi</option>
        {mesi.map((m) => <option key={m} value={m}>{nomeMese(m)}</option>)}
      </select>
      <input type="date" aria-label="Giorno" value={filtri.giorno ?? ''} onChange={(e) => imposta('giorno', e.target.value || undefined)} className={cn(selezione, attivo(filtri.giorno))} />
      <select aria-label="Regione" value={filtri.regione ?? ''} onChange={(e) => imposta('regione', e.target.value || undefined)} className={cn(selezione, attivo(filtri.regione))}>
        <option value="">Tutte le regioni</option>
        {regioni.map((r) => <option key={r}>{r}</option>)}
      </select>
      {!archivio && stati.map(([id, testo, punto]) => (
        <button key={id} onClick={() => imposta('stato', filtri.stato === id ? undefined : id)} aria-pressed={filtri.stato === id}
          className={cn('h-10 px-3.5 rounded-full border text-sm font-semibold flex items-center gap-2 cursor-pointer',
            filtri.stato === id ? 'bg-inchiostro border-inchiostro text-white' : 'bg-superficie border-bordo text-tenue hover:border-bordo-forte')}>
          <span className={cn('size-2 rounded-full', punto)} aria-hidden />{testo}
        </button>
      ))}
      {azzera && (
        <button onClick={azzera} className="h-10 px-3 text-sm font-semibold text-tenue hover:text-inchiostro flex items-center gap-1 cursor-pointer">
          <X className="size-4" aria-hidden /> Azzera
        </button>
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
