import { ExportCommercialista } from '@/modules/riepiloghi/components/ExportCommercialista'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { usePuo, type Permesso } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { daFatturare, daIncassare, inArchivio } from '@/modules/eventi/logic/archivio'
import type { EventoGestione } from '@/modules/eventi/types'
import { chiaveMese, etichettaMese } from '@/shared/lib/periodi'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Filtro = { id: string; etichetta: string; passa: (e: EventoGestione) => boolean; permesso?: Permesso }

const filtri: Filtro[] = [
  { id: 'completati', etichetta: 'Completati', passa: (e) => e.stato === 'completato' },
  { id: 'fatturare', etichetta: 'Da fatturare', passa: daFatturare, permesso: 'fatture' },
  { id: 'incassare', etichetta: 'Da incassare', passa: daIncassare, permesso: 'fatture' },
  { id: 'annullati', etichetta: 'Annullati', passa: (e) => e.stato === 'annullato' },
]

const testo = (e: EventoGestione) => [e.citta, e.indirizzo, e.regione, e.tipo_booth?.nome, e.cliente?.nome, e.operatore?.nome, e.operatore?.cognome]
  .filter(Boolean).join(' ').toLowerCase()

/** Eventi finiti e annullati, dal più recente, divisi per mese */
export function ArchivioEventi() {
  const { data, isPending, error } = useEventiGestione()
  const puo = usePuo()
  const [parametri, setParametri] = useSearchParams()
  const [cerca, setCerca] = useState('')
  const visibili = filtri.filter((f) => !f.permesso || puo(f.permesso))
  const attivo = visibili.find((f) => f.id === parametri.get('filtro')) ?? visibili[0]

  const archivio = (data ?? []).filter(inArchivio)
  const parole = cerca.toLowerCase().split(/\s+/).filter(Boolean)
  const eventi = archivio
    .filter(attivo.passa)
    .filter((e) => parole.every((p) => testo(e).includes(p)))
    .sort((a, b) => b.allestimento_il.localeCompare(a.allestimento_il))
  const mesi = [...eventi.reduce((m, e) => m.set(chiaveMese(e.allestimento_il), [...(m.get(chiaveMese(e.allestimento_il)) ?? []), e]), new Map<string, EventoGestione[]>())]

  const etichettaFattura = (e: EventoGestione) => !puo('fatture') || e.stato !== 'completato' ? null
    : daFatturare(e) ? <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-avviso text-avviso-testo">Da fatturare</span>
    : daIncassare(e) ? <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-urgente-tenue text-urgente-testo">Da incassare</span>
    : <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-accento-tenue text-accento-scuro">Pagato</span>

  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra="Archivio" titolo="Eventi passati" descrizione="Gli eventi chiusi e quelli annullati, dal più recente."
        azioni={puo('fatture') && <ExportCommercialista />} />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
          {visibili.map((f) => (
            <button key={f.id} role="tab" aria-selected={attivo.id === f.id}
              onClick={() => setParametri(f.id === visibili[0].id ? {} : { filtro: f.id }, { replace: true })}
              className={cn('h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2',
                attivo.id === f.id ? 'bg-inchiostro text-white' : 'bg-superficie border border-bordo text-[#3F4047] hover:border-bordo-forte')}>
              {f.etichetta}
              <span className={cn('text-xs', attivo.id === f.id ? 'text-accento-chiaro' : 'text-tenue')}>{archivio.filter(f.passa).length}</span>
            </button>
          ))}
        </div>
        <label className="relative flex-[1_1_220px] max-w-sm ml-auto">
          <span className="sr-only">Cerca negli eventi passati</span>
          <Search className="size-4 text-tenue absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Città, cliente, operatore…"
            className="h-10 w-full rounded-md border border-bordo-forte bg-superficie pl-10 pr-3 text-sm" />
        </label>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !eventi.length ? (
        <Card><Vuoto titolo="Nessun evento qui" testo={cerca ? 'Prova con altre parole.' : 'Quando un evento si chiude, finisce qui.'} /></Card>
      ) : mesi.map(([mese, lista]) => (
        <section key={mese} className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-tenue capitalize">{etichettaMese(mese)}, {lista.length}</h2>
          {lista.map((e) => <RigaEvento key={e.id} e={e} extra={etichettaFattura(e)} />)}
        </section>
      ))}
    </div>
  )
}
