import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Clock, Loader2 } from 'lucide-react'
import { useOperatoriDisponibili, useProponiOperatore } from '@/modules/eventi/api'
import { PASSAGGI, passaggiFatti } from '@/modules/passaggi/passaggi'
import { ritardo } from '@/modules/passaggi/ritardi'
import { nomeCompleto, ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import type { EventoGestione } from '../types'
import { giaPassato } from '../logic/archivio'
import { nomeEvento } from '../logic/nome'

/** Colonne della tabella eventi, condivise da intestazione e righe */
export const COLONNE = 'md:grid md:grid-cols-[56px_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_140px] md:items-center md:gap-4'

/** Un evento su una riga: ora, nome, project, operatore (o Assegna), stato. Un clic apre la scheda. */
export function RigaEvento({ e, assegna }: { e: EventoGestione; assegna: boolean }) {
  const naviga = useNavigate()
  const manca = ritardo(e)
  const barra = manca || e.stato === 'da_assegnare' || e.stato === 'bozza' ? 'bg-urgente'
    : e.stato === 'proposto' ? 'bg-avviso-icona'
    : ['confermato', 'in_corso', 'completato'].includes(e.stato) ? 'bg-ok' : 'bg-bordo-forte'
  const assegnabile = assegna && e.stato === 'da_assegnare' && !giaPassato(e)

  return (
    <div role="link" tabIndex={0} onClick={() => naviga(`/gestione/eventi/${e.id}`)}
      onKeyDown={(k) => { if (k.key === 'Enter') naviga(`/gestione/eventi/${e.id}`) }}
      className={cn('relative pl-4 pr-3 py-2.5 cursor-pointer hover:bg-sfondo/70 flex flex-wrap items-center gap-x-3 gap-y-1', COLONNE)}>
      <span className={cn('absolute left-0 inset-y-1.5 w-1 rounded-r', barra)} aria-hidden />

      <span className="text-sm font-semibold tabular-nums w-12 md:w-auto">{ora(e.allestimento_il)}</span>

      <div className="min-w-0 flex-1 md:flex-none">
        <Link to={`/gestione/eventi/${e.id}`} onClick={(ev) => ev.stopPropagation()} className="font-semibold text-[15px] truncate block hover:underline">{nomeEvento(e)}</Link>
        <p className="text-xs text-tenue truncate">{e.nome && e.tipo_booth ? `${e.tipo_booth.nome}, ` : ''}{e.citta}</p>
      </div>

      <span className="text-sm text-tenue truncate max-md:hidden">{e.project ? nomeCompleto(e.project) : '—'}</span>

      <div className="min-w-0 max-md:order-last max-md:basis-full max-md:pl-[60px] flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
        {e.operatore ? (
          <>
            <Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} taglia="xs" />
            <span className="text-sm truncate">{nomeCompleto(e.operatore)}</span>
          </>
        ) : assegnabile ? (
          <AssegnaRapido eventoId={e.id} />
        ) : (
          <span className="text-sm font-semibold text-urgente-testo">Nessun operatore</span>
        )}
        <span className="md:hidden text-xs text-tenue truncate ml-auto">{e.project ? nomeCompleto(e.project) : ''}</span>
      </div>

      <span className="md:justify-self-end"><Stato e={e} manca={manca} /></span>
    </div>
  )
}

function Stato({ e, manca }: { e: EventoGestione; manca: string | null }) {
  const pillola = 'text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap inline-flex items-center gap-1.5'
  if (manca) return <span className={cn(pillola, 'bg-urgente text-white')}>{manca}</span>
  switch (e.stato) {
    case 'in_corso': {
      const n = passaggiFatti(e.ultimo_passaggio)
      return <span className={cn(pillola, 'bg-ok text-white')}>{n ? PASSAGGI[n - 1].fatto.split(',')[0] : 'In corso'} {n}/{PASSAGGI.length}</span>
    }
    case 'confermato': return <span className={cn(pillola, 'text-ok')}><Check className="size-4" strokeWidth={3} aria-hidden />Confermato</span>
    case 'completato': return <span className={cn(pillola, 'text-ok')}><Check className="size-4" strokeWidth={3} aria-hidden />Completato</span>
    case 'proposto': return <span className={cn(pillola, 'text-avviso-testo')}><Clock className="size-4" aria-hidden />In attesa</span>
    case 'annullato': return <span className={cn(pillola, 'text-tenue line-through')}>Annullato</span>
    default: return <span className={cn(pillola, 'bg-urgente-tenue text-urgente-testo')}>Da assegnare</span>
  }
}

/** Pulsante "Assegna" con il menu degli operatori liberi: si propone senza aprire la scheda. */
function AssegnaRapido({ eventoId }: { eventoId: string }) {
  const [aperto, setAperto] = useState(false)
  const rif = useRef<HTMLDivElement>(null)
  const liberi = useOperatoriDisponibili(aperto ? eventoId : undefined)
  const proponi = useProponiOperatore()

  useEffect(() => {
    if (!aperto) return
    const fuori = (ev: MouseEvent) => { if (!rif.current?.contains(ev.target as Node)) setAperto(false) }
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setAperto(false) }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [aperto])

  return (
    <div ref={rif} className="relative">
      <button onClick={() => setAperto((a) => !a)} aria-expanded={aperto}
        className="h-8 pl-3 pr-2 rounded-lg bg-accento text-su-accento text-sm font-semibold flex items-center gap-1 cursor-pointer hover:bg-accento-hover">
        Assegna <ChevronDown className={cn('size-4 transition-transform', aperto && 'rotate-180')} aria-hidden />
      </button>
      {aperto && (
        <div className="absolute left-0 top-full mt-1.5 w-72 bg-superficie border border-bordo rounded-xl shadow-lg p-1 z-30 cursor-default">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-tenue uppercase tracking-wide">Operatori liberi</p>
          {liberi.isPending ? (
            <p className="px-3 py-3 text-sm text-tenue flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden />Cerco…</p>
          ) : !liberi.data?.length ? (
            <p className="px-3 py-3 text-sm text-tenue">Nessun operatore libero in zona per quella data.</p>
          ) : liberi.data.map((op) => (
            <button key={op.id} disabled={proponi.isPending}
              onClick={() => proponi.mutate({ eventoId, operatoreId: op.id }, { onSuccess: () => setAperto(false) })}
              className="w-full h-11 px-3 rounded-lg flex items-center gap-2.5 text-sm text-left hover:bg-sfondo cursor-pointer disabled:opacity-50">
              <Avatar nome={nomeCompleto(op)} foto={op.foto} taglia="xs" />
              <span className="flex-1 truncate font-medium">{nomeCompleto(op)}</span>
              {proponi.isPending && proponi.variables?.operatoreId === op.id
                ? <Loader2 className="size-4 animate-spin" aria-hidden />
                : <span className="text-xs font-semibold text-accento-scuro">Proponi</span>}
            </button>
          ))}
          {proponi.error && <p className="px-3 py-2 text-sm text-urgente-testo">{(proponi.error as Error).message}</p>}
        </div>
      )}
    </div>
  )
}
