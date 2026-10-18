import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Inserimento } from '@/shared/types/database'
import { rigaMagazzino, type DatiMagazzino } from './magazzino'

const CHIAVE = 'magazzini'
const PERSONA = 'id, nome, cognome, foto, ruolo'

function useInvalida() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: [CHIAVE] })
}

/** Tutti i magazzini, con strumenti, responsabile e operatori che partono da lì; prima quelli attivi */
export function useMagazzini() {
  return useQuery({
    queryKey: [CHIAVE],
    queryFn: async () =>
      ok(await supabase.from('magazzini')
        .select(`*, articoli(*), responsabile:profili!magazzini_responsabile_id_fkey(${PERSONA}), operatori:profili!profili_magazzino_fk(id, attivo)`)
        .order('attivo', { ascending: false })
        .order('citta')),
  })
}

/** Chi può fare da responsabile: operatori e ufficio attivi */
export function usePersonePerMagazzino() {
  return useQuery({
    queryKey: ['persone-magazzino'],
    queryFn: async () =>
      ok(await supabase.from('profili').select(PERSONA)
        .in('ruolo', ['operatore', 'gestore_operatori', 'admin']).eq('attivo', true)
        .order('nome')),
  })
}

export function useSalvaMagazzino() {
  const invalida = useInvalida()
  return useMutation({
    mutationFn: async (v: { id?: string; dati: DatiMagazzino }) => {
      const riga = rigaMagazzino(v.dati)
      return v.id
        ? ok(await supabase.from('magazzini').update(riga).eq('id', v.id).select('id').single())
        : ok(await supabase.from('magazzini').insert(riga).select('id').single())
    },
    onSuccess: invalida,
  })
}

export function useAttivaMagazzino() {
  const invalida = useInvalida()
  return useMutation({
    mutationFn: async (v: { id: string; attivo: boolean }) => ok(await supabase.from('magazzini').update({ attivo: v.attivo }).eq('id', v.id)),
    onSuccess: invalida,
  })
}

/** Aggiunge (positivo) o toglie (negativo) stampe: lo fa il database, così non si perde niente */
export function useCaricaCarta() {
  const invalida = useInvalida()
  return useMutation({
    mutationFn: async (v: { magazzino: string; stampe: number }) =>
      ok(await supabase.rpc('carica_carta', { p_magazzino: v.magazzino, p_stampe: v.stampe })),
    onSuccess: invalida,
  })
}

export function useSalvaArticolo() {
  const invalida = useInvalida()
  return useMutation({
    mutationFn: async (v: { id?: string; riga: Inserimento<'articoli'> }) =>
      v.id
        ? ok(await supabase.from('articoli').update(v.riga).eq('id', v.id))
        : ok(await supabase.from('articoli').insert(v.riga)),
    onSuccess: invalida,
  })
}

export function useTogliArticolo() {
  const invalida = useInvalida()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('articoli').delete().eq('id', id)),
    onSuccess: invalida,
  })
}
