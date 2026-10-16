import { useState } from 'react'
import { Check, Hand, Undo2, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { etichettaRuolo } from '@/modules/auth/permessi'
import { useAggiornaRichiesta, type Richiesta } from '../api'
import { ETICHETTA_STATO } from '../logic/modelli'
import { dataBreve, nomeCompleto, traQuanto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Pulsante } from '@/shared/ui/Pulsante'

const coloreStato: Record<Richiesta['stato'], string> = {
  aperta: 'bg-urgente-tenue text-urgente-testo',
  in_corso: 'bg-avviso text-avviso-testo',
  fatta: 'bg-accento-tenue text-accento-scuro',
  annullata: 'bg-sfondo text-tenue',
}

/** È per me? (a me, al mio ruolo, o sono l'admin e non è mia) */
export function perMe(r: Richiesta, io: { id: string; ruolo: string }) {
  if (r.da_id === io.id) return false
  return r.per_utente === io.id || r.per_ruolo === io.ruolo || (io.ruolo === 'admin' && !r.per_utente)
}

export function ListaRichieste({ richieste, vuoto }: { richieste: Richiesta[]; vuoto: string }) {
  if (!richieste.length) return <p className="text-sm text-tenue py-6">{vuoto}</p>
  return (
    <ul className="divide-y divide-bordo border-y border-bordo">
      {richieste.map((r) => <RigaRichiesta key={r.id} r={r} />)}
    </ul>
  )
}

function RigaRichiesta({ r }: { r: Richiesta }) {
  const io = useProfilo()
  const aggiorna = useAggiornaRichiesta()
  const [nota, setNota] = useState('')
  const [chiudi, setChiudi] = useState(false)
  const mia = r.da_id === io.id
  const toccaAMe = perMe(r, io)
  const aperta = r.stato === 'aperta' || r.stato === 'in_corso'

  const cambia = (stato: Richiesta['stato'], extra: { preso_da?: string; nota_chiusura?: string | null; chiuso_il?: null } = {}) =>
    aggiorna.mutate({ id: r.id, modifiche: { stato, ...extra } }, { onSuccess: () => { setChiudi(false); setNota('') } })

  const destinatario = r.per ? nomeCompleto(r.per) : r.per_ruolo ? etichettaRuolo(r.per_ruolo) : ''
  const dove = [r.operatore && !mia ? `per ${nomeCompleto(r.operatore)}` : '', r.magazzino ? `${r.magazzino.nome}` : '',
    r.evento ? `evento del ${dataBreve(r.evento.allestimento_il)} a ${r.evento.citta}` : ''].filter(Boolean).join(', ')

  return (
    <li id={`richiesta-${r.id}`} className="py-4 flex flex-col gap-2 scroll-mt-24">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', coloreStato[r.stato])}>{ETICHETTA_STATO[r.stato]}</span>
        <p className="font-semibold flex-1 min-w-48">{r.titolo}</p>
        <span className="text-xs text-tenue whitespace-nowrap">{traQuanto(r.creato_il)}</span>
      </div>
      {r.dettagli && <p className="text-[15px] whitespace-pre-line">{r.dettagli}</p>}
      <p className="text-sm text-tenue">
        {mia ? `Hai chiesto a ${destinatario}` : `Da ${r.da ? nomeCompleto(r.da) : 'l’ufficio'} a ${destinatario}`}
        {dove && `, ${dove}`}
        {r.quantita ? `. ${r.quantita} stampe` : ''}
        {r.preso && r.stato === 'in_corso' && `. Se ne occupa ${nomeCompleto(r.preso)}`}
        {r.nota_chiusura && `. Nota: ${r.nota_chiusura}`}
      </p>

      {aperta && (toccaAMe || mia) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {toccaAMe && r.stato === 'aperta' && (
            <Pulsante variante="secondario" icona={<Hand className="size-4" aria-hidden />} caricamento={aggiorna.isPending}
              onClick={() => cambia('in_corso', { preso_da: io.id })}>Me ne occupo io</Pulsante>
          )}
          {toccaAMe && (
            <Pulsante icona={<Check className="size-4" aria-hidden />} onClick={() => setChiudi((c) => !c)}>Fatto</Pulsante>
          )}
          {mia && (
            <Pulsante variante="fantasma" icona={<X className="size-4" aria-hidden />} caricamento={aggiorna.isPending}
              onClick={() => confirm('Annullare la richiesta?') && cambia('annullata')}>Annulla</Pulsante>
          )}
        </div>
      )}
      {!aperta && mia && (
        <div><Pulsante variante="fantasma" icona={<Undo2 className="size-4" aria-hidden />} onClick={() => cambia('aperta', { chiuso_il: null })}>Riapri</Pulsante></div>
      )}
      {chiudi && (
        <form className="flex flex-wrap gap-2 items-center" onSubmit={(e) => { e.preventDefault(); cambia('fatta', { nota_chiusura: nota.trim() || null }) }}>
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (facoltativa): es. spedita con corriere"
            className="h-10 flex-1 min-w-56 rounded-lg border border-bordo-forte bg-superficie px-3 text-sm" />
          <Pulsante type="submit" caricamento={aggiorna.isPending}>Segna come fatta</Pulsante>
          {r.tipo === 'carta' && r.operatore_id && r.quantita ? <span className="w-full text-xs text-tenue">La ricarica di {r.quantita} stampe si registra da sola.</span> : null}
        </form>
      )}
    </li>
  )
}
