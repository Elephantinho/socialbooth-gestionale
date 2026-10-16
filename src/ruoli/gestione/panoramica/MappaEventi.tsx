import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMagazzini } from '@/modules/anagrafiche/api'
import { dataBreve } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Mappa, type Segnaposto } from '@/shared/ui/Mappa'
import type { EventoLista } from './tipi'

const colori: Record<string, { colore: string; etichetta: string }> = {
  da_assegnare: { colore: '#D9480F', etichetta: 'Da assegnare' },
  proposto: { colore: '#E8A33D', etichetta: 'In attesa' },
  confermato: { colore: '#00897B', etichetta: 'Confermato' },
  in_corso: { colore: '#15161A', etichetta: 'In corso' },
  magazzino: { colore: '#5A5FC4', etichetta: 'Magazzino' },
}

/** Eventi e magazzini sulla mappa */
export function MappaEventi({ futuri, tutti }: { futuri: EventoLista[]; tutti: EventoLista[] }) {
  const naviga = useNavigate()
  const magazzini = useMagazzini()
  const [vista, setVista] = useState<'prossimi' | 'tutti'>('prossimi')

  const punti = useMemo<Segnaposto[]>(() => {
    const lista = vista === 'prossimi' ? futuri : tutti
    const s: Segnaposto[] = lista.filter((e) => e.lat != null && e.lng != null && colori[e.stato]).map((e) => ({
      id: e.id, lat: e.lat!, lng: e.lng!, colore: colori[e.stato].colore, raggio: 8,
      etichetta: `${dataBreve(e.allestimento_il)} · ${e.tipo_booth?.nome ?? 'Evento'} · ${e.citta}`,
      onClick: () => naviga(`/gestione/eventi/${e.id}`),
    }))
    for (const m of magazzini.data ?? []) {
      if (m.lat != null && m.lng != null) s.push({ id: `m${m.id}`, lat: m.lat, lng: m.lng, colore: colori.magazzino.colore, raggio: 6, etichetta: m.nome })
    }
    return s
  }, [futuri, tutti, magazzini.data, vista, naviga])

  return (
    <Card className="overflow-hidden">
      <div className="p-4 md:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-bordo">
        <TitoloSezione>Dove lavorate</TitoloSezione>
        <div className="flex rounded-xl bg-sfondo p-1" role="tablist">
          {([['prossimi', 'In programma'], ['tutti', 'Tutti']] as const).map(([k, t]) => (
            <button key={k} role="tab" aria-selected={vista === k} onClick={() => setVista(k)}
              className={cn('h-8 px-3 rounded-[9px] text-xs font-bold cursor-pointer', vista === k ? 'bg-inchiostro text-white' : 'text-tenue')}>{t}</button>
          ))}
        </div>
      </div>
      <Mappa punti={punti} altezza={360} zoomMax={12} />
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
