import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import { rimpicciolisci } from '@/shared/lib/immagini'
import type { Database } from '@/shared/types/database'
import type { PagataCon, Voce } from './conti'

// Conti (prezzo, fattura, incasso) e spese degli eventi.
// Il database li mostra solo ad admin, amministrazione e al project dell'evento;
// l'operatore vede e segna solo le sue spese.

type ContiModifica = Database['public']['Tables']['conti_evento']['Update']

export function useConti(eventoId: string) {
  return useQuery({
    queryKey: ['conti', eventoId],
    queryFn: async () => ok(await supabase.from('conti_evento').select('*').eq('evento_id', eventoId).maybeSingle()) ?? null,
  })
}

export function useSalvaConti() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; modifiche: ContiModifica }) =>
      ok(await supabase.from('conti_evento').upsert({ evento_id: v.eventoId, ...v.modifiche }).select('evento_id').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conti'] }),
  })
}

const campiSpesa = '*, operatore:profili!spese_evento_operatore_id_fkey(nome, cognome)'

/** Spese di un evento (l'operatore riceve solo le sue) */
export function useSpese(eventoId: string) {
  return useQuery({
    queryKey: ['spese', eventoId],
    queryFn: async () => ok(await supabase.from('spese_evento').select(campiSpesa).eq('evento_id', eventoId).order('creato_il')),
  })
}

export function useAggiungiSpesa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: {
      eventoId: string; voce: Voce; importo: number; pagataCon: PagataCon
      descrizione?: string; operatoreId?: string | null; foto?: File | null; autoreId: string
    }) => {
      let scontrino: string | null = null
      if (v.foto) {
        // Cartella: evento / chi carica / foto
        const blob = await rimpicciolisci(v.foto, 1600, 0.8)
        scontrino = `${v.eventoId}/${v.autoreId}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('scontrini').upload(scontrino, blob, { contentType: 'image/jpeg' })
        if (error) throw new Error(`Foto non caricata: ${error.message}`)
      }
      return ok(await supabase.from('spese_evento').insert({
        evento_id: v.eventoId, voce: v.voce, importo: v.importo, pagata_con: v.pagataCon,
        descrizione: v.descrizione?.trim() || null, operatore_id: v.operatoreId ?? null, scontrino,
      }).select('id').single())
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spese'] }),
  })
}

export function useTogliSpesa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const tolte = ok(await supabase.from('spese_evento').delete().eq('id', id).select('id'))
      if (!tolte.length) throw new Error('Non puoi più togliere questa spesa')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spese'] }),
  })
}

/** Apre la foto dello scontrino (link valido 10 minuti) */
export async function apriScontrino(percorso: string) {
  const { data, error } = await supabase.storage.from('scontrini').createSignedUrl(percorso, 600)
  if (error) throw new Error(error.message)
  window.open(data.signedUrl, '_blank', 'noopener')
}

/** Eventi di un mese con conti e spese, per la pagina Conti */
export function useContiMese(mese: string) {
  return useQuery({
    queryKey: ['conti', 'mese', mese],
    queryFn: async () => {
      const [a, m] = mese.split('-').map(Number)
      return ok(await supabase.from('eventi')
        .select('id, nome, citta, stato, allestimento_il, tipo_booth:tipi_booth(nome), project:profili!eventi_project_id_fkey(nome, cognome), conti:conti_evento(*), spese:spese_evento(importo, pagata_con)')
        .neq('stato', 'annullato')
        .gte('allestimento_il', new Date(a, m - 1, 1).toISOString()).lt('allestimento_il', new Date(a, m, 1).toISOString())
        .order('allestimento_il').limit(1000))
    },
  })
}
