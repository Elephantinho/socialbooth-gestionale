import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { dataBreve, ora } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import type { EventoLista } from './tipi'

/** Gli eventi dei prossimi 7 giorni */
export function ProssimiGiorni({ futuri, className }: { futuri: EventoLista[]; className?: string }) {
  const lista = futuri.filter((e) => new Date(e.allestimento_il).getTime() - Date.now() < 7 * 86_400_000).slice(0, 8)
  return (
    <Card className={`min-w-0 p-5 flex flex-col gap-3 ${className ?? ''}`}>
      <div className="flex justify-between items-center">
        <TitoloSezione>Prossimi 7 giorni</TitoloSezione>
        <Link to="/gestione/calendario" className="text-sm font-semibold text-accento inline-flex items-center gap-1">Calendario <ArrowRight className="size-4" aria-hidden /></Link>
      </div>
      {lista.length === 0 ? <p className="text-sm text-tenue py-4">Nessun evento nei prossimi 7 giorni.</p> : lista.map((e) => (
        <Link key={e.id} to={`/gestione/eventi/${e.id}`} className="flex items-center gap-3 py-2 border-b border-bordo last:border-0 hover:opacity-80">
          <div className="w-16 shrink-0">
            <p className="font-semibold text-sm">{dataBreve(e.allestimento_il).split(' ').slice(0, 2).join(' ')}</p>
            <p className="text-xs text-tenue">{ora(e.allestimento_il)}</p>
          </div>
          <p className="flex-1 min-w-0 text-sm font-semibold truncate">{e.tipo_booth?.nome ?? 'Evento'}, {e.citta}</p>
          <StatoEvento stato={e.stato} className="text-[11px] px-2 py-1" />
        </Link>
      ))}
    </Card>
  )
}
