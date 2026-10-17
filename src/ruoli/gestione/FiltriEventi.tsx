import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, MapPin, X } from 'lucide-react'
import { filtra, giornoRoma, type Filtri } from '@/modules/eventi/logic/filtri'
import type { EventoGestione } from '@/modules/eventi/types'
import { cn } from '@/shared/lib/cn'

type Props = {
  eventi: EventoGestione[]
  filtri: Filtri
  archivio: boolean
  imposta: (modifiche: Partial<Record<keyof Filtri, string | undefined>>) => void
  azzera?: () => void
}

const maiuscola = (t: string) => t[0].toUpperCase() + t.slice(1)
const nomeMese = (m: string) => maiuscola(new Date(`${m}-15T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))
const nomeGiorno = (g: string) => maiuscola(new Date(`${g}T12:00:00Z`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', ''))
const conta = <T,>(lista: T[], chiave: (x: T) => string) => lista.reduce((m, x) => m.set(chiave(x), (m.get(chiave(x)) ?? 0) + 1), new Map<string, number>())

/** Barra dei filtri: stato a sinistra (con i numeri), quando e regione a destra. */
export function FiltriEventi({ eventi, filtri, archivio, imposta, azzera }: Props) {
  // I numeri di ogni scelta tengono conto degli altri filtri già attivi
  const perStato = filtra(eventi, { ...filtri, stato: undefined })
  const perQuando = filtra(eventi, { ...filtri, mese: undefined, giorno: undefined })
  const perRegione = filtra(eventi, { ...filtri, regione: undefined })

  const stati = [
    { id: undefined, testo: 'Tutti', n: perStato.length, punto: null },
    { id: 'da_assegnare' as const, testo: 'Da assegnare', n: filtra(perStato, { stato: 'da_assegnare' }).length, punto: 'bg-urgente' },
    { id: 'proposto' as const, testo: 'In attesa', n: filtra(perStato, { stato: 'proposto' }).length, punto: 'bg-avviso-icona' },
  ]
  const mesi = conta(perQuando, (e) => giornoRoma(e.allestimento_il).slice(0, 7))
  const regioni = conta(perRegione, (e) => e.regione)
  const oggi = giornoRoma(new Date().toISOString())
  const domani = giornoRoma(new Date(Date.now() + 86_400_000).toISOString())

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 -mt-2">
      {!archivio ? (
        <div className="inline-flex bg-superficie border border-bordo rounded-xl p-1 gap-0.5" role="group" aria-label="Stato">
          {stati.map((s) => {
            const attivo = filtri.stato === s.id
            return (
              <button key={s.testo} onClick={() => imposta({ stato: s.id })} aria-pressed={attivo}
                className={cn('h-9 px-3.5 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors',
                  attivo ? 'bg-inchiostro text-white' : 'text-tenue hover:text-inchiostro hover:bg-sfondo')}>
                {s.punto && <span className={cn('size-2 rounded-full', s.punto)} aria-hidden />}
                {s.testo}
                <span className={cn('text-xs tabular-nums', attivo ? 'text-white/70' : 'text-tenue/80')}>{s.n}</span>
              </button>
            )
          })}
        </div>
      ) : <span />}

      <div className="flex items-center gap-2 flex-wrap">
        <Menu icona={CalendarDays} attivo={!!(filtri.mese || filtri.giorno)}
          etichetta={filtri.giorno ? nomeGiorno(filtri.giorno) : filtri.mese ? nomeMese(filtri.mese) : 'Quando'}>
          {(chiudi) => (
            <>
              <Voce scelta={!filtri.mese && !filtri.giorno} onClick={() => { imposta({ mese: undefined, giorno: undefined }); chiudi() }}>Tutte le date</Voce>
              {!archivio && (
                <>
                  <Voce scelta={filtri.giorno === oggi} onClick={() => { imposta({ giorno: oggi }); chiudi() }}>Oggi</Voce>
                  <Voce scelta={filtri.giorno === domani} onClick={() => { imposta({ giorno: domani }); chiudi() }}>Domani</Voce>
                </>
              )}
              {mesi.size > 0 && <Titoletto>Mese</Titoletto>}
              {[...mesi].map(([m, n]) => (
                <Voce key={m} scelta={filtri.mese === m} n={n} onClick={() => { imposta({ mese: m }); chiudi() }}>{nomeMese(m)}</Voce>
              ))}
              <Titoletto>Un giorno preciso</Titoletto>
              <input type="date" value={filtri.giorno ?? ''} onChange={(e) => { imposta({ giorno: e.target.value || undefined }); if (e.target.value) chiudi() }}
                className="mx-1 mb-1 h-10 rounded-lg border border-bordo px-3 text-sm font-semibold w-[calc(100%-0.5rem)]" />
            </>
          )}
        </Menu>

        <Menu icona={MapPin} attivo={!!filtri.regione} etichetta={filtri.regione ?? 'Regione'}>
          {(chiudi) => (
            <>
              <Voce scelta={!filtri.regione} onClick={() => { imposta({ regione: undefined }); chiudi() }}>Tutte le regioni</Voce>
              {[...regioni].sort(([a], [b]) => a.localeCompare(b)).map(([r, n]) => (
                <Voce key={r} scelta={filtri.regione === r} n={n} onClick={() => { imposta({ regione: r }); chiudi() }}>{r}</Voce>
              ))}
            </>
          )}
        </Menu>

        {azzera && (
          <button onClick={azzera} aria-label="Togli i filtri" title="Togli i filtri"
            className="size-10 rounded-xl text-tenue hover:text-inchiostro hover:bg-superficie flex items-center justify-center cursor-pointer">
            <X className="size-[18px]" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

/** Pulsante con menu a tendina; si chiude cliccando fuori o con Esc. */
function Menu({ icona: Icona, etichetta, attivo, children }: {
  icona: typeof MapPin; etichetta: string; attivo: boolean; children: (chiudi: () => void) => React.ReactNode
}) {
  const [aperto, setAperto] = useState(false)
  const rif = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aperto) return
    const fuori = (e: MouseEvent) => { if (!rif.current?.contains(e.target as Node)) setAperto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAperto(false) }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [aperto])

  return (
    <div ref={rif} className="relative">
      <button onClick={() => setAperto((a) => !a)} aria-expanded={aperto}
        className={cn('h-10 pl-3 pr-2.5 rounded-xl border bg-superficie text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap',
          attivo ? 'border-inchiostro text-inchiostro' : 'border-bordo text-tenue hover:text-inchiostro hover:border-bordo-forte')}>
        <Icona className="size-4" aria-hidden />
        {etichetta}
        <ChevronDown className={cn('size-4 transition-transform', aperto && 'rotate-180')} aria-hidden />
      </button>
      {aperto && (
        <div className="absolute right-0 top-full mt-2 w-64 max-h-[70vh] overflow-y-auto bg-superficie border border-bordo rounded-xl shadow-lg p-1 z-30 flex flex-col">
          {children(() => setAperto(false))}
        </div>
      )}
    </div>
  )
}

function Voce({ scelta, n, onClick, children }: { scelta: boolean; n?: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn('h-9 px-3 rounded-lg text-sm text-left flex items-center gap-2 cursor-pointer hover:bg-sfondo', scelta && 'font-semibold')}>
      <span className="flex-1 truncate">{children}</span>
      {n != null && <span className="text-xs text-tenue tabular-nums">{n}</span>}
      <Check className={cn('size-4 text-ok', !scelta && 'invisible')} aria-hidden />
    </button>
  )
}

const Titoletto = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-tenue uppercase tracking-wide">{children}</p>
)
