import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEventiPeriodo } from '@/modules/eventi/api'
import { nomeCompleto, ora, perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { REGIONI } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { Selezione } from '@/shared/ui/Campo'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { ritardo } from '@/modules/passaggi/ritardi'

const coloreStato: Record<string, string> = {
  bozza: 'bg-sfondo text-tenue border-bordo',
  da_assegnare: 'bg-urgente-tenue text-urgente-testo border-urgente/30',
  proposto: 'bg-avviso text-avviso-testo border-avviso-icona/40',
  confermato: 'bg-ok-tenue text-ok border-ok/30',
  in_corso: 'bg-ok text-white border-ok',
  completato: 'bg-superficie text-tenue border-bordo',
}

const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

/** Calendario mensile degli eventi, filtrabile per regione */
export function Calendario() {
  const [mese, setMese] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [regione, setRegione] = useState('')

  const giorni = useMemo(() => {
    const primo = new Date(mese)
    const inizio = new Date(primo)
    inizio.setDate(1 - ((primo.getDay() + 6) % 7)) // parte dal lunedì
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(inizio); d.setDate(inizio.getDate() + i); return d })
  }, [mese])

  // Solo le sei settimane mostrate
  const fine = useMemo(() => { const d = new Date(giorni[41]); d.setDate(d.getDate() + 1); return d }, [giorni])
  const { data, isPending, error } = useEventiPeriodo(giorni[0], fine)

  const perGiorno = useMemo(() => {
    const m = new Map<string, NonNullable<typeof data>>()
    for (const e of data ?? []) {
      if (e.stato === 'annullato' || (regione && e.regione !== regione)) continue
      const k = perCampoData(e.allestimento_il)
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return m
  }, [data, regione])

  const oggi = perCampoData(new Date().toISOString())
  const titolo = mese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const sposta = (n: number) => setMese((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Calendario" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => sposta(-1)} aria-label="Mese precedente" className="size-11 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <h2 className="font-display text-2xl font-semibold capitalize w-56 text-center">{titolo}</h2>
          <button onClick={() => sposta(1)} aria-label="Mese successivo" className="size-11 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          {/* Compare solo se ti sei spostato su un altro mese */}
          {(mese.getFullYear() !== new Date().getFullYear() || mese.getMonth() !== new Date().getMonth()) && (
            <button onClick={() => { const d = new Date(); setMese(new Date(d.getFullYear(), d.getMonth(), 1)) }}
              className="h-11 px-4 rounded-lg border border-bordo-forte bg-superficie text-sm font-semibold cursor-pointer hover:bg-sfondo">Torna a oggi</button>
          )}
        </div>
        <Selezione etichetta="" aria-label="Regione" value={regione} onChange={(e) => setRegione(e.target.value)} className="w-56">
          <option value="">Tutte le regioni</option>
          {REGIONI.map((r) => <option key={r}>{r}</option>)}
        </Selezione>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 border-b border-bordo bg-sfondo">
                {giorniSettimana.map((g) => <div key={g} className="px-3 py-2.5 text-xs font-semibold text-tenue ">{g}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {giorni.map((d) => {
                  const k = d.toLocaleDateString('sv-SE')
                  const eventi = perGiorno.get(k) ?? []
                  const fuori = d.getMonth() !== mese.getMonth()
                  return (
                    <div key={k} className={cn('min-h-28 border-r border-b border-bordo p-1.5 flex flex-col gap-1 [&:nth-child(7n)]:border-r-0', fuori && 'bg-sfondo/60')}>
                      <div className="flex items-center justify-between">
                        <Link to={`/gestione?giorno=${k}`} title="Tutti gli eventi del giorno"
                          className={cn('text-xs font-semibold w-7 h-7 rounded-full flex items-center justify-center hover:ring-2 hover:ring-bordo-forte',
                            k === oggi ? 'bg-accento text-su-accento' : fuori ? 'text-tenue/60' : 'text-inchiostro')}>{d.getDate()}</Link>
                        {eventi.length > 3 && <span className="text-[11px] font-semibold text-tenue pr-1">{eventi.length}</span>}
                      </div>
                      {eventi.slice(0, 3).map((e) => (
                        <Link key={e.id} to={`/gestione/eventi/${e.id}`}
                          className={cn('rounded-lg border px-1.5 py-1 text-[11px] leading-tight hover:brightness-95 transition', ritardo(e) ? 'bg-urgente text-white border-urgente' : coloreStato[e.stato])}>
                          <span className="font-semibold">{ora(e.allestimento_il)}</span> {nomeEvento(e)}
                          <span className="block truncate opacity-80">{e.citta}{e.operatore ? `, ${nomeCompleto(e.operatore).split(' ')[0]}` : ''}</span>
                        </Link>
                      ))}
                      {eventi.length > 3 && (
                        <Link to={`/gestione?giorno=${k}`} className="text-[11px] font-semibold text-inchiostro px-1.5 py-0.5 rounded hover:bg-sfondo">
                          Vedi tutti, altri {eventi.length - 3}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
