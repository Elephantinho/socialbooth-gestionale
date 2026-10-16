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
