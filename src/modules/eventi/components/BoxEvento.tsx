import { Link } from 'react-router-dom'
import { Check, Clock, UserPlus } from 'lucide-react'
import { nomeCompleto, ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import type { EventoGestione } from '../types'
import { nomeEvento } from '../logic/nome'

const fuso = { timeZone: 'Europe/Rome' } as const

/** Colore e segno di ogni stato: verde = a posto, arancione = si aspetta, rosso = da fare. */
const aspetto: Partial<Record<EventoGestione['stato'], { barra: string; segno: React.ReactNode }>> = {
  confermato:   { barra: 'bg-ok',           segno: <span title="Confermato" className="size-5 rounded-full bg-ok text-white flex items-center justify-center"><Check className="size-3.5" strokeWidth={3} aria-label="Confermato" /></span> },
  completato:   { barra: 'bg-ok',           segno: <span title="Completato" className="size-5 rounded-full bg-ok text-white flex items-center justify-center"><Check className="size-3.5" strokeWidth={3} aria-label="Completato" /></span> },
  in_corso:     { barra: 'bg-ok',           segno: <span className="text-[11px] font-semibold text-ok bg-ok-tenue rounded-full px-2 py-0.5">In corso</span> },
  proposto:     { barra: 'bg-avviso-icona', segno: <span title="In attesa di risposta" className="text-avviso-icona"><Clock className="size-[18px]" aria-label="In attesa di risposta" /></span> },
  da_assegnare: { barra: 'bg-urgente',      segno: null },
  bozza:        { barra: 'bg-urgente',      segno: null },
}

/** Un evento in un box compatto: data, nome, servizio e città, operatore. */
export function BoxEvento({ e }: { e: EventoGestione }) {
  const a = aspetto[e.stato] ?? { barra: 'bg-bordo-forte', segno: null }
  const data = new Date(e.allestimento_il)

  return (
    <Link to={`/gestione/eventi/${e.id}`}
      className="relative bg-superficie border border-bordo rounded-xl pl-4 pr-3 py-3 flex flex-col gap-2 hover:border-bordo-forte hover:shadow-sm transition overflow-hidden">
      <span className={cn('absolute left-0 inset-y-0 w-1', a.barra)} aria-hidden />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-tenue capitalize">
          {data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', ...fuso }).replace('.', '')}, {ora(e.allestimento_il)}
        </p>
        {a.segno}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-[15px] leading-snug truncate">{nomeEvento(e)}</p>
        <p className="text-xs text-tenue truncate">{e.nome && e.tipo_booth ? `${e.tipo_booth.nome}, ` : ''}{e.citta}</p>
      </div>

      {e.operatore ? (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} taglia="xs" />
          <span className="text-xs font-medium truncate">{nomeCompleto(e.operatore)}</span>
        </div>
      ) : (
        <span className="text-xs font-semibold text-urgente-testo flex items-center gap-1.5">
          <UserPlus className="size-4" aria-hidden /> Da assegnare
        </span>
      )}
    </Link>
  )
}
