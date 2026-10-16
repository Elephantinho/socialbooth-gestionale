import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'

// Chat della squadra: canale di tutti + messaggi diretti. Aggiornata in tempo reale.

export const CANALE_SQUADRA = 'squadra'

/** Canale diretto tra due persone, sempre uguale chiunque lo apra */
export const canaleDiretto = (a: string, b: string) => `dm:${[a, b].sort().join(':')}`

/** L'altra persona di un canale diretto */
export const altroDelCanale = (canale: string, io: string) => canale.slice(3).split(':').find((x) => x !== io)

export function usePersone() {
  return useQuery({
    queryKey: ['squadra', 'persone'],
    queryFn: async () => ok(await supabase.rpc('persone_squadra')),
    staleTime: 60_000,
  })
}

export type Persona = NonNullable<ReturnType<typeof usePersone>['data']>[number]

export function useMessaggi(canale: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['squadra', 'messaggi', canale],
    queryFn: async () => {
      const righe = ok(await supabase.from('chat_messaggi').select('id, canale, autore_id, testo, creato_il')
        .eq('canale', canale).order('creato_il', { ascending: false }).limit(150))
      return righe.reverse()
    },
  })
  useEffect(() => {
    const ch = supabase.channel(`chat-${canale}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messaggi', filter: `canale=eq.${canale}` },
        () => qc.invalidateQueries({ queryKey: ['squadra', 'messaggi', canale] }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, canale])
  return query
}

export function useInviaMessaggio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { canale: string; testo: string }) =>
      ok(await supabase.from('chat_messaggi').insert({ canale: v.canale, testo: v.testo.trim() })),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['squadra', 'messaggi', v.canale] })
      qc.invalidateQueries({ queryKey: ['squadra', 'non-letti'] })
    },
  })
}

/** Non letti per canale; si aggiorna a ogni messaggio nuovo */
export function useNonLetti() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['squadra', 'non-letti'],
    queryFn: async () => ok(await supabase.rpc('chat_non_letti')),
  })
  useEffect(() => {
    const ch = supabase.channel(`chat-nuovi-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messaggi' },
        () => qc.invalidateQueries({ queryKey: ['squadra', 'non-letti'] }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])
  return query
}

export function useSegnaLetto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (canale: string) =>
      ok(await supabase.from('chat_letture').upsert({ canale, letto_il: new Date().toISOString() }, { onConflict: 'utente_id,canale' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['squadra', 'non-letti'] }),
  })
}
