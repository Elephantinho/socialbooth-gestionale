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
import { giaPassato } from '../logic/archivio'
import { nomeEvento } from '@/modules/eventi/logic/nome'

const fuso = { timeZone: 'Europe/Rome' } as const

/** Un evento come box: data, servizio, luogo, operatore. L'etichetta compare solo se c'è qualcosa da fare. */
export function BoxEvento({ e, assegna = false }: { e: EventoGestione; assegna?: boolean }) {
  const [aperto, setAperto] = useState(false)
  const scoperto = e.stato === 'da_assegnare' || e.stato === 'bozza'
  const assegnabile = assegna && e.stato === 'da_assegnare' && !giaPassato(e)
  const data = new Date(e.allestimento_il)

  return (
    <Card className={cn('overflow-hidden flex flex-col', scoperto && 'border-urgente/50')}>
      <Link to={`/gestione/eventi/${e.id}`} className="p-4 flex flex-col gap-3 flex-1 hover:bg-sfondo/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-tenue capitalize">
              {data.toLocaleDateString('it-IT', { weekday: 'long', ...fuso })}
            </p>
            <p className="font-display text-xl font-semibold leading-tight">
              {data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', ...fuso })}
              <span className="text-tenue font-medium text-base">, {ora(e.allestimento_il)}</span>
            </p>
          </div>
          <StatoEvento stato={e.stato} />
        </div>

        <div className="min-w-0">
          <p className="font-semibold truncate">{nomeEvento(e)}</p>
          {e.nome && e.tipo_booth && <p className="text-sm font-medium truncate">{e.tipo_booth.nome}</p>}
          <p className="text-sm text-tenue truncate">{e.indirizzo}, {e.citta}</p>
        </div>

        <div className="mt-auto pt-3 border-t border-bordo flex items-center gap-2.5 text-sm min-w-0">
          {e.operatore ? (
            <>
              <Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} taglia="sm" />
              <span className="font-semibold truncate">{nomeCompleto(e.operatore)}</span>
            </>
          ) : <span className="text-urgente-testo font-semibold">Nessun operatore</span>}
        </div>
      </Link>

      {assegnabile && (
        <button onClick={() => setAperto((a) => !a)} aria-expanded={aperto}
          className="h-11 mx-4 mb-4 rounded-lg bg-accento text-su-accento text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-accento-hover">
          Assegna <ChevronDown className={cn('size-4 transition', aperto && 'rotate-180')} aria-hidden />
        </button>
      )}

      <AnimatePresence initial={false}>
        {aperto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-bordo bg-sfondo/60">
            <div className="p-4">
              <p className="text-sm font-semibold mb-3">Operatori liberi in {e.regione}</p>
              <AssegnaOperatore eventoId={e.id} onFatto={() => setAperto(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
