import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, PackagePlus, Plus, Printer } from 'lucide-react'
import { useInviaRicarica, useScortaOperatore, useScorteVisibili, useSegnalaCarta } from '../api'
import { confezioniPer, daRicaricare, type LivelloCarta, type StatoCarta } from '../logic/scorta'
import { dataBreve, nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Campo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const stampe = (n: number) => `${n.toLocaleString('it-IT')} stamp${n === 1 ? 'a' : 'e'}`

const stili: Record<LivelloCarta, { badge: string; barra: string; testo: string }> = {
  finita: { badge: 'bg-urgente text-white', barra: 'bg-urgente', testo: 'Carta finita' },
  bassa: { badge: 'bg-urgente-tenue text-urgente-testo', barra: 'bg-urgente', testo: 'Carta in esaurimento' },
  ok: { badge: 'bg-accento-tenue text-accento-scuro', barra: 'bg-accento', testo: 'Carta ok' },
  da_impostare: { badge: 'bg-sfondo text-tenue border border-bordo', barra: 'bg-bordo-forte', testo: 'Scorta da impostare' },
}

/** Etichetta colorata: verde ok, rossa quando sta finendo o è finita */
export function BadgeCarta({ stato, compatto }: { stato: Pick<StatoCarta, 'livello' | 'disponibili'>; compatto?: boolean }) {
  const s = stili[stato.livello]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap', compatto ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1', s.badge)}
      title={`${s.testo}: ${stampe(stato.disponibili)}`}>
      <Printer className="size-3.5" aria-hidden />
      {compatto ? stato.disponibili.toLocaleString('it-IT') : `${s.testo}, ${stampe(stato.disponibili)}`}
    </span>
  )
}

/** Barra di riempimento rispetto a una confezione piena */
function BarraCarta({ stato, perConfezione }: { stato: StatoCarta; perConfezione: number }) {
  const pieno = Math.max(perConfezione, stato.fabbisogno, stato.disponibili, 1)
  return (
    <div className="h-3 rounded-full bg-sfondo overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={pieno} aria-valuenow={stato.disponibili}
      aria-label="Carta disponibile">
      <motion.div className={cn('h-full rounded-full', stili[stato.livello].barra)} initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, (stato.disponibili / pieno) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  )
}

/** Modulo per mandare carta: si sceglie in confezioni, si registra in stampe */
export function InviaRicarica({ operatore, suggerite, perConfezione, onFatto }: {
  operatore: string; suggerite: number; perConfezione: number; onFatto?: () => void
}) {
  const [confezioni, setConfezioni] = useState(confezioniPer(suggerite, perConfezione))
  const [note, setNote] = useState('')
  const invia = useInviaRicarica()
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault()
      invia.mutate({ operatore, stampe: confezioni * perConfezione, note: note.trim() }, { onSuccess: () => onFatto?.() })
    }}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Confezioni</span>
        <div className="flex items-center rounded-lg border border-bordo-forte bg-superficie">
          <button type="button" aria-label="Una confezione in meno" className="size-10 grid place-items-center cursor-pointer disabled:opacity-40"
            disabled={confezioni <= 1} onClick={() => setConfezioni((c) => Math.max(1, c - 1))}><Minus className="size-4" /></button>
          <span className="w-8 text-center font-semibold tabular-nums">{confezioni}</span>
          <button type="button" aria-label="Una confezione in più" className="size-10 grid place-items-center cursor-pointer"
            onClick={() => setConfezioni((c) => c + 1)}><Plus className="size-4" /></button>
        </div>
        <span className="text-sm text-tenue">= {stampe(confezioni * perConfezione)}</span>
      </div>
      <Campo etichetta="Nota (facoltativa)" placeholder="Es. spedita con corriere, ritiro in magazzino…" value={note} onChange={(e) => setNote(e.target.value)} />
      {invia.error && <p className="text-sm text-urgente-testo font-semibold">{invia.error.message}</p>}
      <Pulsante type="submit" icona={<PackagePlus className="size-4" />} caricamento={invia.isPending}>Registra ricarica</Pulsante>
    </form>
  )
}

/** Riquadro della Panoramica: chi sta finendo la carta, con il tasto per mandarla */
export function AvvisiCarta() {
  const { data, isPending, error, parametri } = useScorteVisibili()
  const [aperto, setAperto] = useState<string>()
  if (isPending) return null
  if (error) return <Errore errore={error} />
  const critici = (data ?? []).filter((o) => daRicaricare(o.livello))
  // In panoramica compare solo quando c'è da mandare carta a qualcuno
  if (!critici.length) return null

  return (
    <Card className={cn('p-5 flex flex-col gap-4', 'border-[#F2B8AE] border-2')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TitoloSezione>Carta degli operatori
        </TitoloSezione>
        <span className={cn('text-sm font-semibold', critici.length ? 'text-urgente-testo' : 'text-accento-scuro')}>
          {critici.length} da ricaricare
        </span>
      </div>
      {critici.length > 0 && (
        <ul className="flex flex-col divide-y divide-bordo">
          {critici.map((o) => (
            <li key={o.id} className="py-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar nome={nomeCompleto(o)} foto={o.foto} taglia="sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/gestione/operatori/${o.id}`} className="font-semibold hover:underline">{nomeCompleto(o)}</Link>
                  <p className="text-xs text-tenue">
                    {o.regioni.join(', ') || 'Nessuna regione'}
                    {o.prossimiEventi > 0 && `, ${o.prossimiEventi} event${o.prossimiEventi === 1 ? 'o' : 'i'} in arrivo (~${stampe(o.fabbisogno)})`}
                  </p>
                </div>
                <BadgeCarta stato={o} />
                <Pulsante variante={aperto === o.id ? 'secondario' : 'primario'} onClick={() => setAperto((a) => (a === o.id ? undefined : o.id))}>
                  {aperto === o.id ? 'Chiudi' : 'Invia ricarica'}
                </Pulsante>
              </div>
              <AnimatePresence initial={false}>
                {aperto === o.id && parametri && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-xl bg-sfondo p-4">
                      <InviaRicarica operatore={o.id} suggerite={o.daMandare} perConfezione={parametri.perConfezione} onFatto={() => setAperto(undefined)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const etichettaMovimento = { ricarica: 'Ricarica', consumo: 'Evento', correzione: 'Conteggio' } as const

/**
 * Scheda della carta di un operatore.
 * - gestione: ricarica e correzione
 * - operatore: vede quanta ne ha e può dire quante stampe gli restano davvero
 */
export function SchedaCarta({ operatore, modo }: { operatore: string; modo: 'gestione' | 'operatore' }) {
  const { data, isPending, error } = useScortaOperatore(operatore)
  const [azione, setAzione] = useState<'ricarica' | 'conta'>()
  const [contate, setContate] = useState('')
  const segnala = useSegnalaCarta()

  if (isPending) return <Card className="p-5"><Caricamento /></Card>
  if (error) return <Errore errore={error} />

  const rossa = daRicaricare(data.livello)
  return (
    <Card className={cn('p-5 flex flex-col gap-4', rossa && 'border border-[#F2B8AE]')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <TitoloSezione>Carta</TitoloSezione>
          <p className={cn('font-display text-3xl font-semibold mt-1', rossa ? 'text-urgente' : '')}>{stampe(data.disponibili)}</p>
          <p className="text-sm text-tenue">
            {data.prossimiEventi > 0
              ? `${data.prossimiEventi} event${data.prossimiEventi === 1 ? 'o' : 'i'} in arrivo, servono circa ${stampe(data.fabbisogno)}`
              : 'Nessun evento in arrivo'}
            {data.eventiCoperti != null && (data.eventiCoperti === 0
              ? ', non basta per un evento'
              : `, basta per ~${data.eventiCoperti} event${data.eventiCoperti === 1 ? 'o' : 'i'}`)}
          </p>
        </div>
        <BadgeCarta stato={data} />
      </div>
      <BarraCarta stato={data} perConfezione={data.parametri.perConfezione} />

      {modo === 'operatore' && rossa && (
        <p className="rounded-lg bg-urgente-tenue text-urgente-testo text-sm font-semibold px-3 py-2">
          Il project e l'amministrazione sono già stati avvisati: ti manderanno una ricarica.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {modo === 'gestione' && (
          <Pulsante variante={azione === 'ricarica' ? 'secondario' : 'primario'} icona={<PackagePlus className="size-4" />}
            onClick={() => setAzione((a) => (a === 'ricarica' ? undefined : 'ricarica'))}>Invia ricarica</Pulsante>
        )}
        <Pulsante variante="secondario" onClick={() => setAzione((a) => (a === 'conta' ? undefined : 'conta'))}>
          {modo === 'operatore' ? 'Ho contato la carta' : 'Correggi quantità'}
        </Pulsante>
      </div>

      {azione === 'ricarica' && (
        <div className="rounded-xl bg-sfondo p-4">
          <InviaRicarica operatore={operatore} suggerite={data.daMandare} perConfezione={data.parametri.perConfezione} onFatto={() => setAzione(undefined)} />
        </div>
      )}
      {azione === 'conta' && (
        <form className="rounded-xl bg-sfondo p-4 flex flex-wrap items-end gap-3" onSubmit={(e) => {
          e.preventDefault()
          const n = Number(contate)
          if (Number.isFinite(n) && n >= 0) segnala.mutate({ stampe: Math.round(n), operatore }, { onSuccess: () => { setAzione(undefined); setContate('') } })
        }}>
          <Campo className="flex-1 min-w-40" etichetta="Stampe che restano davvero" type="number" inputMode="numeric" min={0} required
            value={contate} onChange={(e) => setContate(e.target.value)} />
          <Pulsante type="submit" caricamento={segnala.isPending}>Salva</Pulsante>
          {segnala.error && <p className="w-full text-sm text-urgente-testo font-semibold">{segnala.error.message}</p>}
        </form>
      )}

      {data.movimenti.length > 0 && (
        <details className="group">
          <summary className="text-sm font-semibold text-tenue cursor-pointer select-none">Storico</summary>
          <ul className="mt-2 flex flex-col divide-y divide-bordo text-sm">
            {data.movimenti.map((m) => (
              <li key={m.id} className="py-2 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-semibold">{etichettaMovimento[m.tipo]}</span>
                  <span className="text-tenue">, {dataBreve(m.creato_il)}{m.evento ? `, ${m.evento.citta}` : ''}{m.note ? `, ${m.note}` : ''}</span>
                </span>
                <span className={cn('font-semibold tabular-nums whitespace-nowrap', m.tipo === 'ricarica' && 'text-accento', m.tipo === 'consumo' && 'text-urgente-testo')}>
                  {m.tipo === 'correzione' ? `= ${m.stampe}` : m.stampe > 0 ? `+${m.stampe}` : m.stampe}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}
