import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Inserimento } from '@/shared/types/database'

// Tutte le letture/scritture degli eventi passano da qui.
// Le pagine usano questi hook e non chiamano mai Supabase direttamente.

const chiavi = {
  tutti: ['eventi'] as const,
  operatore: (id: string) => ['eventi', 'operatore', id] as const,
  proposte: (id: string) => ['eventi', 'proposte', id] as const,
  dettaglio: (id: string) => ['eventi', 'dettaglio', id] as const,
  gestione: ['eventi', 'gestione'] as const,
  disponibili: (id: string) => ['eventi', 'disponibili', id] as const,
}

const campiEvento = '*, tipo_booth:tipi_booth(nome), magazzino:magazzini(nome, indirizzo)'

/** Eventi confermati o in corso dell'operatore, dal più vicino. */
export function useEventiOperatore(operatoreId: string) {
  return useQuery({
    queryKey: chiavi.operatore(operatoreId),
    queryFn: async () =>
      ok(await supabase.from('eventi').select(campiEvento)
        .eq('operatore_id', operatoreId)
        .in('stato', ['confermato', 'in_corso'])
        .gte('smontaggio_il', new Date().toISOString())
        .order('allestimento_il')),
  })
}

/** Incarichi proposti all'operatore che aspettano una risposta. */
export function useProposteInAttesa(operatoreId: string) {
  return useQuery({
    queryKey: chiavi.proposte(operatoreId),
    queryFn: async () =>
      ok(await supabase.from('proposte')
        .select(`id, scade_il, automatica, evento:eventi(${campiEvento})`)
        .eq('operatore_id', operatoreId)
        .eq('stato', 'in_attesa')
        .order('creato_il')),
  })
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: chiavi.dettaglio(id),
    queryFn: async () => ok(await supabase.from('eventi').select(campiEvento).eq('id', id).single()),
  })
}

/** Elenco per project e admin (la sicurezza del database filtra cosa vede ciascuno). */
export function useEventiGestione() {
  return useQuery({
    queryKey: chiavi.gestione,
    queryFn: async () =>
      ok(await supabase.from('eventi')
        .select('*, tipo_booth:tipi_booth(nome), cliente:clienti(nome), operatore:profili!eventi_operatore_id_fkey(nome)')
        .neq('stato', 'annullato')
        .order('allestimento_il')),
  })
}

export function useOperatoriDisponibili(eventoId: string | undefined) {
  return useQuery({
    queryKey: chiavi.disponibili(eventoId ?? ''),
    enabled: !!eventoId,
    queryFn: async () => ok(await supabase.rpc('operatori_disponibili', { p_evento: eventoId! })),
  })
}

export function useCreaEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (evento: Inserimento<'eventi'>) => {
      const { id } = ok(await supabase.from('eventi').insert(evento).select('id').single())
      // Riletto dopo l'inserimento: l'assegnazione automatica avviene nel database subito dopo
      return ok(await supabase.from('eventi').select('id, stato, operatore_id').eq('id', id).single())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chiavi.tutti }),
  })
}

export function useRispondiProposta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { propostaId: string; accetta: boolean }) =>
      ok(await supabase.rpc('rispondi_proposta', { p_proposta: v.propostaId, p_accetta: v.accetta })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chiavi.tutti }),
  })
}

export function useProponiOperatore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; operatoreId: string }) =>
      ok(await supabase.rpc('proponi_operatore', { p_evento: v.eventoId, p_operatore: v.operatoreId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chiavi.tutti }),
  })
}

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; lat: number; lng: number }) =>
      ok(await supabase.rpc('check_in', { p_evento: v.eventoId, p_lat: v.lat, p_lng: v.lng })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chiavi.tutti }),
  })
}

/** Ore e compenso dell'operatore nel mese corrente (tutte, anche in attesa di approvazione). */
export function useMeseOperatore(operatoreId: string) {
  return useQuery({
    queryKey: ['ore', 'mese', operatoreId],
    queryFn: async () => {
      const inizio = new Date()
      inizio.setDate(1); inizio.setHours(0, 0, 0, 0)
      const righe = ok(await supabase.from('ore_lavorate')
        .select('minuti_totali, compenso, creato_il')
        .eq('operatore_id', operatoreId)
        .gte('creato_il', inizio.toISOString()))
      return {
        eventi: righe.length,
        minuti: righe.reduce((s, r) => s + (r.minuti_totali ?? 0), 0),
        compenso: righe.reduce((s, r) => s + (r.compenso ?? 0), 0),
      }
    },
  })
}
