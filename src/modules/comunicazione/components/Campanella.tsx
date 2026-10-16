import { AttivaNotifiche } from './AttivaNotifiche'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useNotifiche, useSegnaLette } from '../api'
import { cn } from '@/shared/lib/cn'

const quando = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'ora'
  if (min < 60) return `${min} min fa`
  if (min < 24 * 60) return `${Math.round(min / 60)} h fa`
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

/** Campanella con il numero di notifiche non lette e il pannello a tendina */
export function Campanella({ scura }: { scura?: boolean }) {
  const profilo = useProfilo()
  const { data } = useNotifiche(profilo.id)
  const segna = useSegnaLette()
  const naviga = useNavigate()
  const [aperta, setAperta] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const nonLette = (data ?? []).filter((n) => !n.letta).length

  useEffect(() => {
    if (!aperta) return
    const chiudi = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setAperta(false) }
    document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [aperta])

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setAperta((a) => !a)} aria-label={`Notifiche${nonLette ? `, ${nonLette} nuove` : ''}`} aria-expanded={aperta}
        className={cn('relative size-11 rounded-full flex items-center justify-center cursor-pointer transition',
          scura ? 'bg-scuro-2 text-white hover:bg-scuro-3' : 'bg-superficie border border-bordo hover:border-bordo-forte')}>
        <Bell className="size-5" aria-hidden />
        {nonLette > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-urgente text-white text-[11px] font-semibold flex items-center justify-center border-2 border-superficie">
            {nonLette > 9 ? '9+' : nonLette}
          </span>
        )}
      </button>

      <AnimatePresence>
        {aperta && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[min(360px,calc(100vw-32px))] max-h-[70vh] overflow-y-auto rounded-xl bg-superficie text-inchiostro border border-bordo shadow-[0_20px_50px_-20px_rgba(21,22,26,0.45)] z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bordo sticky top-0 bg-superficie">
              <p className="font-semibold">Notifiche</p>
              {nonLette > 0 && (
                <button onClick={() => segna.mutate({ utenteId: profilo.id })} className="text-xs font-semibold text-accento inline-flex items-center gap-1 cursor-pointer">
                  <CheckCheck className="size-4" aria-hidden /> Segna tutte lette
                </button>
              )}
            </div>
            <AttivaNotifiche modo="impostazione" className="m-3 rounded-lg" />
            {!data?.length ? (
              <p className="p-6 text-sm text-tenue text-center">Nessuna notifica per ora.</p>
            ) : data.map((n) => (
              <button key={n.id} onClick={() => {
                if (!n.letta) segna.mutate({ utenteId: profilo.id, id: n.id })
                setAperta(false)
                if (n.link) naviga(n.link)
              }} className={cn('w-full text-left px-4 py-3 flex gap-3 border-b border-bordo last:border-0 hover:bg-sfondo transition cursor-pointer', !n.letta && 'bg-accento-tenue/30')}>
                <span className={cn('size-2 rounded-full mt-1.5 shrink-0', n.letta ? 'bg-transparent' : 'bg-accento')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{n.titolo}</span>
                  {n.testo && <span className="block text-sm text-tenue truncate">{n.testo}</span>}
                </span>
                <span className="text-[11px] text-tenue whitespace-nowrap">{quando(n.creata_il)}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
