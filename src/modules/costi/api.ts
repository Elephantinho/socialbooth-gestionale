import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import type { Database, Inserimento } from '@/shared/types/database'

// Costi degli eventi e carte aziendali.

/** Stampe già dichiarate per un evento (per non chiederle due volte) */
export function useStampeDichiarate(eventoId: string) {
  return useQuery({
    queryKey: ['eventi', 'costi', eventoId, 'stampe'],
    queryFn: async () => {
      const righe = ok(await supabase.from('costi_evento').select('stampe')
        .eq('evento_id', eventoId).eq('categoria', 'carta_stampe').eq('fase', 'finale').neq('stato', 'respinto'))
      return righe.reduce((s, r) => s + (r.stampe ?? 0), 0)
    },
  })
}

export function useCostiEvento(eventoId: string) {
  return useQuery({
    queryKey: ['eventi', 'costi', eventoId],
    queryFn: async () =>
      ok(await supabase.from('costi_evento')
        .select('*, operatore:profili!costi_evento_operatore_id_fkey(nome), carta:carte_aziendali(nome, ultime_cifre)')
        .eq('evento_id', eventoId)
        .order('creato_il')),
  })
}

function useInvalidaEventi() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['eventi'] })
    qc.invalidateQueries({ queryKey: ['ore'] })
  }
}

export function useAggiungiCosto() {
  const invalida = useInvalidaEventi()
  return useMutation({
    mutationFn: async (c: Inserimento<'costi_evento'>) => ok(await supabase.from('costi_evento').insert(c)),
    onSuccess: invalida,
  })
}

export function useAggiornaCosto() {
  const invalida = useInvalidaEventi()
  return useMutation({
    mutationFn: async (v: { id: string; modifiche: Database['public']['Tables']['costi_evento']['Update'] }) =>
      ok(await supabase.from('costi_evento').update(v.modifiche).eq('id', v.id)),
    onSuccess: invalida,
  })
}

export function useEliminaCosto() {
  const invalida = useInvalidaEventi()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('costi_evento').delete().eq('id', id)),
    onSuccess: invalida,
  })
}

/* ---------- Carte aziendali ---------- */

export function useCarte() {
  return useQuery({
    queryKey: ['carte'],
    queryFn: async () =>
      ok(await supabase.from('carte_aziendali').select('*, operatore:profili(nome)').order('nome')),
  })
}

/** Carta attiva assegnata all'operatore (se ce l'ha) */
export function useMiaCarta(operatoreId: string) {
  return useQuery({
    queryKey: ['carte', 'mia', operatoreId],
    queryFn: async () =>
      ok(await supabase.from('carte_aziendali').select('id, nome, ultime_cifre')
        .eq('operatore_id', operatoreId).eq('attiva', true).limit(1)).at(0) ?? null,
  })
}

export function useSalvaCarta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (c: Inserimento<'carte_aziendali'>) =>
      c.id
        ? ok(await supabase.from('carte_aziendali').update(c).eq('id', c.id))
        : ok(await supabase.from('carte_aziendali').insert(c)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carte'] }),
  })
}

export function useEliminaCarta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('carte_aziendali').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carte'] }),
  })
}

/** Spese pagate con le carte aziendali in un mese (per il controllo dell'estratto conto) */
export function useMovimentiCarte(mese: string) {
  return useQuery({
    queryKey: ['carte', 'movimenti', mese],
    queryFn: async () => {
      const inizio = new Date(`${mese}-01T00:00:00`)
      const fine = new Date(inizio); fine.setMonth(fine.getMonth() + 1)
      return ok(await supabase.from('costi_evento')
        .select('*, carta:carte_aziendali(nome, ultime_cifre), operatore:profili!costi_evento_operatore_id_fkey(nome), evento:eventi(id, citta, allestimento_il)')
        .eq('pagato_con', 'carta_aziendale').eq('fase', 'finale')
        .gte('creato_il', inizio.toISOString()).lt('creato_il', fine.toISOString())
        .order('creato_il', { ascending: false }))
    },
  })
}

/** Eventi degli ultimi N mesi (incluso il corrente) con tutto il necessario per l'analitica */
export function useEconomiaPeriodo(mesi = 6) {
  return useQuery({
    queryKey: ['eventi', 'economia-periodo', mesi],
    queryFn: async () => {
      const oggi = new Date()
      const inizio = new Date(oggi.getFullYear(), oggi.getMonth() - (mesi - 1), 1)
      const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 1)
      return ok(await supabase.from('eventi')
        .select(`id, regione, citta, stato, allestimento_il, smontaggio_il, viaggio_minuti, prezzo_cliente, fattura_importo, lat, lng,
          tipo_booth:tipi_booth(nome, stampa), cliente:clienti(id, nome),
          operatore:profili!eventi_operatore_id_fkey(id, nome, cognome, foto, tariffa_oraria),
          ore:ore_lavorate(compenso, stato, check_out_il, minuti_totali),
          costi:costi_evento(fase, categoria, importo, stato, pagato_con)`)
        .neq('stato', 'annullato')
        .gte('allestimento_il', inizio.toISOString())
        .lt('allestimento_il', fine.toISOString()))
    },
  })
}

/** Eventi da oggi ai prossimi N mesi (inclusi quelli appena inseriti), per la previsione dei costi */
export function useEconomiaFutura(mesi = 3) {
  return useQuery({
    queryKey: ['eventi', 'economia-futura', mesi],
    queryFn: async () => {
      const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
      const fine = new Date(oggi.getFullYear(), oggi.getMonth() + mesi, 1)
      const [eventi, operatori, costoStampa, media] = await Promise.all([
        supabase.from('eventi')
          .select(`id, regione, citta, stato, allestimento_il, smontaggio_il, viaggio_minuti, prezzo_cliente, fattura_importo,
            tipo_booth:tipi_booth(nome, stampa), cliente:clienti(id, nome),
            operatore:profili!eventi_operatore_id_fkey(id, nome, cognome, foto, tariffa_oraria),
            ore:ore_lavorate(compenso, stato, check_out_il, minuti_totali),
            costi:costi_evento(fase, categoria, importo, stato, pagato_con)`)
          .not('stato', 'in', '(annullato,completato)')
          .gte('smontaggio_il', oggi.toISOString())
          .lt('allestimento_il', fine.toISOString())
          .order('allestimento_il'),
        supabase.from('profili').select('tariffa_oraria').eq('ruolo', 'operatore').eq('attivo', true).not('tariffa_oraria', 'is', null),
        supabase.rpc('costo_per_stampa'),
        supabase.rpc('media_stampe_per_evento'),
      ])
      const tariffe = ok(operatori).map((o) => Number(o.tariffa_oraria))
      return {
        eventi: ok(eventi),
        tariffaMedia: tariffe.length ? tariffe.reduce((a, b) => a + b, 0) / tariffe.length : null,
        costoStampa: Number(costoStampa.data ?? 0),
        mediaStampe: media.data ? Number(media.data) : null,
      }
    },
  })
}
