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
        .select('quantita, articolo_id, articolo:articoli(nome, categoria, codice)')
        .eq('evento_id', eventoId)),
  })
}

/** Sostituisce l'elenco dell'attrezzatura dell'evento */
export function useImpostaAttrezzatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; righe: { articolo_id: string; quantita: number }[] }) => {
      ok(await supabase.from('attrezzatura_evento').delete().eq('evento_id', v.eventoId))
      if (v.righe.length) {
        ok(await supabase.from('attrezzatura_evento').insert(v.righe.map((r) => ({ ...r, evento_id: v.eventoId }))))
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eventi'] }),
  })
}
