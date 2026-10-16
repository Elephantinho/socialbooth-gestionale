import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Database, Inserimento } from '@/shared/types/database'

// Richieste tra persone e ruoli. Chi le vede lo decide il database (vedo_richiesta).

const campi = `*,
  da:profili!richieste_da_id_fkey(id, nome, cognome, foto, ruolo),
  per:profili!richieste_per_utente_fkey(id, nome, cognome),
  operatore:profili!richieste_operatore_id_fkey(id, nome, cognome),
  preso:profili!richieste_preso_da_fkey(nome, cognome),
  magazzino:magazzini(nome, citta),
  evento:eventi(id, citta, allestimento_il)`

export function useRichieste() {
  return useQuery({
    queryKey: ['richieste'],
    queryFn: async () => ok(await supabase.from('richieste').select(campi).order('creato_il', { ascending: false }).limit(200)),
  })
}

export type Richiesta = NonNullable<ReturnType<typeof useRichieste>['data']>[number]

export function useCreaRichiesta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (r: Inserimento<'richieste'>) => ok(await supabase.from('richieste').insert(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['richieste'] }),
  })
}

export function useAggiornaRichiesta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; modifiche: Database['public']['Tables']['richieste']['Update'] }) =>
      ok(await supabase.from('richieste').update(v.modifiche).eq('id', v.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['richieste'] })
      qc.invalidateQueries({ queryKey: ['carta'] })
    },
  })
}
