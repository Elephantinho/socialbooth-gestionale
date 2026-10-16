import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, SendHorizontal, Users } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { etichettaRuolo } from '@/modules/auth/permessi'
import { CANALE_SQUADRA, canaleDiretto, useInviaMessaggio, useMessaggi, useNonLetti, usePersone, useSegnaLetto, type Persona } from '../api'
import { statoPresenza, useOnline } from '../presenza'
import { nomeCompleto, ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Caricamento } from '@/shared/ui/Stati'

/**
 * Chat della squadra: a sinistra le persone (chi è online in cima), a destra la conversazione.
 * Su telefono si vede una cosa alla volta. ?con=squadra oppure ?con=<id persona>.
 */
export function Squadra({ telefono }: { telefono?: boolean }) {
  const io = useProfilo()
  const [parametri, setParametri] = useSearchParams()
  const con = parametri.get('con')
  const persone = usePersone()
  const online = useOnline()
  const nonLetti = useNonLetti()
  const [cerca, setCerca] = useState('')

  const nonLettiDi = (canale: string) => Number(nonLetti.data?.find((x) => x.canale === canale)?.non_letti ?? 0)
  const ultimoDi = (canale: string) => nonLetti.data?.find((x) => x.canale === canale)?.ultimo ?? ''

  const altri = useMemo(() => (persone.data ?? []).filter((p) => p.id !== io.id)
    .filter((p) => `${p.nome} ${p.cognome} ${p.regioni.join(' ')}`.toLowerCase().includes(cerca.toLowerCase()))
    .sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id))
      || ultimoDi(canaleDiretto(io.id, b.id)).localeCompare(ultimoDi(canaleDiretto(io.id, a.id)))
      || a.nome.localeCompare(b.nome)),
  [persone.data, online, cerca, nonLetti.data, io.id])

  const scelta = con === CANALE_SQUADRA ? 'squadra' : (persone.data ?? []).find((p) => p.id === con)
  const apri = (id: string | null) => setParametri(id ? { con: id } : {}, { replace: false })
  const quantiOnline = (persone.data ?? []).filter((p) => p.id !== io.id && online.has(p.id)).length

  const elenco = (
    <aside className={cn('flex flex-col min-h-0 border-bordo', telefono ? '' : 'border-r w-[300px] shrink-0')}>
      <div className="p-3 border-b border-bordo">
        <label className="relative block">
          <span className="sr-only">Cerca una persona</span>
          <Search className="size-4 text-tenue absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per nome o regione"
            className="h-10 w-full rounded-md border border-bordo-forte bg-superficie pl-9 pr-3 text-sm" />
        </label>
      </div>
      <div className="overflow-y-auto flex-1">
        <RigaContatto attiva={scelta === 'squadra'} onClick={() => apri(CANALE_SQUADRA)} nonLetti={nonLettiDi(CANALE_SQUADRA)}
          icona={<span className="size-10 rounded-full bg-inchiostro text-white flex items-center justify-center"><Users className="size-5" aria-hidden /></span>}
          titolo="Tutta la squadra" sotto={`${quantiOnline} online adesso`} />
        {persone.isPending ? <Caricamento className="py-6" /> : altri.map((p) => (
          <RigaContatto key={p.id} attiva={typeof scelta === 'object' && scelta?.id === p.id} onClick={() => apri(p.id)}
            nonLetti={nonLettiDi(canaleDiretto(io.id, p.id))}
            icona={<AvatarPresenza p={p} online={online.has(p.id)} />}
            titolo={nomeCompleto(p)}
            sotto={`${etichettaRuolo(p.ruolo)}${p.regioni.length ? `, ${p.regioni.join(', ')}` : ''}`}
            stato={statoPresenza(online.has(p.id), p.visto_il)} online={online.has(p.id)} />
        ))}
      </div>
    </aside>
  )

  const conversazione = scelta ? (
    <Conversazione key={typeof scelta === 'object' ? scelta.id : 'squadra'} chi={scelta} persone={persone.data ?? []}
      online={typeof scelta === 'object' && online.has(scelta.id)} onIndietro={telefono ? () => apri(null) : undefined} />
  ) : (
    <div className="flex-1 flex items-center justify-center text-tenue p-8 text-center">
      Scegli una persona o scrivi a tutta la squadra.
    </div>
  )

  if (telefono) return <div className="flex flex-col h-[calc(100dvh-4.5rem)] bg-superficie">{scelta ? conversazione : elenco}</div>
  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[480px] rounded-[10px] border border-bordo bg-superficie overflow-hidden">
      {elenco}
      <section className="flex-1 min-w-0 flex flex-col">{conversazione}</section>
    </div>
  )
}

function AvatarPresenza({ p, online }: { p: Persona; online: boolean }) {
  return (
    <span className="relative">
      <Avatar nome={nomeCompleto(p)} foto={p.foto} />
      <span className={cn('absolute bottom-0 right-0 size-3 rounded-full border-2 border-superficie', online ? 'bg-[#1F9D55]' : 'bg-bordo-forte')}
        aria-label={online ? 'online' : 'offline'} />
    </span>
  )
}

function RigaContatto({ attiva, onClick, icona, titolo, sotto, stato, online, nonLetti }: {
  attiva: boolean; onClick: () => void; icona: React.ReactNode; titolo: string; sotto: string; stato?: string; online?: boolean; nonLetti: number
}) {
  return (
    <button onClick={onClick} aria-current={attiva || undefined}
      className={cn('w-full text-left px-3 py-2.5 flex items-center gap-3 cursor-pointer border-l-[3px]',
        attiva ? 'bg-accento-tenue border-accento' : 'border-transparent hover:bg-sfondo')}>
      {icona}
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold truncate">{titolo}</span>
          {stato && <span className={cn('text-xs whitespace-nowrap', online ? 'text-[#1F7A45] font-semibold' : 'text-tenue')}>{stato}</span>}
        </span>
        <span className="block text-xs text-tenue truncate">{sotto}</span>
      </span>
      {nonLetti > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-accento text-white text-[11px] font-semibold flex items-center justify-center">{nonLetti}</span>}
    </button>
  )
}

function Conversazione({ chi, persone, online, onIndietro }: { chi: Persona | 'squadra'; persone: Persona[]; online: boolean; onIndietro?: () => void }) {
  const io = useProfilo()
  const canale = chi === 'squadra' ? CANALE_SQUADRA : canaleDiretto(io.id, chi.id)
  const messaggi = useMessaggi(canale)
  const invia = useInviaMessaggio()
  const segna = useSegnaLetto()
  const [testo, setTesto] = useState('')
  const fondo = useRef<HTMLDivElement>(null)
  const nomeDi = (id: string) => nomeCompleto(persone.find((p) => p.id === id)) || 'Qualcuno'

  const ultimo = messaggi.data?.at(-1)?.id
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' })
    segna.mutate(canale)
  }, [ultimo, canale])

  function manda() {
    if (!testo.trim()) return
    invia.mutate({ canale, testo }, { onSuccess: () => setTesto('') })
  }

  return (
    <>
      <header className="h-16 px-4 border-b border-bordo flex items-center gap-3 shrink-0">
        {onIndietro && <button onClick={onIndietro} aria-label="Torna all'elenco" className="size-9 -ml-1 flex items-center justify-center cursor-pointer"><ArrowLeft className="size-5" aria-hidden /></button>}
        {chi === 'squadra'
          ? <span className="size-10 rounded-full bg-inchiostro text-white flex items-center justify-center"><Users className="size-5" aria-hidden /></span>
          : <AvatarPresenza p={chi} online={online} />}
        <div className="min-w-0">
          <p className="font-semibold truncate">{chi === 'squadra' ? 'Tutta la squadra' : nomeCompleto(chi)}</p>
          <p className={cn('text-xs', online ? 'text-[#1F7A45] font-semibold' : 'text-tenue')}>
            {chi === 'squadra' ? 'Lo leggono tutti: ufficio e operatori' : statoPresenza(online, chi.visto_il)}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1.5 bg-sfondo">
        {messaggi.isPending ? <Caricamento /> : !messaggi.data?.length ? (
          <p className="m-auto text-sm text-tenue text-center max-w-xs">
            {chi === 'squadra' ? 'Ancora nessun messaggio. Scrivi qualcosa a tutti.' : `Scrivi a ${chi.nome}: riceve una notifica anche sul telefono.`}
          </p>
        ) : messaggi.data.map((m, i) => {
          const mio = m.autore_id === io.id
          const prima = messaggi.data[i - 1]
          const nuovoAutore = !prima || prima.autore_id !== m.autore_id
          return (
            <div key={m.id} className={cn('flex flex-col max-w-[78%]', mio ? 'self-end items-end' : 'self-start items-start', nuovoAutore && i > 0 && 'mt-2')}>
              {chi === 'squadra' && !mio && nuovoAutore && <span className="text-xs font-semibold text-tenue mb-0.5 px-1">{nomeDi(m.autore_id)}</span>}
              <p className={cn('px-3 py-2 text-[15px] leading-snug whitespace-pre-line break-words rounded-lg',
                mio ? 'bg-accento text-white rounded-br-sm' : 'bg-superficie border border-bordo rounded-bl-sm')}>
                {m.testo}
                <span className={cn('ml-2 text-[11px] align-bottom', mio ? 'text-white/70' : 'text-tenue')}>{ora(m.creato_il)}</span>
              </p>
            </div>
          )
        })}
        <div ref={fondo} />
      </div>

      <form className="p-3 border-t border-bordo flex items-end gap-2 shrink-0 bg-superficie" onSubmit={(e) => { e.preventDefault(); manda() }}>
        <label className="flex-1">
          <span className="sr-only">Messaggio</span>
          <textarea value={testo} onChange={(e) => setTesto(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !telefonoTouch()) { e.preventDefault(); manda() } }}
            placeholder="Scrivi un messaggio"
            className="w-full max-h-32 min-h-11 rounded-md border border-bordo-forte bg-superficie px-3 py-2.5 text-[15px] resize-none" />
        </label>
        <button type="submit" disabled={!testo.trim() || invia.isPending} aria-label="Invia"
          className="size-11 rounded-md bg-accento text-white flex items-center justify-center cursor-pointer disabled:opacity-40">
          <SendHorizontal className="size-5" aria-hidden />
        </button>
      </form>
    </>
  )
}

const telefonoTouch = () => window.matchMedia('(pointer: coarse)').matches
