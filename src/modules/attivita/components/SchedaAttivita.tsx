import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Check, Trash2 } from 'lucide-react'
import { useCambiaStatoAttivita, useEliminaAttivita, useSalvaAttivita, type useAttivita } from '../api'
import { useUtenti } from '@/modules/anagrafiche/api'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { dataBreve, nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import type { Enum } from '@/shared/types/database'
import { Avatar } from '@/shared/ui/Avatar'
import { AreaTesto, Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'

export type Attivita = NonNullable<ReturnType<typeof useAttivita>['data']>[number]

export const PRIORITA: Record<Enum<'priorita'>, { etichetta: string; stile: string }> = {
  alta: { etichetta: 'Alta', stile: 'bg-urgente-tenue text-urgente-testo' },
  media: { etichetta: 'Media', stile: 'bg-avviso text-avviso-testo' },
  bassa: { etichetta: 'Bassa', stile: 'bg-sfondo text-tenue' },
}

const oggi = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })

/** Scheda di un'attività: titolo, priorità, scadenza, assegnatario, evento */
export function SchedaAttivita({ a, trascinabile, compatta }: { a: Attivita; trascinabile?: boolean; compatta?: boolean }) {
  const cambia = useCambiaStatoAttivita()
  const elimina = useEliminaAttivita()
  const base = useProfilo().ruolo === 'operatore' ? '/operatore' : '/gestione'
  const scaduta = a.scadenza && a.stato !== 'fatto' && a.scadenza < oggi()
  const fatta = a.stato === 'fatto'

  return (
    <div draggable={trascinabile} onDragStart={(e) => e.dataTransfer.setData('text/attivita', a.id)}
      className={cn('group rounded-2xl bg-superficie border border-bordo p-3.5 flex flex-col gap-2.5 transition hover:border-bordo-forte',
        trascinabile && 'cursor-grab active:cursor-grabbing', fatta && 'opacity-60')}>
      <div className="flex items-start gap-2.5">
        <button aria-label={fatta ? 'Segna da fare' : 'Segna fatta'} onClick={() => cambia.mutate({ id: a.id, stato: fatta ? 'da_fare' : 'fatto' })}
          className={cn('size-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition',
            fatta ? 'bg-accento border-accento text-white' : 'border-bordo-forte hover:border-accento')}>
          {fatta && <Check className="size-3.5" aria-hidden />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold text-sm leading-snug', fatta && 'line-through')}>{a.titolo}</p>
          {!compatta && a.descrizione && <p className="text-xs text-tenue mt-1 line-clamp-2">{a.descrizione}</p>}
        </div>
        {!compatta && base === '/gestione' && (
          <button aria-label="Elimina attività" onClick={() => confirm('Eliminare l\'attività?') && elimina.mutate(a.id)}
            className="size-7 rounded-md flex items-center justify-center text-tenue opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-sfondo cursor-pointer">
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-7">
        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-md', PRIORITA[a.priorita].stile)}>{PRIORITA[a.priorita].etichetta}</span>
        {a.scadenza && (
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1', scaduta ? 'bg-urgente text-white' : 'bg-sfondo text-tenue')}>
            <CalendarClock className="size-3" aria-hidden />{scaduta ? 'Scaduta ' : ''}{dataBreve(a.scadenza)}
          </span>
        )}
        {a.evento && (
          <Link to={`${base}/eventi/${a.evento.id}`} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-accento-tenue text-accento-scuro hover:underline truncate max-w-40">
            {a.evento.tipo_booth?.nome ?? 'Evento'} · {a.evento.citta}
          </Link>
        )}
        {a.assegnato && <span className="ml-auto" title={nomeCompleto(a.assegnato)}><Avatar nome={nomeCompleto(a.assegnato)} foto={a.assegnato.foto} taglia="sm" className="size-7 text-[10px]" /></span>}
      </div>
    </div>
  )
}

/** Modulo rapido per creare un'attività */
export function NuovaAttivita({ eventoId, onFatto }: { eventoId?: string; onFatto: () => void }) {
  const salva = useSalvaAttivita()
  const utenti = useUtenti()
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [assegnato, setAssegnato] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [priorita, setPriorita] = useState<Enum<'priorita'>>('media')

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault()
      salva.mutate({ titolo, descrizione: descrizione || null, assegnato_a: assegnato || null, scadenza: scadenza || null, priorita, evento_id: eventoId ?? null },
        { onSuccess: onFatto })
    }}>
      <Campo etichetta="Cosa c'è da fare" required autoFocus placeholder="Es. Stampare le grafiche del cliente" value={titolo} onChange={(e) => setTitolo(e.target.value)} />
      <AreaTesto etichetta="Dettagli (facoltativo)" rows={2} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <Selezione etichetta="Assegna a" value={assegnato} onChange={(e) => setAssegnato(e.target.value)}>
          <option value="">— Nessuno —</option>
          {utenti.data?.filter((u) => u.attivo).map((u) => <option key={u.id} value={u.id}>{nomeCompleto(u)} · {u.ruolo}</option>)}
        </Selezione>
        <Campo etichetta="Scadenza" type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} />
        <Selezione etichetta="Priorità" value={priorita} onChange={(e) => setPriorita(e.target.value as Enum<'priorita'>)}>
          <option value="alta">Alta</option><option value="media">Media</option><option value="bassa">Bassa</option>
        </Selezione>
      </div>
      {salva.error && <Errore errore={salva.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={salva.isPending}>Aggiungi</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}
