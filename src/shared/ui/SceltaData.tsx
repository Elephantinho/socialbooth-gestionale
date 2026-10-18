import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useClicFuori } from '@/shared/lib/clicFuori'
import { useAdesso } from '@/shared/lib/tempo'
import { aiutaData, aiutaOra, caselleDelMese, dataCompleta, giornoRoma, giornoSettimana, leggiData, leggiOra, nomeMese, piuMesi, scriviData } from '@/shared/lib/date'

// Date e orari: si scrivono a mano all'italiana (19/10/2026, 18:30) oppure si scelgono dal calendario
// o dall'elenco. Caselle di testo normali: niente pezzi che si colorano, niente mm/gg o AM/PM.

const INIZIALI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

/** Il calendario di un mese, da lunedì. Si sfoglia con le frecce; i giorni prima di "min" non si scelgono. */
export function Mesetto({ valore, onScegli, min }: { valore?: string; onScegli: (giorno: string) => void; min?: string }) {
  const oggi = giornoRoma(useAdesso())
  const [mese, setMese] = useState(() => (valore ?? min ?? oggi).slice(0, 7))
  const tasto = 'size-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-sfondo disabled:opacity-30 disabled:cursor-default'

  return (
    <div className="w-[17.5rem] select-none">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setMese(piuMesi(mese, -1))} disabled={!!min && piuMesi(mese, -1) < min.slice(0, 7)} aria-label="Mese prima" className={tasto}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="font-semibold text-[15px]">{nomeMese(mese)}</p>
        <button type="button" onClick={() => setMese(piuMesi(mese, 1))} aria-label="Mese dopo" className={tasto}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-tenue mb-1" aria-hidden>
        {INIZIALI.map((g, i) => <span key={i} className="h-6 leading-6">{g}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label={nomeMese(mese)}>
        {caselleDelMese(mese).map((g) => {
          const fuori = g.slice(0, 7) !== mese
          const vietato = !!min && g < min
          const scelto = g === valore
          return (
            <button key={g} type="button" disabled={vietato} onClick={() => onScegli(g)} aria-label={dataCompleta(g)} aria-pressed={scelto}
              className={cn('h-9 rounded-lg text-sm tabular-nums cursor-pointer disabled:cursor-default disabled:text-tenue/35',
                scelto ? 'bg-inchiostro text-white font-semibold'
                  : g === oggi ? 'ring-1 ring-inset ring-inchiostro/40 font-semibold hover:bg-sfondo'
                  : fuori ? 'text-tenue/50 hover:bg-sfondo' : 'hover:bg-sfondo')}>
              {Number(g.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const stileCasella = (errore: boolean, aperto: boolean) => cn(
  'w-full h-11 rounded-lg border bg-superficie pl-10 pr-3 text-[15px] font-medium text-inchiostro tabular-nums placeholder:text-tenue/60 placeholder:font-normal focus:outline-none',
  errore ? 'border-urgente' : aperto ? 'border-accento shadow-[inset_0_0_0_1px_var(--color-accento)]' : 'border-bordo-forte focus:border-accento focus:shadow-[inset_0_0_0_1px_var(--color-accento)]')

type PropsData = {
  etichetta: string
  valore: string            // "AAAA-MM-GG" o '' se non c'è
  onChange: (giorno: string) => void
  min?: string
  vuotabile?: boolean       // si può togliere la data (es. data fattura)
  errore?: string
  className?: string
}

/** Campo data: si scrive "19/10/2026" (le barre si mettono da sole) o si sceglie dal calendario con l'icona */
export function SceltaData({ etichetta, valore, onChange, min, vuotabile, errore, className }: PropsData) {
  const [aperto, setAperto] = useState(false)
  // Quello che si sta scrivendo; null = si mostra la data salvata
  const [bozza, setBozza] = useState<string | null>(null)
  const rif = useRef<HTMLDivElement>(null)
  const id = useId()
  useClicFuori(rif, aperto, () => setAperto(false))

  const testo = bozza ?? scriviData(valore)
  // Il giorno della settimana a destra, se c'è spazio (non accanto al pulsante per togliere la data)
  const conGiorno = !(vuotabile && valore)
  const letta = bozza == null ? valore || null : leggiData(bozza)
  const problema = bozza != null && bozza.trim() !== ''
    ? !letta ? 'Scrivi la data come 19/10/2026' : min && letta < min ? 'Questo giorno è già passato' : undefined
    : undefined

  function scrivi(nuovo: string) {
    const t = aiutaData(testo, nuovo.replace(/[^\d/.\-\s]/g, '').slice(0, 10))
    setBozza(t)
    const d = leggiData(t)
    if (d && (!min || d >= min) && t.replace(/\D/g, '').length >= 6) onChange(d)
    if (t.trim() === '' && vuotabile) onChange('')
  }

  return (
    <div ref={rif} className={cn('relative flex flex-col gap-1.5 text-[13px] font-medium text-tenue', className)}>
      <label htmlFor={id}>{etichetta}</label>
      <div className="relative flex gap-1.5">
        <button type="button" onClick={() => setAperto((a) => !a)} aria-label="Apri il calendario" aria-expanded={aperto}
          className="absolute left-1 top-1 size-9 rounded-md flex items-center justify-center text-tenue hover:text-inchiostro hover:bg-sfondo cursor-pointer z-10">
          <CalendarDays className="size-[18px]" aria-hidden />
        </button>
        <input id={id} value={testo} onChange={(e) => scrivi(e.target.value)} onBlur={() => { if (!problema) setBozza(null) }}
          onFocus={(e) => e.target.select()}
          inputMode="numeric" autoComplete="off" placeholder="gg/mm/aaaa" aria-invalid={!!(errore || problema)}
          className={cn(stileCasella(!!(errore || problema), aperto), conGiorno && 'pr-12')} />
        {letta && !problema && conGiorno && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-tenue pointer-events-none" aria-hidden>{giornoSettimana(letta)}</span>
        )}
        {vuotabile && valore && (
          <button type="button" onClick={() => { setBozza(null); onChange('') }} aria-label="Togli la data"
            className="size-11 shrink-0 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center text-tenue hover:text-inchiostro cursor-pointer">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {(problema ?? errore) && <span className="text-xs font-semibold text-urgente-testo">{problema ?? errore}</span>}
      {aperto && (
        <div className="absolute z-30 top-full mt-1.5 left-0 rounded-xl border border-bordo bg-superficie shadow-lg p-3 text-inchiostro">
          <Mesetto valore={valore || undefined} min={min} onScegli={(g) => { setBozza(null); onChange(g); setAperto(false) }} />
          {valore && <p className="text-sm text-center mt-2 text-tenue">{dataCompleta(valore)}</p>}
        </div>
      )}
    </div>
  )
}

/** Tutti gli orari ogni quarto d'ora, in formato 24 ore */
const ORARI = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

/** Campo orario: si scrive "18:30" (o "1830", "18") oppure si sceglie dall'elenco che si apre toccando il campo. Sempre 24 ore. */
export function SceltaOra({ etichetta, valore, onChange, className }: { etichetta: string; valore: string; onChange: (ora: string) => void; className?: string }) {
  const [aperto, setAperto] = useState(false)
  const [bozza, setBozza] = useState<string | null>(null)
  const rif = useRef<HTMLDivElement>(null)
  const elenco = useRef<HTMLDivElement>(null)
  const id = useId()
  useClicFuori(rif, aperto, () => { setAperto(false); chiudiBozza() })

  const testo = bozza ?? valore
  const problema = bozza != null && bozza.trim() !== '' && !leggiOra(bozza) ? 'Scrivi l\'orario come 18:30' : undefined

  // All'apertura l'elenco parte dall'orario attuale, non da mezzanotte
  useEffect(() => {
    if (!aperto) return
    elenco.current?.querySelector<HTMLElement>('[data-vicino]')?.scrollIntoView({ block: 'center' })
  }, [aperto])

  function chiudiBozza() {
    if (bozza == null) return
    const o = leggiOra(bozza)
    if (o) { onChange(o); setBozza(null) }
    else if (bozza.trim() === '') setBozza(null)
  }
  function scrivi(nuovo: string) {
    const t = aiutaOra(testo, nuovo.replace(/[^\d:.]/g, '').slice(0, 5))
    setBozza(t)
    if (/^\d{2}:\d{2}$/.test(t)) { const o = leggiOra(t); if (o) onChange(o) }
  }
  const vicino = ORARI.find((o) => o >= (leggiOra(testo) ?? valore)) ?? ORARI[0]

  return (
    <div ref={rif} className={cn('relative flex flex-col gap-1.5 text-[13px] font-medium text-tenue', className)}>
      <label htmlFor={id}>{etichetta}</label>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-tenue pointer-events-none" aria-hidden />
        <input id={id} value={testo} onChange={(e) => scrivi(e.target.value)} onFocus={(e) => { e.target.select(); setAperto(true) }}
          onBlur={chiudiBozza} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); chiudiBozza(); setAperto(false) } }}
          inputMode="numeric" autoComplete="off" placeholder="hh:mm" aria-invalid={!!problema}
          className={stileCasella(!!problema, false)} />
      </div>
      {problema && <span className="text-xs font-semibold text-urgente-testo">{problema}</span>}
      {aperto && (
        <div ref={elenco} className="absolute z-30 top-full mt-1.5 left-0 right-0 max-h-56 overflow-y-auto rounded-xl border border-bordo bg-superficie shadow-lg py-1 text-inchiostro">
          {ORARI.map((o) => (
            <button key={o} type="button" data-vicino={o === vicino ? '' : undefined}
              onMouseDown={(e) => e.preventDefault()} onClick={() => { setBozza(null); onChange(o); setAperto(false) }}
              className={cn('w-full px-3 py-1.5 text-left text-[15px] tabular-nums cursor-pointer hover:bg-sfondo', o === valore && 'font-semibold bg-sfondo')}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
