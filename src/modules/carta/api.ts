import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'
import { statoCarta, type StatoCarta } from './logic/scorta'
import { usePuo } from '@/modules/auth/permessi'

// Scorta di carta degli operatori: quanta ne hanno, quanta ne serve, ricariche.

const STATI_ASSEGNATI = ['proposto', 'confermato', 'in_corso'] as const

/** Soglia, stampe per confezione e media di stampe per evento */
export function useParametriCarta() {
  return useQuery({
    queryKey: ['carta', 'parametri'],
    queryFn: async () => {
      const righe = ok(await supabase.from('impostazioni').select('chiave, valore')
        .in('chiave', ['soglia_carta', 'stampe_per_confezione']))
      const v = (k: string) => righe.find((r) => r.chiave === k)?.valore
      const media = ok(await supabase.rpc('media_stampe_per_evento')) as number | null
      return {
        soglia: Number(v('soglia_carta') ?? 200),
        perConfezione: Number(v('stampe_per_confezione') ?? 700),
        media: media ? Number(media) : null,
      }
    },
    staleTime: 60_000,
  })
}

export type ScortaOperatore = StatoCarta & {
  id: string; nome: string; cognome: string; foto: string | null
  regioni: string[]; prossimiEventi: number
}

/** Scorta di tutti gli operatori attivi, con il fabbisogno dei prossimi eventi. Prima i più urgenti. */
export function useScorteCarta() {
  const parametri = useParametriCarta()
  const query = useQuery({
    queryKey: ['carta', 'scorte', parametri.data],
    enabled: !!parametri.data,
    refetchInterval: 60_000,
    queryFn: async (): Promise<ScortaOperatore[]> => {
      const p = parametri.data!
      const [operatori, eventi] = await Promise.all([
        supabase.from('profili').select('id, nome, cognome, foto, carta_disponibile, carta_aggiornata_il, zone:zone_operatore(regione)')
          .eq('ruolo', 'operatore').eq('attivo', true),
        supabase.from('eventi').select('operatore_id, tipo_booth:tipi_booth(stampa)')
          .in('stato', [...STATI_ASSEGNATI]).gte('smontaggio_il', new Date().toISOString()).not('operatore_id', 'is', null),
      ])
      // Contano solo gli eventi con un servizio che stampa (il Videobooth 360 non consuma carta)
      const prossimi = new Map<string, number>()
      for (const e of ok(eventi)) if (e.tipo_booth?.stampa !== false) prossimi.set(e.operatore_id!, (prossimi.get(e.operatore_id!) ?? 0) + 1)
      const ordine = { finita: 0, bassa: 1, da_impostare: 2, ok: 3 }
      return ok(operatori).map((o) => ({
        id: o.id, nome: o.nome, cognome: o.cognome, foto: o.foto,
        regioni: (o.zone ?? []).map((z) => z.regione),
        prossimiEventi: prossimi.get(o.id) ?? 0,
        ...statoCarta(o.carta_disponibile, p.soglia, prossimi.get(o.id) ?? 0, p.media, !!o.carta_aggiornata_il),
      })).sort((a, b) => ordine[a.livello] - ordine[b.livello] || a.disponibili - b.disponibili)
    },
  })
  return { ...query, parametri: parametri.data }
}

/**
 * Le scorte che interessano a chi guarda: chi gestisce la squadra vede tutti gli operatori,
 * il project solo quelli che lavorano ai suoi prossimi eventi.
 */
export function useScorteVisibili() {
  const tutti = usePuo()('operatori.vedi')
  const q = useScorteCarta()
  return { ...q, data: tutti ? q.data : q.data?.filter((o) => o.prossimiEventi > 0) }
}

/** Scorta di un solo operatore (pagina operatore lato gestione e profilo dell'operatore) */
export function useScortaOperatore(id: string | undefined) {
  const parametri = useParametriCarta()
  return useQuery({
    queryKey: ['carta', 'operatore', id, parametri.data],
    enabled: !!id && !!parametri.data,
    queryFn: async () => {
      const p = parametri.data!
      const [profilo, eventi, movimenti] = await Promise.all([
        supabase.from('profili').select('carta_disponibile, carta_aggiornata_il').eq('id', id!).single(),
        supabase.from('eventi').select('id, tipo_booth:tipi_booth(stampa)').eq('operatore_id', id!)
          .in('stato', [...STATI_ASSEGNATI]).gte('smontaggio_il', new Date().toISOString()),
        supabase.from('movimenti_carta').select('*, evento:eventi(citta, allestimento_il)')
          .eq('operatore_id', id!).order('creato_il', { ascending: false }).limit(15),
      ])
      const prossimi = ok(eventi).filter((e) => e.tipo_booth?.stampa !== false).length
      return {
        ...statoCarta(ok(profilo).carta_disponibile, p.soglia, prossimi, p.media, !!ok(profilo).carta_aggiornata_il),
        prossimiEventi: prossimi,
        movimenti: ok(movimenti),
        parametri: p,
      }
    },
  })
}

function useInvalidaCarta() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['carta'] })
    qc.invalidateQueries({ queryKey: ['operatori'] })
  }
}

/** Project/admin mandano carta a un operatore */
export function useInviaRicarica() {
  const invalida = useInvalidaCarta()
  return useMutation({
    mutationFn: async (v: { operatore: string; stampe: number; note?: string }) =>
      ok(await supabase.rpc('invia_ricarica_carta', { p_operatore: v.operatore, p_stampe: v.stampe, p_note: v.note || undefined })),
    onSuccess: invalida,
  })
}

/** L'operatore (o la gestione) conta la carta rimasta e corregge la scorta */
export function useSegnalaCarta() {
  const invalida = useInvalidaCarta()
  return useMutation({
    mutationFn: async (v: { stampe: number; operatore?: string }) =>
      ok(await supabase.rpc('segnala_carta', { p_stampe: v.stampe, p_operatore: v.operatore })),
    onSuccess: invalida,
  })
}
