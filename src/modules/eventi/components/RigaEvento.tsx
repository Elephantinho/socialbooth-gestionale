import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { nomeCompleto, ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card } from '@/shared/ui/Card'
import { StatoEvento } from './StatoEvento'
import type { EventoGestione } from '../types'

/** Una riga dell'elenco eventi: data, cosa, dove, operatore, stato. "extra" aggiunge un'etichetta a destra. */
export function RigaEvento({ e, assegna = false, extra }: { e: EventoGestione; assegna?: boolean; extra?: React.ReactNode }) {
  const [aperto, setAperto] = useState(false)
  const assegnabile = assegna && e.stato === 'da_assegnare'

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
          <span className="justify-self-end max-md:hidden flex items-center gap-2">{extra}<StatoEvento stato={e.stato} /></span>
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
