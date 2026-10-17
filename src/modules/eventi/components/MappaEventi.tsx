import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMagazzini } from '@/modules/anagrafiche/api'
import { dataBreve } from '@/shared/lib/formato'
import { Card } from '@/shared/ui/Card'
import { Mappa, type Segnaposto } from '@/shared/ui/Mappa'
import type { EventoGestione as EventoLista } from '../types'

const colori: Record<string, { colore: string; etichetta: string }> = {
  da_assegnare: { colore: '#C2321F', etichetta: 'Da assegnare' },
  proposto: { colore: '#E8700F', etichetta: 'In attesa' },
  confermato: { colore: '#1E7A4C', etichetta: 'Confermato' },
  in_corso: { colore: '#16181D', etichetta: 'In corso' },
  magazzino: { colore: '#8A8F98', etichetta: 'Magazzino' },
}

/** Eventi e magazzini sulla mappa: un clic su un evento lo apre */
export function MappaEventi({ eventi }: { eventi: EventoLista[] }) {
  const naviga = useNavigate()
  const magazzini = useMagazzini()

  const punti = useMemo<Segnaposto[]>(() => {
    const s: Segnaposto[] = eventi.filter((e) => e.lat != null && e.lng != null && colori[e.stato]).map((e) => ({
      id: e.id, lat: e.lat!, lng: e.lng!, colore: colori[e.stato].colore, raggio: 8,
      etichetta: `${dataBreve(e.allestimento_il)}, ${e.tipo_booth?.nome ?? 'Evento'}, ${e.citta}`,
      onClick: () => naviga(`/gestione/eventi/${e.id}`),
    }))
    for (const m of magazzini.data ?? []) {
      if (m.lat != null && m.lng != null) s.push({ id: `m${m.id}`, lat: m.lat, lng: m.lng, colore: colori.magazzino.colore, raggio: 6, etichetta: m.nome })
    }
    return s
  }, [eventi, magazzini.data, naviga])

  return (
    <Card className="overflow-hidden">
      <Mappa punti={punti} altezza={520} zoomMax={12} />
      <div className="px-4 md:px-5 py-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-bordo">
        {Object.values(colori).map((c) => (
          <span key={c.etichetta} className="inline-flex items-center gap-1.5 text-xs font-semibold text-tenue">
            <span className="size-2.5 rounded-full" style={{ background: c.colore }} aria-hidden />{c.etichetta}
          </span>
        ))}
        <span className="text-xs text-tenue ml-auto">Clicca su un evento per aprirlo</span>
      </div>
    </Card>
  )
}
