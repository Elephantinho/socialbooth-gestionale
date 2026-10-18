import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEventiPeriodo } from '@/modules/eventi/api'
import { ora } from '@/shared/lib/formato'
import { caselleDelMese, giornoRoma, meseRoma, nomeMese, piuGiorni, piuMesi, titoloGiorno } from '@/shared/lib/date'
import { useAdesso } from '@/shared/lib/tempo'
import { perGiorno as raggruppaPerGiorno } from '@/modules/eventi/logic/giorni'
import { cn } from '@/shared/lib/cn'
import { REGIONI } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { Selezione } from '@/shared/ui/Campo'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { ritardo } from '@/modules/passaggi/ritardi'
import { RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { usePuo } from '@/modules/auth/permessi'
import type { EventoGestione } from '@/modules/eventi/types'

const coloreStato: Record<string, string> = {
  bozza: 'bg-sfondo text-tenue border-bordo',
  da_assegnare: 'bg-urgente-tenue text-urgente-testo border-urgente/30',
  proposto: 'bg-avviso text-avviso-testo border-avviso-icona/40',
  confermato: 'bg-ok-tenue text-ok border-ok/30',
  in_corso: 'bg-ok text-white border-ok',
  completato: 'bg-superficie text-tenue border-bordo',
}

const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

/** Calendario mensile degli eventi, filtrabile per regione. Cliccando un giorno, la sua lista si apre sotto. */
export function Calendario() {
  const adesso = useAdesso()
  const oggi = giornoRoma(adesso)
  const [mese, setMese] = useState(() => meseRoma(adesso))
  const [regione, setRegione] = useState('')
  const [scelto, setScelto] = useState(oggi)
  const puo = usePuo()

  const giorni = useMemo(() => caselleDelMese(mese), [mese])
  // Le sei settimane mostrate, con un giorno di margine per il fuso
  const periodo = useMemo(() => ({
    dal: new Date(`${piuGiorni(giorni[0], -1)}T00:00:00Z`),
    al: new Date(`${piuGiorni(giorni[41], 2)}T00:00:00Z`),
  }), [giorni])
  const { data, isPending, error } = useEventiPeriodo(periodo.dal, periodo.al)
  const perGiorno = useMemo(
    () => new Map(raggruppaPerGiorno((data ?? []).filter((e) => e.stato !== 'annullato' && (!regione || e.regione === regione)))),
    [data, regione])

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Calendario" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMese((m) => piuMesi(m, -1))} aria-label="Mese precedente" className="size-11 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <h2 className="font-display text-2xl font-semibold w-56 text-center">{nomeMese(mese)}</h2>
          <button onClick={() => setMese((m) => piuMesi(m, 1))} aria-label="Mese successivo" className="size-11 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          {/* Compare solo se ti sei spostato su un altro mese */}
          {mese !== meseRoma(adesso) && (
            <button onClick={() => setMese(meseRoma(adesso))}
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
            <div className="min-w-[640px]">
              <div className="grid grid-cols-7 border-b border-bordo bg-sfondo">
                {giorniSettimana.map((g) => <div key={g} className="px-3 py-2.5 text-xs font-semibold text-tenue ">{g}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {giorni.map((k) => {
                  const eventi = perGiorno.get(k) ?? []
                  const fuori = !k.startsWith(mese)
                  // I giorni già passati sono neutri: in evidenza resta solo ciò che è rimasto aperto
                  const passatoGiorno = k < oggi
                  return (
                    <button key={k} onClick={() => setScelto(k)} aria-pressed={scelto === k}
                      className={cn('min-h-24 border-r border-b border-bordo p-1.5 flex flex-col gap-1 text-left cursor-pointer [&:nth-child(7n)]:border-r-0 hover:bg-sfondo/70',
                        (fuori || passatoGiorno) && 'bg-sfondo/60', scelto === k && 'ring-2 ring-inset ring-inchiostro')}>
                      <span className={cn('text-xs font-semibold w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                        k === oggi ? 'bg-accento text-su-accento' : fuori || passatoGiorno ? 'text-tenue/60' : 'text-inchiostro')}>{Number(k.slice(8))}</span>
                      {eventi.length > 0 && eventi.length <= 2 ? eventi.map((e) => (
                        <span key={e.id} className={cn('rounded-md border px-1.5 py-0.5 text-[11px] leading-tight truncate w-full', ritardo(e, adesso) ? 'bg-urgente text-white border-urgente' : passatoGiorno ? 'bg-transparent text-tenue border-bordo' : coloreStato[e.stato])}>
                          <span className="font-semibold">{ora(e.allestimento_il)}</span> {nomeEvento(e)}
                        </span>
                      )) : eventi.length > 2 && <Riassunto eventi={eventi} passato={passatoGiorno} adesso={adesso} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {scelto && (
        <Card className="overflow-visible">
          <h2 className="px-4 py-3 border-b border-bordo bg-sfondo/60 rounded-t-xl font-semibold flex items-baseline gap-2">
            {titoloGiorno(scelto, oggi)}
            <span className="text-sm font-medium text-tenue">{(perGiorno.get(scelto) ?? []).length === 1 ? '1 evento' : `${(perGiorno.get(scelto) ?? []).length} eventi`}</span>
          </h2>
          {(perGiorno.get(scelto) ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-tenue">Nessun evento in questo giorno.</p>
          ) : (
            <div className="divide-y divide-bordo">
              {(perGiorno.get(scelto) ?? []).map((e) => <RigaEvento key={e.id} e={e} assegna={puo('eventi.assegna')} />)}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

/** Giorno con tanti eventi: quanti sono, barra per stato e cosa c'è da fare */
function Riassunto({ eventi, passato, adesso }: { eventi: EventoGestione[]; passato?: boolean; adesso: number }) {
  const daFare = eventi.filter((e) => ritardo(e, adesso) || e.stato === 'da_assegnare' || e.stato === 'bozza').length
  const attesa = eventi.filter((e) => !ritardo(e, adesso) && e.stato === 'proposto').length
  const ok = eventi.length - daFare - attesa
  const pct = (n: number) => `${(n / eventi.length) * 100}%`
  if (passato) {
    const aperti = eventi.filter((e) => ritardo(e, adesso) || e.stato === 'confermato' || e.stato === 'in_corso').length
    return (
      <div className="flex flex-col gap-0.5 px-0.5 w-full">
        <p className="text-sm font-semibold leading-tight text-tenue">{eventi.length} <span className="text-xs font-medium">eventi</span></p>
        {aperti > 0
          ? <p className="text-[11px] font-semibold text-urgente-testo leading-tight">{aperti} da chiudere</p>
          : <p className="text-[11px] text-tenue leading-tight">conclusi</p>}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1 px-0.5 w-full">
      <p className="text-sm font-semibold leading-tight">{eventi.length} <span className="text-xs font-medium text-tenue">eventi</span></p>
      <div className="h-1.5 rounded-full bg-bordo overflow-hidden flex" aria-hidden>
        <span className="bg-ok" style={{ width: pct(ok) }} />
        <span className="bg-avviso-icona" style={{ width: pct(attesa) }} />
        <span className="bg-urgente" style={{ width: pct(daFare) }} />
      </div>
      {daFare > 0
        ? <p className="text-[11px] font-semibold text-urgente-testo leading-tight">{daFare} da sistemare</p>
        : attesa > 0 ? <p className="text-[11px] font-semibold text-avviso-testo leading-tight">{attesa} in attesa</p>
        : <p className="text-[11px] font-semibold text-ok leading-tight">Tutti coperti</p>}
    </div>
  )
}
