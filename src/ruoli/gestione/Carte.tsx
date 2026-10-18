import { useState } from 'react'
import { CreditCard, Plus } from 'lucide-react'
import { useOperatori } from '@/modules/anagrafiche/api'
import { useCarte, useEventiVicini, usePagamentiDaControllare, useSalvaCarta, useSistemaPagamento } from '@/modules/conti/api'
import { euro } from '@/modules/conti/conti'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/**
 * Carte aziendali: a chi è data ogni carta (le ultime 4 cifre bastano per riconoscere i pagamenti)
 * e i pagamenti arrivati dalla banca che non si sono abbinati da soli.
 */
export function Carte() {
  const pagamenti = usePagamentiDaControllare()
  const n = pagamenti.data?.length ?? 0
  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Carte aziendali" />

      <Card tono="scuro" className="p-4 md:p-5 text-[15px] leading-relaxed">
        <p className="font-semibold">Come funziona</p>
        <p className="text-tenue mt-1">
          Ogni operatore ha la sua carta. Quando paga, il pagamento arriva da Revolut e si abbina da solo: dalle ultime 4 cifre si capisce chi è,
          dal giorno su quale evento lavorava (solo se quel giorno aveva un evento, altrimenti finisce tra quelli da controllare), dal negozio che spesa è (benzina, autostrada, bar…). Diventa una spesa di quell'evento.
        </p>
        <p className="text-tenue mt-2"><span className="font-semibold text-avviso-testo">Collegamento con Revolut non ancora attivo</span>: finché non lo è, le spese con la carta le segna l'operatore dall'app.</p>
      </Card>

      <ElencoCarte />

      <section className="flex flex-col gap-3">
        <TitoloSezione className="flex items-center gap-2">
          Pagamenti da controllare {n > 0 && <span className="text-xs bg-urgente text-white rounded-full px-2 py-0.5">{n}</span>}
        </TitoloSezione>
        <Pagamenti />
      </section>
    </div>
  )
}

function ElencoCarte() {
  const carte = useCarte()
  const operatori = useOperatori()
  const salva = useSalvaCarta()
  const [nuova, setNuova] = useState(false)
  const [cifre, setCifre] = useState('')
  const [operatore, setOperatore] = useState('')
  const attivi = (operatori.data ?? []).filter((o) => o.attivo)
  const cifreOk = /^\d{4}$/.test(cifre)

  if (carte.isPending) return <Caricamento />
  if (carte.error) return <Errore errore={carte.error} />

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <TitoloSezione>Le carte, {carte.data.length}</TitoloSezione>
        {!nuova && <Pulsante onClick={() => setNuova(true)}><Plus className="size-4" aria-hidden /> Aggiungi carta</Pulsante>}
      </div>

      {nuova && (
        <Card className="p-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-tenue">Ultime 4 cifre</span>
            <input value={cifre} onChange={(e) => setCifre(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="4037"
              className="h-11 w-28 rounded-lg border border-bordo-forte px-3 text-lg font-semibold tabular-nums tracking-widest" />
          </label>
          <label className="flex flex-col gap-1.5 flex-1 min-w-56">
            <span className="text-[13px] font-semibold text-tenue">Data a</span>
            <select value={operatore} onChange={(e) => setOperatore(e.target.value)} className="h-11 rounded-lg border border-bordo-forte bg-superficie px-3">
              <option value="">Nessuno per ora</option>
              {attivi.map((o) => <option key={o.id} value={o.id}>{nomeCompleto(o)}</option>)}
            </select>
          </label>
          <Pulsante variante="secondario" onClick={() => setNuova(false)}>Annulla</Pulsante>
          <Pulsante disabled={!cifreOk} caricamento={salva.isPending}
            onClick={() => salva.mutate({ ultime_cifre: cifre, operatore_id: operatore || null, attiva: true }, { onSuccess: () => { setNuova(false); setCifre(''); setOperatore('') } })}>
            Salva carta
          </Pulsante>
          <p className="basis-full text-xs text-tenue">Solo le ultime 4 cifre: il numero intero della carta non serve e non va scritto da nessuna parte.</p>
        </Card>
      )}
      {salva.error && <Errore errore={salva.error} />}

      {carte.data.length === 0 ? (
        <Card className="p-6 text-tenue">Nessuna carta. Aggiungi le carte Revolut degli operatori con le ultime 4 cifre.</Card>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {carte.data.map((c) => (
            <Card key={c.id} className={cn('p-4 flex flex-col gap-3', !c.attiva && 'opacity-60')}>
              <div className="flex items-center gap-3">
                <span className="size-11 rounded-lg bg-inchiostro text-white flex items-center justify-center"><CreditCard className="size-5" aria-hidden /></span>
                <div className="flex-1">
                  <p className="text-lg font-semibold tabular-nums tracking-wider">•••• {c.ultime_cifre}</p>
                  <p className="text-xs text-tenue">{c.nome ?? 'Carta'}{c.attiva ? '' : ', disattivata'}</p>
                </div>
              </div>
              <select value={c.operatore_id ?? ''} aria-label="Operatore della carta"
                onChange={(e) => salva.mutate({ id: c.id, ultime_cifre: c.ultime_cifre, operatore_id: e.target.value || null, attiva: c.attiva })}
                className={cn('h-11 rounded-lg border bg-superficie px-3 font-medium', c.operatore_id ? 'border-bordo-forte' : 'border-urgente text-urgente-testo')}>
                <option value="">Non assegnata</option>
                {/* l'operatore della carta resta visibile anche se non è più attivo */}
                {c.operatore && !attivi.some((o) => o.id === c.operatore_id) && <option value={c.operatore.id}>{nomeCompleto(c.operatore)} (non attivo)</option>}
                {attivi.map((o) => <option key={o.id} value={o.id}>{nomeCompleto(o)}</option>)}
              </select>
              <button onClick={() => salva.mutate({ id: c.id, ultime_cifre: c.ultime_cifre, operatore_id: c.operatore_id, attiva: !c.attiva })}
                className="text-sm font-semibold text-tenue hover:text-inchiostro self-start cursor-pointer">
                {c.attiva ? 'Disattiva (persa o restituita)' : 'Riattiva'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function Pagamenti() {
  const { data, isPending, error } = usePagamentiDaControllare()
  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />
  if (!data.length) return <Card className="p-5 text-tenue">Niente da controllare: tutti i pagamenti si sono abbinati da soli.</Card>
  return (
    <Card className="overflow-visible">
      <ul className="divide-y divide-bordo">
        {data.map((p) => <Pagamento key={p.id} p={p} />)}
      </ul>
    </Card>
  )
}

function Pagamento({ p }: { p: NonNullable<ReturnType<typeof usePagamentiDaControllare>['data']>[number] }) {
  const [evento, setEvento] = useState('')
  const vicini = useEventiVicini(p.pagato_il, p.operatore?.id ?? null)
  const sistema = useSistemaPagamento()
  return (
    <li className="px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex-1 min-w-56">
        <p className="font-semibold">{p.esercente ?? 'Pagamento'} <span className="tabular-nums">{euro(p.importo)}</span></p>
        <p className="text-sm text-tenue">
          {new Date(p.pagato_il).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {p.carta_ultime ? `, carta •••• ${p.carta_ultime}` : ''}{p.operatore ? `, ${nomeCompleto(p.operatore)}` : ''}
        </p>
        {p.motivo && <p className="text-sm font-semibold text-avviso-testo mt-0.5">{p.motivo}</p>}
      </div>
      {p.importo > 0 && (
        <select value={evento} onChange={(e) => setEvento(e.target.value)} aria-label="Evento" className="h-10 rounded-lg border border-bordo-forte bg-superficie px-3 text-sm max-w-72">
          <option value="">Di quale evento è?</option>
          {(vicini.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>{new Date(e.allestimento_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}, {nomeEvento(e)}, {e.citta}</option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        {p.importo > 0 && <Pulsante disabled={!evento} caricamento={sistema.isPending && !!sistema.variables?.eventoId} onClick={() => sistema.mutate({ id: p.id, eventoId: evento })}>Abbina</Pulsante>}
        <Pulsante variante="secondario" caricamento={sistema.isPending && !sistema.variables?.eventoId} onClick={() => sistema.mutate({ id: p.id })}>Non è di un evento</Pulsante>
      </div>
      {sistema.error && <div className="basis-full"><Errore errore={sistema.error} /></div>}
    </li>
  )
}
