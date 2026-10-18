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

/** Eventi di un periodo con conti e spese, per la pagina Conti (letti a blocchi da 1000) */
export function useContiPeriodo(dal: Date, al: Date) {
  return useQuery({
    queryKey: ['conti', 'periodo', dal.toISOString(), al.toISOString()],
    queryFn: async () => {
      const campi = `id, nome, citta, regione, stato, allestimento_il, tipo_booth:tipi_booth(nome),
          project:profili!eventi_project_id_fkey(nome, cognome), operatore:profili!eventi_operatore_id_fkey(id, nome, cognome),
          conti:conti_evento(*), spese:spese_evento(importo, pagata_con, voce, operatore_id, fonte, operatore:profili!spese_evento_operatore_id_fkey(id, nome, cognome))`
      const leggi = (da: number) => supabase.from('eventi').select(campi)
        .neq('stato', 'annullato')
        .gte('allestimento_il', dal.toISOString()).lt('allestimento_il', al.toISOString())
        .order('allestimento_il').order('id').range(da, da + 999)
      const tutti = []
      for (let da = 0; ; da += 1000) {
        const parte = ok(await leggi(da))
        tutti.push(...parte)
        if (parte.length < 1000) break
      }
      // conti_evento è uno a uno con l'evento: un oggetto (o null), spese sempre un elenco
      return tutti.map((e) => ({ ...e, conti: (Array.isArray(e.conti) ? e.conti[0] : e.conti) ?? null, spese: e.spese ?? [] }))
    },
  })
}

/* ---------- Carte aziendali ---------- */

export function useCarte() {
  return useQuery({
    queryKey: ['carte'],
    queryFn: async () => ok(await supabase.from('carte_aziendali')
      .select('*, operatore:profili!carte_aziendali_operatore_id_fkey(id, nome, cognome)').order('creato_il')),
  })
}

export function useSalvaCarta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id?: string; ultime_cifre: string; operatore_id: string | null; attiva: boolean; nome?: string }) =>
      v.id
        ? ok(await supabase.from('carte_aziendali').update({ ultime_cifre: v.ultime_cifre, operatore_id: v.operatore_id, attiva: v.attiva }).eq('id', v.id).select('id').single())
        : ok(await supabase.from('carte_aziendali').insert({ nome: v.nome ?? 'Revolut', ultime_cifre: v.ultime_cifre, operatore_id: v.operatore_id, attiva: v.attiva }).select('id').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carte'] }),
  })
}

/* ---------- Pagamenti delle carte arrivati dalla banca ---------- */

export function usePagamentiDaControllare() {
  return useQuery({
    queryKey: ['pagamenti', 'da_abbinare'],
    queryFn: async () => ok(await supabase.from('pagamenti_carte')
      .select('*, operatore:profili!pagamenti_carte_operatore_id_fkey(id, nome, cognome)')
      .eq('stato', 'da_abbinare').order('pagato_il', { ascending: false }).limit(500)),
  })
}

/** Eventi intorno alla data di un pagamento, per abbinarlo a mano */
export function useEventiVicini(quando: string, operatoreId: string | null) {
  return useQuery({
    queryKey: ['eventi', 'vicini', quando, operatoreId ?? ''],
    queryFn: async () => {
      const t = new Date(quando).getTime()
      let q = supabase.from('eventi').select('id, nome, citta, allestimento_il, tipo_booth:tipi_booth(nome)')
        .neq('stato', 'annullato')
        .gte('allestimento_il', new Date(t - 3 * 86_400_000).toISOString()).lte('allestimento_il', new Date(t + 2 * 86_400_000).toISOString())
        .order('allestimento_il').limit(200)
      if (operatoreId) q = q.eq('operatore_id', operatoreId)
      return ok(await q)
    },
  })
}

export function useSistemaPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; eventoId?: string }) =>
      v.eventoId
        ? ok(await supabase.rpc('abbina_a_mano', { p_pagamento: v.id, p_evento: v.eventoId }))
        : ok(await supabase.rpc('ignora_pagamento', { p_pagamento: v.id })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pagamenti'] }); qc.invalidateQueries({ queryKey: ['conti'] }); qc.invalidateQueries({ queryKey: ['spese'] }) },
  })
}
