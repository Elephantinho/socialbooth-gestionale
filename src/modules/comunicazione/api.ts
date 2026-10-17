import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'

// Notifiche in-app.

export function useNotifiche(utenteId: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['notifiche', utenteId],
    queryFn: async () =>
      ok(await supabase.from('notifiche').select('*').eq('utente_id', utenteId).order('creata_il', { ascending: false }).limit(40)),
  })
  // Arrivano in tempo reale
  useEffect(() => {
    const canale = supabase.channel(`notifiche-${utenteId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifiche', filter: `utente_id=eq.${utenteId}` },
        () => qc.invalidateQueries({ queryKey: ['notifiche', utenteId] }))
      .subscribe()
    return () => { supabase.removeChannel(canale) }
  }, [qc, utenteId])
  return query
}

export function useSegnaLette() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { utenteId: string; id?: string }) => {
      let q = supabase.from('notifiche').update({ letta: true }).eq('utente_id', v.utenteId).eq('letta', false)
      if (v.id) q = q.eq('id', v.id)
      ok(await q)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifiche'] }),
  })
}
