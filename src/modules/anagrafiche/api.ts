import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Inserimento } from '@/shared/types/database'

// Dati di base: tipi di booth, clienti, magazzini, location salvate.

export function useTipiBooth() {
  return useQuery({
    queryKey: ['tipi_booth'],
    staleTime: Infinity,
    queryFn: async () => ok(await supabase.from('tipi_booth').select('*').order('nome')),
  })
}

export function useClienti() {
  return useQuery({
    queryKey: ['clienti'],
    queryFn: async () => ok(await supabase.from('clienti').select('id, nome').order('nome')),
  })
}

export function useCreaCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Inserimento<'clienti'>) => ok(await supabase.from('clienti').insert(c).select('id, nome').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clienti'] }),
  })
}

export function useMagazzini() {
  return useQuery({
    queryKey: ['magazzini'],
    queryFn: async () => ok(await supabase.from('magazzini').select('*').order('nome')),
  })
}

export function useLocation() {
  return useQuery({
    queryKey: ['location'],
    queryFn: async () => ok(await supabase.from('location').select('*').order('creato_il', { ascending: false })),
  })
}

export function useSalvaLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (l: Inserimento<'location'>) => ok(await supabase.from('location').insert(l).select('id').single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['location'] }),
  })
}
