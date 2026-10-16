import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Inserimento, Database } from '@/shared/types/database'

// Tutte le letture/scritture degli eventi passano da qui.
// Le pagine usano questi hook e non chiamano mai Supabase direttamente.

type AggiornamentoEvento = Database['public']['Tables']['eventi']['Update']

const chiavi = {
  tutti: ['eventi'] as const,
  ore: ['ore'] as const,
}

const campiEvento = '*, tipo_booth:tipi_booth(nome), magazzino:magazzini(nome, indirizzo, citta)'

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

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; lat: number; lng: number }) =>
      ok(await supabase.rpc('check_in', { p_evento: v.eventoId, p_lat: v.lat, p_lng: v.lng })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chiavi.tutti }),
  })
}

export type SpesaOperatore = {
  categoria: Database['public']['Enums']['categoria_costo']
  quantita: number
  costo_unitario: number
  pagato_con: Database['public']['Enums']['pagamento']
  carta_id: string | null
  descrizione?: string
}

export function useChiudiEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; minutiLocation: number; minutiViaggio: number; nota?: string; spese: SpesaOperatore[]; operatoreId: string }) => {
      ok(await supabase.rpc('chiudi_evento', {
        p_evento: v.eventoId, p_minuti_location: v.minutiLocation, p_minuti_viaggio: v.minutiViaggio, p_nota: v.nota || undefined,
      }))
      if (v.spese.length) {
        ok(await supabase.from('costi_evento').insert(v.spese.map((s) => ({
          ...s, evento_id: v.eventoId, operatore_id: v.operatoreId, fase: 'finale' as const,
        }))))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chiavi.tutti })
      qc.invalidateQueries({ queryKey: chiavi.ore })
    },
  })
}

/** Ore inviate dall'operatore (per il riepilogo). */
export function useMieOre(operatoreId: string) {
  return useQuery({
    queryKey: ['ore', 'operatore', operatoreId],
    queryFn: async () =>
      ok(await supabase.from('ore_lavorate')
        .select('*, evento:eventi(allestimento_il, citta, tipo_booth:tipi_booth(nome))')
        .eq('operatore_id', operatoreId)
        .not('check_out_il', 'is', null)
        .order('creato_il', { ascending: false })),
  })
}

/** Ore e compenso dell'operatore nel mese corrente (anche in attesa di approvazione). */
export function useMeseOperatore(operatoreId: string) {
  const ore = useMieOre(operatoreId)
  const inizio = new Date()
  inizio.setDate(1); inizio.setHours(0, 0, 0, 0)
  const righe = (ore.data ?? []).filter((r) => r.evento && new Date(r.evento.allestimento_il) >= inizio && r.stato !== 'respinto')
  return {
    ...ore,
    data: ore.data && {
      eventi: righe.length,
      minuti: righe.reduce((s, r) => s + (r.minuti_totali ?? 0), 0),
      compenso: righe.reduce((s, r) => s + (r.compenso ?? 0), 0),
    },
  }
}

/* ---------------- Lato gestione (project / admin) ---------------- */

/** Elenco per project e admin (la sicurezza del database filtra cosa vede ciascuno). */
export function useEventiGestione() {
  return useQuery({
    queryKey: ['eventi', 'gestione'],
    queryFn: async () =>
      ok(await supabase.from('eventi')
        .select('*, tipo_booth:tipi_booth(nome), cliente:clienti(nome), operatore:profili!eventi_operatore_id_fkey(nome, cognome, foto)')
        .order('allestimento_il')),
  })
}

/** Evento completo per la pagina di dettaglio in gestione. */
export function useEventoGestione(id: string) {
  return useQuery({
    queryKey: ['eventi', 'gestione', id],
    queryFn: async () =>
      ok(await supabase.from('eventi')
        .select(`*, tipo_booth:tipi_booth(nome), cliente:clienti(nome), magazzino:magazzini(nome, lat, lng),
          operatore:profili!eventi_operatore_id_fkey(id, nome, cognome, foto, telefono, tariffa_oraria),
          proposte(id, stato, automatica, creato_il, risposta_il, operatore:profili(nome)),
          ore:ore_lavorate(*)`)
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
    mutationFn: async (evento: Inserimento<'eventi'>) => {
      const { id } = ok(await supabase.from('eventi').insert(evento).select('id').single())
      // Riletto dopo l'inserimento: l'assegnazione automatica avviene nel database subito dopo
      return ok(await supabase.from('eventi').select('id, stato, operatore_id').eq('id', id).single())
    },
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

/** Approva o respinge ore e spese di un evento. */
export function useApprovaOre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { oreId: string; eventoId: string; approva: boolean; approvatoDa: string }) => {
      const stato = v.approva ? 'approvato' : 'respinto'
      ok(await supabase.from('ore_lavorate')
        .update({ stato, approvato_da: v.approvatoDa, approvato_il: new Date().toISOString() })
        .eq('id', v.oreId))
      // Insieme alle ore si approvano le spese finali inviate dall'operatore
      ok(await supabase.from('costi_evento').update({ stato })
        .eq('evento_id', v.eventoId).eq('fase', 'finale').eq('stato', 'inviato').not('operatore_id', 'is', null))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chiavi.tutti })
      qc.invalidateQueries({ queryKey: chiavi.ore })
    },
  })
}

/** Tutte le ore del mese per il report (project vede i suoi eventi, admin tutti). */
export function useReportOre(mese: string /* yyyy-mm */) {
  return useQuery({
    queryKey: ['ore', 'report', mese],
    queryFn: async () => {
      const inizio = new Date(`${mese}-01T00:00:00`)
      const fine = new Date(inizio); fine.setMonth(fine.getMonth() + 1)
      return ok(await supabase.from('ore_lavorate')
        .select(`*, operatore:profili!ore_lavorate_operatore_id_fkey(nome),
          evento:eventi!inner(id, allestimento_il, citta, regione, tipo_booth:tipi_booth(nome), costi:costi_evento(importo, stato, pagato_con, fase, operatore_id))`)
        .gte('evento.allestimento_il', inizio.toISOString())
        .lt('evento.allestimento_il', fine.toISOString())
        .not('check_out_il', 'is', null)
        .order('creato_il'))
    },
  })
}

/* ---------------- Tempo reale ---------------- */

/** Aggiorna da solo le schermate quando cambiano eventi, proposte o ore. */
export function useTempoReale() {
  const qc = useQueryClient()
  useEffect(() => {
    const canale = supabase.channel('modifiche')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventi' }, () => qc.invalidateQueries({ queryKey: chiavi.tutti }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposte' }, () => qc.invalidateQueries({ queryKey: chiavi.tutti }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ore_lavorate' }, () => qc.invalidateQueries({ queryKey: chiavi.ore }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'costi_evento' }, () => qc.invalidateQueries({ queryKey: chiavi.tutti }))
      .subscribe()
    return () => { supabase.removeChannel(canale) }
  }, [qc])
}
