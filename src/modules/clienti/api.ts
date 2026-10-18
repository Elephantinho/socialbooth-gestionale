import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { DatiCliente } from './clienti'

/** Tutti i clienti (condivisi tra i project), con quanti eventi hanno, in ordine di nome */
export function useClienti() {
  return useQuery({
    queryKey: ['clienti'],
    queryFn: async () => ok(await supabase.from('clienti').select('*, eventi(count)').order('nome')),
    select: (righe) => righe.map(({ eventi, ...c }) => ({ ...c, nEventi: (eventi as unknown as { count: number }[])[0]?.count ?? 0 })),
  })
}

/** Crea o aggiorna un cliente; restituisce il cliente salvato (già sistemato dal database: maiuscole, spazi) */
export function useSalvaCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id?: string; dati: DatiCliente; autoreId: string }) => {
      const riga = {
        ...v.dati,
        partita_iva: v.dati.tipo === 'azienda' ? v.dati.partita_iva : null,
        codice_sdi: v.dati.tipo === 'azienda' ? v.dati.codice_sdi : null,
        pec: v.dati.tipo === 'azienda' ? v.dati.pec : null,
        codice_fiscale: v.dati.codice_fiscale || null,
        email: v.dati.email || null, telefono: v.dati.telefono.trim() || null, note: v.dati.note.trim() || null,
      }
      const risposta = v.id
        ? await supabase.from('clienti').update(riga).eq('id', v.id).select('*').single()
        : await supabase.from('clienti').insert({ ...riga, project_id: v.autoreId }).select('*').single()
      if (risposta.error?.code === '23505') throw new Error('Esiste già un cliente con questa partita IVA: cercalo nell\'elenco')
      return ok(risposta)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clienti'] }),
  })
}
