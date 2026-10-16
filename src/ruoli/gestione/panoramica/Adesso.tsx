import { Link } from 'react-router-dom'
import { nomeCompleto, ora, perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import type { EventoLista } from './tipi'

/** A che punto è l'operatore, dalle tappe registrate */
function fase(e: EventoLista) {
  const t = e.ore?.[0]
  if (t?.rientro_il) return { testo: 'Rientrato', stile: 'bg-sfondo text-tenue' }
  if (t?.fine_il) return { testo: `Finito alle ${ora(t.fine_il)}, in rientro`, stile: 'bg-accento-tenue text-accento-scuro' }
  if (t?.check_in_il) return { testo: `In location dalle ${ora(t.check_in_il)}`, stile: 'bg-accento-tenue text-accento-scuro' }
  if (t?.partenza_il) return { testo: `In viaggio dalle ${ora(t.partenza_il)}`, stile: 'bg-avviso text-avviso-testo' }
  return { testo: `Parte alle ${ora(e.ritiro_magazzino_il ?? e.allestimento_il)}`, stile: 'bg-sfondo text-tenue' }
}

/** Chi sta lavorando oggi */
export function Adesso({ eventi }: { eventi: EventoLista[] }) {
  const oggi = perCampoData(new Date().toISOString())
  const lista = eventi
    .filter((e) => e.stato === 'in_corso' || (e.stato === 'confermato' && perCampoData(e.allestimento_il) === oggi))
    .sort((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))
  if (!lista.length) return null

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5" aria-hidden>
          {lista.length > 0 && <span className="absolute inline-flex size-full rounded-full bg-accento opacity-60 animate-ping" />}
          <span className="relative inline-flex size-2.5 rounded-full bg-accento" />
        </span>
        <TitoloSezione>In questo momento</TitoloSezione>
        <span className="text-sm text-tenue font-semibold">{lista.length ? `${lista.length} ${lista.length === 1 ? 'evento' : 'eventi'} oggi` : ''}</span>
      </div>
      {(
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {lista.map((e) => {
            const f = fase(e)
            return (
              <Link key={e.id} to={`/gestione/eventi/${e.id}`} className="rounded-xl border border-bordo p-3 flex items-center gap-3 hover:border-bordo-forte transition">
                {e.operatore ? <Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} /> : <span className="size-11 rounded-full bg-sfondo" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{e.operatore ? nomeCompleto(e.operatore) : 'Nessun operatore'}</p>
                  <p className="text-xs text-tenue truncate">{e.tipo_booth?.nome ?? 'Evento'}, {e.citta}</p>
                </div>
                <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-lg text-right', f.stile)}>{f.testo}</span>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
