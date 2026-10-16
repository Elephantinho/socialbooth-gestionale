import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'

// Chi è online adesso (presenza in tempo reale) e "visto alle…" salvato ogni due minuti.

const Contesto = createContext<Set<string>>(new Set())

export function PresenzaProvider({ utenteId, children }: { utenteId: string; children: React.ReactNode }) {
  const [online, setOnline] = useState<Set<string>>(new Set())

  useEffect(() => {
    const canale = supabase.channel('presenza', { config: { presence: { key: utenteId } } })
    canale
      .on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(canale.presenceState()))))
      .subscribe((stato) => { if (stato === 'SUBSCRIBED') canale.track({ dal: new Date().toISOString() }) })
    const segna = () => { if (document.visibilityState === 'visible') supabase.rpc('segna_visto').then(() => {}) }
    segna()
    const timer = setInterval(segna, 120_000)
    document.addEventListener('visibilitychange', segna)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', segna)
      supabase.removeChannel(canale)
    }
  }, [utenteId])

  return <Contesto.Provider value={online}>{children}</Contesto.Provider>
}

export const useOnline = () => useContext(Contesto)

/** "online", "visto 5 min fa", "visto ieri" */
export function statoPresenza(online: boolean, visto: string | null) {
  if (online) return 'online'
  if (!visto) return 'mai collegato'
  const min = Math.round((Date.now() - new Date(visto).getTime()) / 60_000)
  if (min < 60) return `visto ${Math.max(1, min)} min fa`
  const ore = Math.round(min / 60)
  if (ore < 24) return `visto ${ore} ${ore === 1 ? 'ora' : 'ore'} fa`
  const giorni = Math.round(ore / 24)
  return giorni === 1 ? 'visto ieri' : `visto ${giorni} giorni fa`
}
