import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useInviaMessaggio, useMessaggi } from '../api'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Caricamento } from '@/shared/ui/Stati'

/** Chat dell'evento tra project/admin e operatore, in tempo reale */
export function ChatEvento({ eventoId }: { eventoId: string }) {
  const profilo = useProfilo()
  const { data, isPending } = useMessaggi(eventoId)
  const invia = useInviaMessaggio()
  const [testo, setTesto] = useState('')
  const fondo = useRef<HTMLDivElement>(null)

  useEffect(() => { fondo.current?.scrollTo({ top: fondo.current.scrollHeight, behavior: 'smooth' }) }, [data?.length])

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-bordo flex items-center gap-2">
        <MessageCircle className="size-4 text-accento" aria-hidden />
        <TitoloSezione className="text-[15px]">Messaggi</TitoloSezione>
      </div>
      <div ref={fondo} className="max-h-80 min-h-28 overflow-y-auto p-4 flex flex-col gap-3 bg-sfondo/50">
        {isPending ? <Caricamento className="py-4" /> : !data?.length ? (
          <p className="text-sm text-tenue text-center py-4">Nessun messaggio. Scrivi qui per domande o aggiornamenti sull'evento.</p>
        ) : data.map((m) => {
          const mio = m.autore_id === profilo.id
          return (
            <div key={m.id} className={cn('flex gap-2 items-end', mio && 'flex-row-reverse')}>
              {!mio && <Avatar nome={nomeCompleto(m.autore)} foto={m.autore?.foto} taglia="sm" />}
              <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2', mio ? 'bg-accento text-white rounded-br-md' : 'bg-superficie border border-bordo rounded-bl-md')}>
                {!mio && <p className="text-[11px] font-bold opacity-70">{nomeCompleto(m.autore)}</p>}
                <p className="text-sm whitespace-pre-line break-words">{m.testo}</p>
                <p className={cn('text-[10px] mt-0.5 text-right', mio ? 'text-white/70' : 'text-tenue')}>
                  {new Date(m.creato_il).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <form className="p-3 border-t border-bordo flex gap-2" onSubmit={(e) => {
        e.preventDefault()
        if (!testo.trim()) return
        invia.mutate({ eventoId, testo }, { onSuccess: () => setTesto('') })
      }}>
        <label className="sr-only" htmlFor={`chat-${eventoId}`}>Scrivi un messaggio</label>
        <input id={`chat-${eventoId}`} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Scrivi un messaggio…"
          className="flex-1 min-w-0 h-11 rounded-xl border border-bordo-forte px-3.5 text-[15px] focus:outline-none focus:border-accento" />
        <button type="submit" aria-label="Invia" disabled={!testo.trim() || invia.isPending}
          className="size-11 rounded-xl bg-accento text-white flex items-center justify-center cursor-pointer disabled:opacity-40">
          <Send className="size-4" aria-hidden />
        </button>
      </form>
    </Card>
  )
}
