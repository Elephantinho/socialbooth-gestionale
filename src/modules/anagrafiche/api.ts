import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Database, Enum, Inserimento } from '@/shared/types/database'

// Dati di base: tipi di booth, clienti, magazzini, location salvate, operatori.

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
    queryFn: async () => ok(await supabase.from('tipi_booth').select('*').order('nome')),
  })
}

/* ---------- Clienti ---------- */
export function useClienti() {
  return useQuery({
    queryKey: ['clienti'],
    queryFn: async () => ok(await supabase.from('clienti').select('id, nome, email, telefono').order('nome')),
  })
}

export function useCreaCliente() {
  const invalida = useInvalida('clienti')
  return useMutation({
    mutationFn: async (c: Inserimento<'clienti'>) => ok(await supabase.from('clienti').insert(c).select('id, nome').single()),
    onSuccess: invalida,
  })
}

/* ---------- Magazzini ---------- */
export function useMagazzini() {
  return useQuery({
    queryKey: ['magazzini'],
    queryFn: async () => ok(await supabase.from('magazzini').select('*').order('nome')),
  })
}

export function useSalvaMagazzino() {
  const invalida = useInvalida('magazzini')
  return useMutation({
    mutationFn: async (m: Inserimento<'magazzini'>) =>
      m.id
        ? ok(await supabase.from('magazzini').update(m).eq('id', m.id).select('id').single())
        : ok(await supabase.from('magazzini').insert(m).select('id').single()),
    onSuccess: invalida,
  })
}

export function useEliminaMagazzino() {
  const invalida = useInvalida('magazzini')
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('magazzini').delete().eq('id', id)),
    onSuccess: invalida,
  })
}

/* ---------- Location salvate ---------- */
export function useLocation() {
  return useQuery({
    queryKey: ['location'],
    queryFn: async () => ok(await supabase.from('location').select('*').order('creato_il', { ascending: false })),
  })
}

export function useSalvaLocation() {
  const invalida = useInvalida('location')
  return useMutation({
    mutationFn: async (l: Inserimento<'location'>) =>
      l.id
        ? ok(await supabase.from('location').update(l).eq('id', l.id).select('id').single())
        : ok(await supabase.from('location').insert(l).select('id').single()),
    onSuccess: invalida,
  })
}

export function useEliminaLocation() {
  const invalida = useInvalida('location')
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('location').delete().eq('id', id)),
    onSuccess: invalida,
  })
}

/* ---------- Operatori ---------- */
export function useOperatori() {
  return useQuery({
    queryKey: ['operatori'],
    queryFn: async () =>
      ok(await supabase.from('profili')
        .select('*, zone:zone_operatore(regione), magazzino:magazzini(nome)')
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

/** Un operatore con zone, magazzino e numeri per la sua scheda */
export function useOperatore(id: string) {
  return useQuery({
    queryKey: ['operatori', id],
    queryFn: async () =>
      ok(await supabase.from('profili')
        .select('*, zone:zone_operatore(regione), magazzino:magazzini(nome, citta)')
        .eq('id', id).single()),
  })
}

/** Tutti gli eventi di un operatore con ore, costi e ricavo, per i numeri e i margini */
export function useEventiDiOperatore(id: string) {
  return useQuery({
    queryKey: ['eventi', 'di-operatore', id],
    queryFn: async () =>
      ok(await supabase.from('eventi')
        .select(`id, stato, allestimento_il, smontaggio_il, citta, regione, viaggio_minuti, prezzo_cliente, fattura_importo,
          tipo_booth:tipi_booth(nome), cliente:clienti(nome),
          ore:ore_lavorate(compenso, minuti_totali, minuti_in_location, minuti_viaggio, stato, check_out_il, operatore_id),
          costi:costi_evento(fase, categoria, importo, stato)`)
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

/* ---------- Clienti con i loro numeri ---------- */
export function useClientiConEventi() {
  return useQuery({
    queryKey: ['clienti', 'completo'],
    queryFn: async () =>
      ok(await supabase.from('clienti')
        .select('*, eventi(id, stato, allestimento_il, prezzo_cliente, fattura_importo, fattura_pagata)')
        .order('nome')),
  })
}

export function useSalvaCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Inserimento<'clienti'>) =>
      c.id ? ok(await supabase.from('clienti').update(c).eq('id', c.id)) : ok(await supabase.from('clienti').insert(c)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clienti'] }),
  })
}

export function useEliminaCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('clienti').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clienti'] }),
  })
}

/* ---------- Impostazioni ---------- */
export function useImpostazioni() {
  return useQuery({
    queryKey: ['impostazioni'],
    queryFn: async () => ok(await supabase.from('impostazioni').select('*').order('chiave')),
  })
}

export function useSalvaImpostazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { chiave: string; valore: number | null }) =>
      ok(await supabase.from('impostazioni').update({ valore: v.valore }).eq('chiave', v.chiave)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['impostazioni'] }),
  })
}

/** Costo per stampa calcolato e media di stampe per evento */
export function useStatisticheStampe() {
  return useQuery({
    queryKey: ['impostazioni', 'stampe'],
    queryFn: async () => ({
      costo: ok(await supabase.rpc('costo_per_stampa')) as number | null,
      media: ok(await supabase.rpc('media_stampe_per_evento')) as number | null,
    }),
  })
}
