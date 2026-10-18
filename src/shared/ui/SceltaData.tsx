import { useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useClicFuori } from '@/shared/lib/clicFuori'
import { useAdesso } from '@/shared/lib/tempo'
import { caselleDelMese, dataCompleta, giornoRoma, nomeMese, piuMesi } from '@/shared/lib/date'

// Date e orari si scelgono, non si scrivono: niente formati da indovinare (gg/mm o mm/gg, AM/PM).

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

type PropsData = {
  etichetta: string
  valore: string            // "AAAA-MM-GG" o '' se non scelta
  onChange: (giorno: string) => void
  min?: string
  vuotabile?: boolean       // si può togliere la data (es. data fattura)
  errore?: string
  className?: string
}

/** Campo data: mostra il giorno per esteso ("Lunedì 19 ottobre 2026") e apre il calendario al clic */
export function SceltaData({ etichetta, valore, onChange, min, vuotabile, errore, className }: PropsData) {
  const [aperto, setAperto] = useState(false)
  const rif = useRef<HTMLDivElement>(null)
  useClicFuori(rif, aperto, () => setAperto(false))

  return (
    <div ref={rif} className={cn('relative flex flex-col gap-1.5 text-[13px] font-medium text-tenue', className)}>
      <span>{etichetta}</span>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setAperto((a) => !a)} aria-expanded={aperto}
          className={cn('flex-1 h-11 rounded-lg border bg-superficie px-3 text-[15px] text-left flex items-center gap-2 cursor-pointer',
            errore ? 'border-urgente' : aperto ? 'border-accento shadow-[inset_0_0_0_1px_var(--color-accento)]' : 'border-bordo-forte')}>
          <CalendarDays className="size-[18px] text-tenue shrink-0" aria-hidden />
          <span className={cn('truncate', valore ? 'text-inchiostro font-medium' : 'text-tenue/70')}>{valore ? dataCompleta(valore) : 'Scegli il giorno'}</span>
        </button>
        {vuotabile && valore && (
          <button type="button" onClick={() => onChange('')} aria-label="Togli la data"
            className="size-11 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center text-tenue hover:text-inchiostro cursor-pointer">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {errore && <span className="text-xs font-semibold text-urgente-testo">{errore}</span>}
      {aperto && (
        <div className="absolute z-30 top-full mt-1.5 left-0 rounded-xl border border-bordo bg-superficie shadow-lg p-3 text-inchiostro">
          <Mesetto valore={valore || undefined} min={min} onScegli={(g) => { onChange(g); setAperto(false) }} />
        </div>
      )}
    </div>
  )
}

/** Tutti gli orari ogni quarto d'ora, in formato 24 ore */
const ORARI = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

/** Campo orario: si sceglie da un elenco (00:00 … 23:45), sempre 24 ore */
export function SceltaOra({ etichetta, valore, onChange, className }: { etichetta: string; valore: string; onChange: (ora: string) => void; className?: string }) {
  // Un orario salvato prima che non cade sul quarto d'ora resta tra le scelte
  const scelte = ORARI.includes(valore) || !valore ? ORARI : [...ORARI, valore].toSorted()
  return (
    <label className={cn('flex flex-col gap-1.5 text-[13px] font-medium text-tenue', className)}>
      {etichetta}
      <select value={valore} onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-bordo-forte bg-superficie px-3 text-[15px] font-medium text-inchiostro tabular-nums cursor-pointer focus:outline-none focus:border-accento">
        {scelte.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
