import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Plus } from 'lucide-react'
import { useEventiGestione } from '@/modules/eventi/api'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import type { EventoGestione } from '@/modules/eventi/types'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { dataBreve, ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

const filtri = [
  { id: 'tutti', etichetta: 'Tutti', stati: null },
  { id: 'assegnare', etichetta: 'Da assegnare', stati: ['da_assegnare', 'bozza'] },
  { id: 'attesa', etichetta: 'In attesa', stati: ['proposto'] },
  { id: 'confermati', etichetta: 'Confermati', stati: ['confermato', 'in_corso'] },
  { id: 'completati', etichetta: 'Completati', stati: ['completato'] },
] as const

export function ElencoEventi() {
  const { data, isPending, error } = useEventiGestione()
  const [filtro, setFiltro] = useState<(typeof filtri)[number]['id']>('tutti')

  const attivo = filtri.find((f) => f.id === filtro)!
  const eventi = (data ?? []).filter((e) => !attivo.stati || (attivo.stati as readonly string[]).includes(e.stato))
  const conta = (stati: readonly string[] | null) => (data ?? []).filter((e) => !stati || stati.includes(e.stato)).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <p className="text-sm font-semibold text-tenue">Gestione</p>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Eventi</h1>
        </div>
        <Link to="/gestione/eventi/nuovo"
          className="h-12 px-5 rounded-xl bg-accento text-white font-bold text-sm flex items-center gap-2 hover:bg-accento-scuro transition">
          <Plus className="size-[18px]" aria-hidden /> Nuovo evento
        </Link>
      </div>

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
    <Card className="overflow-hidden">
      <div className="p-4 md:px-5 grid gap-3 items-center grid-cols-[1fr_auto] md:grid-cols-[150px_1.4fr_1fr_1fr_auto]">
        <div className="max-md:col-span-2 max-md:flex max-md:justify-between max-md:items-center">
          <div>
            <p className="font-bold">{dataBreve(e.allestimento_il)}</p>
            <p className="text-sm text-tenue">{ora(e.allestimento_il)} – {ora(e.smontaggio_il)}</p>
          </div>
          <StatoEvento stato={e.stato} className="md:hidden" />
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate">{e.tipo_booth?.nome ?? 'Evento'}{e.cliente?.nome && <span className="font-medium text-tenue"> · {e.cliente.nome}</span>}</p>
          <p className="text-sm text-tenue truncate">{e.indirizzo}, {e.citta}</p>
        </div>
        <div className="text-sm max-md:hidden">
          <p className="text-xs font-bold text-tenue">Operatore</p>
          <p className="font-semibold truncate">{e.operatore?.nome || '—'}</p>
        </div>
        <div className="max-md:hidden"><StatoEvento stato={e.stato} /></div>
        {assegnabile ? (
          <button onClick={() => setAperto((a) => !a)} aria-expanded={aperto}
            className="h-10 px-4 rounded-xl bg-inchiostro text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer justify-self-end max-md:col-span-2 max-md:justify-center max-md:w-full">
            Assegna <ChevronDown className={cn('size-4 transition', aperto && 'rotate-180')} aria-hidden />
          </button>
        ) : <span className="max-md:hidden" />}
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
