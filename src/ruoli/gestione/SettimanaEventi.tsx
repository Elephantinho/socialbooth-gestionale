import { Link } from 'react-router-dom'
import { Check, Clock } from 'lucide-react'
import { AssegnaRapido } from '@/modules/eventi/components/RigaEvento'
import { giaPassato } from '@/modules/eventi/logic/archivio'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import type { EventoGestione } from '@/modules/eventi/types'
import { PASSAGGI, passaggiFatti } from '@/modules/passaggi/passaggi'
import { ritardo } from '@/modules/passaggi/ritardi'
import { giornoBreve, piuGiorni } from '@/shared/lib/date'
import { ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { useAdesso } from '@/shared/lib/tempo'
import { perGiorno } from '@/modules/eventi/logic/giorni'

/** Sette colonne, una per giorno a partire da "inizio"; ogni evento è una schedina. */
export function SettimanaEventi({ eventi, inizio, oggi, assegna }: { eventi: EventoGestione[]; inizio: string; oggi: string; assegna: boolean }) {
  const adesso = useAdesso()
  const giorni = Array.from({ length: 7 }, (_, i) => piuGiorni(inizio, i))
  const diGiorno = new Map(perGiorno(eventi))

  return (
    <div className="overflow-x-auto -mx-4 px-4 scroll-px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
      <div className="grid grid-cols-[repeat(7,minmax(240px,1fr))] md:grid-cols-7 gap-2 min-w-max md:min-w-0">
        {giorni.map((g, i) => {
          const lista = diGiorno.get(g) ?? []
          const daSistemare = lista.filter((e) => ritardo(e, adesso) || e.stato === 'da_assegnare' || e.stato === 'bozza').length
          const [nomeGiorno, numero, mese] = giornoBreve(g).split(' ')
          return (
            <section key={g} className="snap-start flex flex-col gap-1.5 min-w-0">
              <header className={cn('rounded-lg px-2.5 py-2 flex items-baseline justify-between gap-2 sticky top-0 z-10',
                g === oggi ? 'bg-inchiostro text-white' : 'bg-superficie border border-bordo')}>
                <span className="text-sm font-semibold truncate">
                  {g === oggi ? 'Oggi' : nomeGiorno} {numero}
                  <span className={cn('font-medium ml-1', g === oggi ? 'text-white/60' : 'text-tenue')}>{mese}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
                  {daSistemare > 0 && <span className="size-2 rounded-full bg-urgente" title={`${daSistemare} da sistemare`} />}
                  <span className={g === oggi ? 'text-white/80' : 'text-tenue'}>{lista.length}</span>
                </span>
              </header>
              {lista.length === 0
                ? <p className="text-xs text-tenue/70 text-center py-4">Nessun evento</p>
                : lista.map((e) => <Schedina key={e.id} e={e} adesso={adesso} assegna={assegna} destra={i >= 4} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Schedina({ e, adesso, assegna, destra }: { e: EventoGestione; adesso: number; assegna: boolean; destra: boolean }) {
  const manca = ritardo(e, adesso)
  const daAssegnare = e.stato === 'da_assegnare' || e.stato === 'bozza'
  const barra = manca || daAssegnare ? 'bg-urgente' : e.stato === 'proposto' ? 'bg-avviso-icona' : 'bg-ok'
  const n = passaggiFatti(e.ultimo_passaggio)

  return (
    <div className="relative bg-superficie border border-bordo rounded-lg pl-3 pr-2 py-2 hover:border-bordo-forte hover:shadow-sm transition">
      <span className={cn('absolute left-0 inset-y-0 w-1 rounded-l-lg', barra)} aria-hidden />
      <Link to={`/gestione/eventi/${e.id}`} className="block">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs font-semibold tabular-nums">{ora(e.allestimento_il)}</span>
          {manca ? <span className="text-[10px] font-semibold text-white bg-urgente rounded px-1.5 py-px truncate">{manca}</span>
            : e.stato === 'in_corso' ? <span className="text-[10px] font-semibold text-white bg-ok rounded px-1.5 py-px">{n ? PASSAGGI[n - 1].fatto.split(',')[0] : 'In corso'} {n}/6</span>
            : e.stato === 'confermato' ? <Check className="size-3.5 text-ok" strokeWidth={3} aria-label="Confermato" />
            : e.stato === 'proposto' ? <Clock className="size-3.5 text-avviso-icona" aria-label="In attesa" />
            : null}
        </div>
        <p className="text-[13px] font-semibold leading-snug line-clamp-2 mt-0.5">{nomeEvento(e)}</p>
        <p className="text-[11px] text-tenue truncate">{e.citta}{e.project ? `, ${e.project.nome}` : ''}</p>
      </Link>
      <div className="mt-1.5">
        {e.operatore ? (
          <p className="text-[11px] font-medium truncate">{e.operatore.nome} {e.operatore.cognome}</p>
        ) : assegna && e.stato === 'da_assegnare' && !giaPassato(e, adesso) ? (
          <AssegnaRapido eventoId={e.id} destra={destra} piccolo />
        ) : (
          <p className="text-[11px] font-semibold text-urgente-testo">Nessun operatore</p>
        )}
      </div>
    </div>
  )
}

