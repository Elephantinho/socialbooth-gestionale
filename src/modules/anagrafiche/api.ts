import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Database, Enum, Inserimento } from '@/shared/types/database'

// Dati di base: tipi di booth, operatori, utenti.

type Tabelle = Database['public']['Tables']

function useInvalida(chiave: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: [chiave] })
}

/* ---------- Tipi di booth ---------- */
export function useTipiBooth() {
  return useQuery({
    queryKey: ['tipi_booth'],
    staleTime: Infinity,
    queryFn: async () => ok(await supabase.from('tipi_booth').select('*').order('ordine').order('nome')),
  })
}

/* ---------- Operatori ---------- */
export function useOperatori() {
  return useQuery({
    queryKey: ['operatori'],
    queryFn: async () =>
      ok(await supabase.from('profili')
        .select('*, zone:zone_operatore(regione)')
        .eq('ruolo', 'operatore')
        .order('attivo', { ascending: true })
        .order('nome')),
  })
}

export function useAggiornaProfilo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; modifiche: Tabelle['profili']['Update']; regioni?: Enum<'regione'>[] }) => {
      if (Object.keys(v.modifiche).length) ok(await supabase.from('profili').update(v.modifiche).eq('id', v.id))
      if (v.regioni) {
        ok(await supabase.from('zone_operatore').delete().eq('operatore_id', v.id))
        if (v.regioni.length) {
          ok(await supabase.from('zone_operatore').insert(v.regioni.map((regione) => ({ operatore_id: v.id, regione }))))
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operatori'] })
      qc.invalidateQueries({ queryKey: ['profilo'] })
    },
  })
}

/** Regioni coperte da un operatore */
export function useMieRegioni(operatoreId: string) {
  return useQuery({
    queryKey: ['profilo', 'regioni', operatoreId],
    queryFn: async () =>
      ok(await supabase.from('zone_operatore').select('regione').eq('operatore_id', operatoreId)).map((z) => z.regione),
  })
}

/* ---------- Indisponibilità ---------- */
export function useIndisponibilita(operatoreId: string) {
  return useQuery({
    queryKey: ['indisponibilita', operatoreId],
    queryFn: async () =>
      ok(await supabase.from('indisponibilita').select('*').eq('operatore_id', operatoreId)
        .gte('al', new Date().toISOString().slice(0, 10)).order('dal')),
  })
}

export function useAggiungiIndisponibilita() {
  const invalida = useInvalida('indisponibilita')
  return useMutation({
    mutationFn: async (i: Inserimento<'indisponibilita'>) => ok(await supabase.from('indisponibilita').insert(i)),
    onSuccess: invalida,
  })
}

export function useEliminaIndisponibilita() {
  const invalida = useInvalida('indisponibilita')
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('indisponibilita').delete().eq('id', id)),
    onSuccess: invalida,
  })
}

/* ---------- Foto profilo ---------- */

/** Rimpicciolisce l'immagine a max 512px (foto più leggere e veloci da caricare) */
async function rimpicciolisci(file: File, lato = 512): Promise<Blob> {
  const img = await createImageBitmap(file)
  const scala = Math.min(1, lato / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scala)
  canvas.height = Math.round(img.height * scala)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Immagine non valida'))), 'image/jpeg', 0.85))
}

/** Carica la foto di un utente (la propria, o di chiunque se admin) e la salva sul profilo */
export function useCaricaFoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { utenteId: string; file: File }) => {
      const blob = await rimpicciolisci(v.file)
      const percorso = `${v.utenteId}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('foto-profilo').upload(percorso, blob, { contentType: 'image/jpeg' })
      if (error) throw new Error(error.message)
      const url = supabase.storage.from('foto-profilo').getPublicUrl(percorso).data.publicUrl
      ok(await supabase.from('profili').update({ foto: url }).eq('id', v.utenteId))
      return url
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operatori'] })
      qc.invalidateQueries({ queryKey: ['profilo'] })
    },
  })
}

/** Un operatore con le sue regioni */
export function useOperatore(id: string) {
  return useQuery({
    queryKey: ['operatori', id],
    queryFn: async () =>
      ok(await supabase.from('profili')
        .select('*, zone:zone_operatore(regione)')
        .eq('id', id).single()),
  })
}

/** Tutti gli eventi di un operatore, dal più recente */
export function useEventiDiOperatore(id: string) {
  return useQuery({
    queryKey: ['eventi', 'di-operatore', id],
    queryFn: async () =>
      ok(await supabase.from('eventi')
        .select('id, stato, allestimento_il, smontaggio_il, citta, regione, tipo_booth:tipi_booth(nome)')
        .eq('operatore_id', id)
        .neq('stato', 'annullato')
        .order('allestimento_il', { ascending: false })),
  })
}

/* ---------- Utenti (tutti i ruoli) ---------- */
export function useUtenti() {
  return useQuery({
    queryKey: ['utenti'],
    queryFn: async () => ok(await supabase.from('profili').select('id, nome, cognome, foto, ruolo, attivo, telefono, creato_il').order('nome')),
  })
}

export function useCambiaRuolo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string; ruolo: Enum<'ruolo'>; attivo?: boolean }) =>
      ok(await supabase.from('profili').update({ ruolo: v.ruolo, ...(v.attivo != null ? { attivo: v.attivo } : {}) }).eq('id', v.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utenti'] })
      qc.invalidateQueries({ queryKey: ['operatori'] })
    },
  })
}
