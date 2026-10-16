import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Plus } from 'lucide-react'
import { useEventiGestione } from '@/modules/eventi/api'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import type { EventoGestione } from '@/modules/eventi/types'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { nomeCompleto, ora } from '@/shared/lib/formato'
import { Avatar } from '@/shared/ui/Avatar'
import { Intestazione } from '@/shared/ui/Intestazione'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

const filtri = [
  { id: 'tutti', etichetta: 'Tutti', stati: null },
  { id: 'assegnare', etichetta: 'Da assegnare', stati: ['da_assegnare', 'bozza'] },
  { id: 'attesa', etichetta: 'In attesa', stati: ['proposto'] },
  { id: 'confermati', etichetta: 'Confermati', stati: ['confermato', 'in_corso'] },
  { id: 'completati', etichetta: 'Completati', stati: ['completato'] },
  { id: 'annullati', etichetta: 'Annullati', stati: ['annullato'] },
] as const

export function ElencoEventi() {
  const { data, isPending, error } = useEventiGestione()
  const [filtro, setFiltro] = useState<(typeof filtri)[number]['id']>('tutti')

  const attivo = filtri.find((f) => f.id === filtro)!
  // "Tutti" non mostra gli annullati
  const passa = (stati: readonly string[] | null, stato: string) => (stati ? stati.includes(stato) : stato !== 'annullato')
  const eventi = (data ?? []).filter((e) => passa(attivo.stati, e.stato))
  const conta = (stati: readonly string[] | null) => (data ?? []).filter((e) => passa(stati, e.stato)).length

  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra="Gestione" titolo="Eventi" azioni={
        <Link to="/gestione/eventi/nuovo"
          className="h-12 px-5 rounded-xl bg-accento text-white font-bold text-sm flex items-center gap-2 hover:bg-accento-scuro transition shadow-[0_6px_16px_-8px_rgba(14,107,98,0.7)]">
          <Plus className="size-[18px]" aria-hidden /> Nuovo evento
        </Link>
      } />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {filtri.map((f) => (
          <button key={f.id} role="tab" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}
            className={cn(
              'h-10 px-4 rounded-full text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2',
              filtro === f.id ? 'bg-inchiostro text-white' : 'bg-superficie border border-bordo text-[#3F4047] hover:border-bordo-forte',
            )}>
            {f.etichetta}
            <span className={cn('text-xs', filtro === f.id ? 'text-accento-chiaro' : 'text-tenue')}>{conta(f.stati)}</span>
          </button>
        ))}
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card>
          <Vuoto titolo="Nessun evento qui" testo="Crea un evento: se in zona c'è un solo operatore, gli verrà proposto in automatico." />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {eventi.map((e) => <RigaEvento key={e.id} e={e} />)}
        </div>
      )}
    </div>
  )
}

function RigaEvento({ e }: { e: EventoGestione }) {
  const [aperto, setAperto] = useState(false)
  const assegnabile = e.stato === 'da_assegnare'

  return (
    <Card className="overflow-hidden hover:shadow-[0_8px_24px_-14px_rgba(21,22,26,0.3)] transition-shadow">
      <div className="p-3.5 md:px-4 flex flex-wrap items-center gap-3">
        <Link to={`/gestione/eventi/${e.id}`}
          className="flex-[1_1_480px] min-w-0 grid gap-x-4 gap-y-2 items-center grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1.4fr_1fr_auto]">
          <div className={cn('w-14 rounded-2xl py-2 text-center', e.stato === 'da_assegnare' ? 'bg-urgente-tenue text-urgente-testo' : 'bg-sfondo')}>
            <p className="text-[11px] font-bold uppercase leading-none">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { month: 'short', timeZone: 'Europe/Rome' }).replace('.', '')}</p>
            <p className="font-display text-2xl font-bold leading-tight">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { day: 'numeric', timeZone: 'Europe/Rome' })}</p>
            <p className="text-[11px] font-semibold opacity-70 leading-none">{ora(e.allestimento_il)}</p>
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">{e.tipo_booth?.nome ?? 'Evento'}{e.cliente?.nome && <span className="font-medium text-tenue"> · {e.cliente.nome}</span>}</p>
            <p className="text-sm text-tenue truncate">{e.indirizzo}, {e.citta}</p>
          </div>
          <div className="text-sm max-md:hidden min-w-0 flex items-center gap-2.5">
            {e.operatore ? (
              <>
                <Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} taglia="sm" />
                <span className="font-semibold truncate">{nomeCompleto(e.operatore)}</span>
              </>
            ) : <span className="text-tenue font-semibold">Nessun operatore</span>}
          </div>
          <StatoEvento stato={e.stato} className="justify-self-end max-md:hidden" />
          <span className="md:hidden col-start-2 -mt-1"><StatoEvento stato={e.stato} /></span>
        </Link>
        {assegnabile && (
          <button onClick={() => setAperto((a) => !a)} aria-expanded={aperto}
            className="h-10 px-4 rounded-xl bg-inchiostro text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer max-md:w-full max-md:justify-center">
            Assegna <ChevronDown className={cn('size-4 transition', aperto && 'rotate-180')} aria-hidden />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {aperto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-bordo bg-sfondo/60">
            <div className="p-4 md:px-5">
              <p className="text-sm font-bold mb-3">Operatori liberi in {e.regione}</p>
              <AssegnaOperatore eventoId={e.id} onFatto={() => setAperto(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
