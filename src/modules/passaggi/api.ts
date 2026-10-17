import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Passaggio } from './passaggi'

/** Passaggi validi di un evento, in ordine. Si aggiornano da soli quando l'operatore ne segna uno. */
export function usePassaggi(eventoId: string) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!eventoId) return
    const canale = supabase.channel(`passaggi-${eventoId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'passaggi_evento', filter: `evento_id=eq.${eventoId}` },
        () => qc.invalidateQueries({ queryKey: ['passaggi', eventoId] }))
      .subscribe()
    return () => { supabase.removeChannel(canale) }
  }, [eventoId, qc])

  return useQuery({
    queryKey: ['passaggi', eventoId],
    enabled: !!eventoId,
    queryFn: async () =>
      ok(await supabase.from('passaggi_evento').select('passaggio, fatto_il')
        .eq('evento_id', eventoId).is('annullato_il', null).order('passaggio')),
  })
}

function useAggiorna() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['passaggi'] }), qc.invalidateQueries({ queryKey: ['eventi'] })])
}

export function useSegnaPassaggio() {
  const aggiorna = useAggiorna()
  return useMutation({
    mutationFn: async (v: { eventoId: string; passaggio: Passaggio }) =>
      ok(await supabase.rpc('segna_passaggio', { p_evento: v.eventoId, p_passaggio: v.passaggio })),
    onSuccess: aggiorna,
  })
}

export function useAnnullaPassaggio() {
  const aggiorna = useAggiorna()
  return useMutation({
    mutationFn: async (eventoId: string) => ok(await supabase.rpc('annulla_passaggio', { p_evento: eventoId })),
    onSuccess: aggiorna,
  })
}
