import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Database, Inserimento } from '@/shared/types/database'

// Attività (to-do) generali o legate a un evento, assegnabili a chiunque.

const campi = `*, assegnato:profili!attivita_assegnato_a_fkey(id, nome, cognome, foto),
  evento:eventi(id, citta, allestimento_il, tipo_booth:tipi_booth(nome))`

export function useAttivita(filtro?: { eventoId?: string; assegnatoA?: string }) {
  return useQuery({
    queryKey: ['attivita', filtro?.eventoId ?? '', filtro?.assegnatoA ?? ''],
    queryFn: async () => {
      let q = supabase.from('attivita').select(campi).order('scadenza', { ascending: true, nullsFirst: false }).order('creato_il')
      if (filtro?.eventoId) q = q.eq('evento_id', filtro.eventoId)
      if (filtro?.assegnatoA) q = q.eq('assegnato_a', filtro.assegnatoA)
      return ok(await q)
    },
  })
}

export function useSalvaAttivita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: Inserimento<'attivita'>) =>
      a.id ? ok(await supabase.from('attivita').update(a).eq('id', a.id)) : ok(await supabase.from('attivita').insert(a)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}

export function useCambiaStatoAttivita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; stato: Database['public']['Enums']['stato_attivita'] }) =>
      ok(await supabase.from('attivita').update({ stato: v.stato }).eq('id', v.id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}

export function useEliminaAttivita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('attivita').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}
