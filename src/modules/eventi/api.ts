import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Inserimento, Database } from '@/shared/types/database'

// Tutte le letture/scritture degli eventi passano da qui.
// Le pagine usano questi hook e non chiamano mai Supabase direttamente.

type AggiornamentoEvento = Database['public']['Tables']['eventi']['Update']

const chiavi = {
  tutti: ['eventi'] as const,
}

const campiEvento = '*, tipo_booth:tipi_booth(nome)'

/* ---------------- Lato operatore ---------------- */

/** Eventi confermati o in corso dell'operatore, dal più vicino. */
export function useEventiOperatore(operatoreId: string) {
  return useQuery({
    queryKey: ['eventi', 'operatore', operatoreId],
    queryFn: async () =>
      ok(await supabase.from('eventi').select(campiEvento)
        .eq('operatore_id', operatoreId)
        .in('stato', ['confermato', 'in_corso'])
        .gte('smontaggio_il', new Date(Date.now() - 12 * 3_600_000).toISOString())
        .order('allestimento_il')),
  })
}

/** Tutti gli eventi dell'operatore (calendario e storico). */
export function useCalendarioOperatore(operatoreId: string) {
  return useQuery({
    queryKey: ['eventi', 'calendario', operatoreId],
    queryFn: async () =>
      ok(await supabase.from('eventi').select(campiEvento)
        .eq('operatore_id', operatoreId)
        .in('stato', ['confermato', 'in_corso', 'completato'])
        .order('allestimento_il', { ascending: false })
        .limit(200)),
  })
}

/** Incarichi proposti all'operatore che aspettano una risposta. */
export function useProposteInAttesa(operatoreId: string) {
  return useQuery({
    queryKey: ['eventi', 'proposte', operatoreId],
    queryFn: async () =>
      ok(await supabase.from('proposte')
        .select(`id, scade_il, automatica, evento:eventi!inner(${campiEvento})`)
        .eq('operatore_id', operatoreId)
        .eq('stato', 'in_attesa')
        .eq('evento.stato', 'proposto')
        .order('creato_il')),
  })
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: ['eventi', 'dettaglio', id],
    queryFn: async () => ok(await supabase.from('eventi').select(campiEvento).eq('id', id).single()),
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

/* ---------------- Lato gestione (project / admin) ---------------- */

const campiGestione = '*, tipo_booth:tipi_booth(nome), operatore:profili!eventi_operatore_id_fkey(id, nome, cognome, foto), project:profili!eventi_project_id_fkey(id, nome, cognome)'
const BLOCCO = 1000 // il database ne restituisce al massimo 1000 per volta

/** Legge a blocchi finché ce ne sono: con tanti eventi non se ne perde nessuno. */
async function aBlocchi<T>(pagina: (da: number, a: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const tutti: T[] = []
  for (let da = 0; ; da += BLOCCO) {
    const parte = ok(await pagina(da, da + BLOCCO - 1)) as T[]
    tutti.push(...parte)
    if (parte.length < BLOCCO) return tutti
  }
}

/**
 * Eventi in programma (il database filtra quelli di ciascun ruolo): da ieri in avanti,
 * più quelli confermati o in corso rimasti aperti, che vanno chiusi.
 */
export function useEventiInProgramma() {
  return useQuery({
    queryKey: ['eventi', 'gestione', 'programma'],
    queryFn: () => {
      const da = new Date(Date.now() - 2 * 86_400_000).toISOString()
      return aBlocchi((x, y) => supabase.from('eventi').select(campiGestione)
        .or(`smontaggio_il.gte.${da},stato.in.(confermato,in_corso)`)
        .order('allestimento_il').order('id').range(x, y))
    },
  })
}

/** Archivio: un mese intero se scelto, altrimenti gli ultimi 500 eventi conclusi. */
export function useArchivio(mese?: string) {
  return useQuery({
    queryKey: ['eventi', 'gestione', 'archivio', mese ?? ''],
    queryFn: async () => {
      let q = supabase.from('eventi').select(campiGestione)
        .or(`smontaggio_il.lt.${new Date().toISOString()},stato.in.(completato,annullato)`)
      if (mese) {
        const [a, m] = mese.split('-').map(Number)
        q = q.gte('allestimento_il', new Date(a, m - 1, 1).toISOString()).lt('allestimento_il', new Date(a, m, 1).toISOString())
        return aBlocchi((x, y) => q.order('allestimento_il', { ascending: false }).order('id').range(x, y))
      }
      return ok(await q.order('allestimento_il', { ascending: false }).limit(500))
    },
  })
}

/** Eventi che cadono tra due date (calendario) */
export function useEventiPeriodo(dal: Date, al: Date) {
  return useQuery({
    queryKey: ['eventi', 'gestione', 'periodo', dal.toISOString(), al.toISOString()],
    queryFn: () => aBlocchi((x, y) => supabase.from('eventi').select(campiGestione)
      .gte('allestimento_il', dal.toISOString()).lt('allestimento_il', al.toISOString())
      .order('allestimento_il').order('id').range(x, y)),
  })
}

export function useConcludiEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.rpc('concludi_evento', { p_evento: id })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chiavi.tutti }),
  })
}

/** Evento completo per la pagina di dettaglio in gestione. */
export function useEventoGestione(id: string) {
  return useQuery({
    queryKey: ['eventi', 'gestione', id],
    enabled: !!id,
    queryFn: async () =>
      ok(await supabase.from('eventi')
        .select(`*, tipo_booth:tipi_booth(nome),
          operatore:profili!eventi_operatore_id_fkey(id, nome, cognome, foto, telefono),
          project:profili!eventi_project_id_fkey(id, nome, cognome),
          cliente:clienti(id, nome, tipo, partita_iva, codice_fiscale, citta)`)
        .eq('id', id)
        .single()),
  })
}

export function useOperatoriDisponibili(eventoId: string | undefined) {
  return useQuery({
    queryKey: ['eventi', 'disponibili', eventoId ?? ''],
    enabled: !!eventoId,
    queryFn: async () => ok(await supabase.rpc('operatori_disponibili', { p_evento: eventoId! })),
  })
}

export function useCreaEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (evento: Inserimento<'eventi'>) =>
      ok(await supabase.from('eventi').insert(evento).select('id').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: chiavi.tutti }),
  })
}

export function useAggiornaEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; modifiche: AggiornamentoEvento }) =>
      ok(await supabase.from('eventi').update(v.modifiche).eq('id', v.id).select('id').single()),
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

/* ---------------- Tempo reale ---------------- */

/** Aggiorna le schermate quando cambiano eventi o proposte. */
export function useTempoReale() {
  const qc = useQueryClient()
  useEffect(() => {
    const canale = supabase.channel(`modifiche-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventi' }, () => qc.invalidateQueries({ queryKey: chiavi.tutti }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposte' }, () => qc.invalidateQueries({ queryKey: chiavi.tutti }))
      .subscribe()
    return () => { supabase.removeChannel(canale) }
  }, [qc])
}
