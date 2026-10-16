import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Inserimento } from '@/shared/types/database'

// Inventario dei magazzini e attrezzatura assegnata agli eventi.

export const CATEGORIE_ARTICOLO = ['Booth', 'Stampanti', 'Fotocamere', 'Consumabili', 'Props', 'Illuminazione', 'Fondali', 'Cavi e alimentazione', 'Altro']

export function useArticoli(magazzinoId: string | undefined) {
  return useQuery({
    queryKey: ['articoli', magazzinoId ?? ''],
    enabled: !!magazzinoId,
    queryFn: async () =>
      ok(await supabase.from('articoli').select('*').eq('magazzino_id', magazzinoId!).order('categoria').order('nome')),
  })
}

export function useSalvaArticolo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: Inserimento<'articoli'>) =>
      a.id
        ? ok(await supabase.from('articoli').update(a).eq('id', a.id))
        : ok(await supabase.from('articoli').insert(a)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articoli'] }),
  })
}

export function useEliminaArticolo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('articoli').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['articoli'] }),
  })
}

/** Attrezzatura assegnata all'evento, con il nome dell'articolo */
export function useAttrezzaturaEvento(eventoId: string) {
  return useQuery({
    queryKey: ['eventi', 'attrezzatura', eventoId],
    queryFn: async () =>
      ok(await supabase.from('attrezzatura_evento')
        .select('quantita, articolo_id, prelevato_il, rientrato_il, articolo:articoli(nome, categoria, codice)')
        .eq('evento_id', eventoId)),
  })
}

/**
 * Aggiorna l'elenco dell'attrezzatura dell'evento senza perdere prelievi già fatti:
 * toglie le righe non più scelte, aggiorna le quantità, aggiunge le nuove.
 */
export function useImpostaAttrezzatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; righe: { articolo_id: string; quantita: number }[] }) => {
      const attuali = ok(await supabase.from('attrezzatura_evento').select('articolo_id').eq('evento_id', v.eventoId))
      const tenuti = new Set(v.righe.map((r) => r.articolo_id))
      const via = attuali.map((a) => a.articolo_id).filter((id) => !tenuti.has(id))
      if (via.length) ok(await supabase.from('attrezzatura_evento').delete().eq('evento_id', v.eventoId).in('articolo_id', via))
      if (v.righe.length) {
        ok(await supabase.from('attrezzatura_evento')
          .upsert(v.righe.map((r) => ({ ...r, evento_id: v.eventoId })), { onConflict: 'evento_id,articolo_id' }))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventi'] })
      qc.invalidateQueries({ queryKey: ['articoli'] })
    },
  })
}

/** Segna l'attrezzatura dell'evento come uscita dal magazzino o rientrata (di solito lo fanno le tappe) */
export function useSegnaAttrezzatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; azione: 'prelievo' | 'rientro' }) =>
      ok(await supabase.rpc('segna_attrezzatura', { p_evento: v.eventoId, p_azione: v.azione })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventi'] })
      qc.invalidateQueries({ queryKey: ['articoli'] })
    },
  })
}
