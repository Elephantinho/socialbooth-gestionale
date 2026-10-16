import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import { caricaFileEvento } from '@/modules/comunicazione/api'

// Montaggio: checklist salvata sul server e foto del set montato.

export function useMontaggio(eventoId: string) {
  return useQuery({
    queryKey: ['montaggio', eventoId],
    queryFn: async () => ok(await supabase.from('montaggio').select('*').eq('evento_id', eventoId).maybeSingle()),
  })
}

/** Salva le voci spuntate (completato quando sono tutte) */
export function useSalvaChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; fatte: string[]; totale: number }) =>
      ok(await supabase.from('montaggio').upsert({
        evento_id: v.eventoId, voci_fatte: v.fatte, aggiornato_il: new Date().toISOString(),
        completato_il: v.fatte.length >= v.totale ? new Date().toISOString() : null,
      })),
    onMutate: (v) => qc.setQueryData(['montaggio', v.eventoId], (p: object | null) => ({ ...(p ?? {}), evento_id: v.eventoId, voci_fatte: v.fatte })),
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: ['montaggio', v.eventoId] }),
  })
}

/** Foto del set: stanno tra i documenti dell'evento, nella cartella "montaggio" */
export function useFotoMontaggio(eventoId: string) {
  return useQuery({
    queryKey: ['allegati', eventoId, 'montaggio'],
    queryFn: async () => {
      const righe = ok(await supabase.from('allegati').select('id, percorso, creato_il')
        .eq('evento_id', eventoId).like('percorso', '%/montaggio/%').order('creato_il'))
      if (!righe.length) return []
      const { data } = await supabase.storage.from('documenti').createSignedUrls(righe.map((r) => r.percorso), 3600)
      return righe.map((r, i) => ({ ...r, url: data?.[i]?.signedUrl ?? null }))
    },
  })
}

export function useCaricaFotoMontaggio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; file: File }) => {
      const percorso = await caricaFileEvento(v.eventoId, v.file, v.file.name || 'set.jpg', 'montaggio')
      ok(await supabase.from('allegati').insert({
        evento_id: v.eventoId, nome: 'Foto del set montato', percorso, tipo: v.file.type || 'image/jpeg', dimensione: v.file.size,
      }))
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['allegati', v.eventoId] }),
  })
}
