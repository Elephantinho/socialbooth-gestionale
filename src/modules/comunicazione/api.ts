import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'

// Notifiche in-app, chat degli eventi, allegati e foto.

/* ---------------- Notifiche ---------------- */

export function useNotifiche(utenteId: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['notifiche', utenteId],
    queryFn: async () =>
      ok(await supabase.from('notifiche').select('*').eq('utente_id', utenteId).order('creata_il', { ascending: false }).limit(40)),
  })
  // Arrivano in tempo reale
  useEffect(() => {
    const canale = supabase.channel(`notifiche-${utenteId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifiche', filter: `utente_id=eq.${utenteId}` },
        () => qc.invalidateQueries({ queryKey: ['notifiche', utenteId] }))
      .subscribe()
    return () => { supabase.removeChannel(canale) }
  }, [qc, utenteId])
  return query
}

export function useSegnaLette() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { utenteId: string; id?: string }) => {
      let q = supabase.from('notifiche').update({ letta: true }).eq('utente_id', v.utenteId).eq('letta', false)
      if (v.id) q = q.eq('id', v.id)
      ok(await q)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifiche'] }),
  })
}

/* ---------------- Chat dell'evento ---------------- */

export function useMessaggi(eventoId: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['messaggi', eventoId],
    queryFn: async () =>
      ok(await supabase.from('messaggi')
        .select('*, autore:profili!messaggi_autore_id_fkey(nome, cognome, foto, ruolo)')
        .eq('evento_id', eventoId).order('creato_il')),
  })
  useEffect(() => {
    const canale = supabase.channel(`chat-${eventoId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messaggi', filter: `evento_id=eq.${eventoId}` },
        () => qc.invalidateQueries({ queryKey: ['messaggi', eventoId] }))
      .subscribe()
    return () => { supabase.removeChannel(canale) }
  }, [qc, eventoId])
  return query
}

export function useInviaMessaggio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; testo: string }) =>
      ok(await supabase.from('messaggi').insert({ evento_id: v.eventoId, testo: v.testo.trim() })),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['messaggi', v.eventoId] }),
  })
}

/* ---------------- Allegati e foto (archivio privato) ---------------- */

const pulisci = (nome: string) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').slice(-80)

/** Carica un file nell'archivio dell'evento e restituisce il percorso */
export async function caricaFileEvento(eventoId: string, file: File | Blob, nome: string, cartella = '') {
  const percorso = `eventi/${eventoId}/${cartella ? `${cartella}/` : ''}${Date.now()}-${pulisci(nome)}`
  const { error } = await supabase.storage.from('documenti').upload(percorso, file, { contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  return percorso
}

/** Apre un file privato con un link temporaneo (10 minuti) */
export async function apriFile(percorso: string) {
  const finestra = window.open('', '_blank')
  const { data, error } = await supabase.storage.from('documenti').createSignedUrl(percorso, 600)
  if (error || !data) { finestra?.close(); throw new Error(error?.message ?? 'File non disponibile') }
  if (finestra) finestra.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

export function useAllegati(eventoId: string) {
  return useQuery({
    queryKey: ['allegati', eventoId],
    queryFn: async () =>
      ok(await supabase.from('allegati').select('*, autore:profili!allegati_caricato_da_fkey(nome, cognome)')
        .eq('evento_id', eventoId).order('creato_il', { ascending: false })),
  })
}

export function useCaricaAllegato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { eventoId: string; file: File; nome?: string; cartella?: string }) => {
      const percorso = await caricaFileEvento(v.eventoId, v.file, v.file.name, v.cartella)
      ok(await supabase.from('allegati').insert({
        evento_id: v.eventoId, nome: v.nome ?? v.file.name, percorso, tipo: v.file.type || null, dimensione: v.file.size,
      }))
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['allegati', v.eventoId] }),
  })
}

export function useEliminaAllegato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: { id: string; percorso: string; eventoId: string }) => {
      await supabase.storage.from('documenti').remove([a.percorso])
      ok(await supabase.from('allegati').delete().eq('id', a.id))
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['allegati', v.eventoId] }),
  })
}
