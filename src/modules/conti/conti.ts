import type { Enum } from '@/shared/types/database'
import { giornoRoma, giorniTra, meseRoma, nomeMese } from '@/shared/lib/date'

/** Arrotonda ai centesimi (le somme di decimali lasciano code tipo 0.30000000000000004) */
const tondo = (n: number) => Math.round(n * 100) / 100

export type Voce = Enum<'voce_spesa'>
export type PagataCon = Enum<'pagata_con'>

export const VOCI: { id: Voce; etichetta: string }[] = [
  { id: 'noleggio', etichetta: 'Noleggio' },
  { id: 'carburante', etichetta: 'Carburante' },
  { id: 'pedaggi', etichetta: 'Pedaggi' },
  { id: 'parcheggio', etichetta: 'Parcheggio' },
  { id: 'vitto', etichetta: 'Vitto' },
  { id: 'alloggio', etichetta: 'Alloggio' },
  { id: 'materiali', etichetta: 'Materiali' },
  { id: 'altro', etichetta: 'Altro' },
]
export const etichettaVoce = (v: Voce) => VOCI.find((x) => x.id === v)?.etichetta ?? v

export const PAGATA_CON: Record<PagataCon, string> = {
  carta_aziendale: 'Carta aziendale',
  operatore: "Di tasca dell'operatore",
  azienda: "Pagata dall'azienda",
}

type Conti = { prezzo: number | null; fattura_importo: number | null } | null | undefined

/** Il ricavo è la fattura; finché non c'è, il prezzo concordato. */
export function ricavo(c: Conti): number | null {
  if (!c) return null
  return c.fattura_importo ?? c.prezzo ?? null
}

/** Ricavo, costi, margine in euro e in percentuale sul ricavo */
export function bilancio(c: Conti, spese: { importo: number }[]) {
  const r = ricavo(c)
  const costi = tondo(spese.reduce((t, s) => t + Number(s.importo), 0))
  const margine = r == null ? null : tondo(r - costi)
  const percentuale = r && margine != null ? Math.round((margine / r) * 100) : null
  return { ricavo: r, costi, margine, percentuale }
}

// "always": anche 1.400,00 € col punto (in italiano di solito si omette sotto i 10.000)
const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' as unknown as boolean })
export const euro = (n: number | null | undefined) => (n == null ? '—' : fmt.format(n))

/** "45,50" o "45.50" → 45.5; testo non valido → null */
export function leggiImporto(t: string): number | null {
  const pulito = t.trim().replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(pulito)) return null
  return Number(pulito)
}

/* ---------- Raggruppare i conti ---------- */

type Per = 'anno' | 'mese' | 'evento' | 'operatore' | 'regione'

export type EventoConti = {
  id: string; allestimento_il: string; regione: string
  operatore: { id: string; nome: string; cognome: string | null } | null
  conti: Conti
  spese: {
    importo: number; pagata_con: PagataCon; operatore_id: string | null; voce?: Voce
    operatore?: { id: string; nome: string; cognome: string | null } | null
  }[]
}

type Gruppo = {
  chiave: string; etichetta: string; eventi: number
  ricavi: number; costi: number; margine: number; percentuale: number | null
}


/** Somma ricavi, costi e margine degli eventi divisi per mese, evento, operatore o regione. */
export function raggruppa(eventi: EventoConti[], per: Per, nomeEvento: (e: EventoConti) => string = (e) => e.id): Gruppo[] {
  const gruppi = new Map<string, Gruppo>()
  for (const e of eventi) {
    const [chiave, etichetta] =
      per === 'anno' ? [meseRoma(e.allestimento_il).slice(0, 4), meseRoma(e.allestimento_il).slice(0, 4)]
      : per === 'mese' ? [meseRoma(e.allestimento_il), nomeMese(meseRoma(e.allestimento_il))]
      : per === 'regione' ? [e.regione, e.regione]
      : per === 'operatore' ? (e.operatore ? [e.operatore.id, `${e.operatore.nome} ${e.operatore.cognome ?? ''}`.trim()] : ['-', 'Senza operatore'])
      : [e.id, nomeEvento(e)]
    const g = gruppi.get(chiave) ?? { chiave, etichetta, eventi: 0, ricavi: 0, costi: 0, margine: 0, percentuale: null }
    const b = bilancio(e.conti, e.spese)
    g.eventi += 1
    g.ricavi += b.ricavo ?? 0
    g.costi += b.costi
    gruppi.set(chiave, g)
  }
  return [...gruppi.values()].map((g) => {
    const ricavi = tondo(g.ricavi), costi = tondo(g.costi), margine = tondo(g.ricavi - g.costi)
    return { ...g, ricavi, costi, margine, percentuale: ricavi ? Math.round((margine / ricavi) * 100) : null }
  })
}

/** Totali di un insieme di eventi: ricavi, costi, margine */
export function totali(eventi: (EventoConti & { stato: string; conti: (Conti & { fattura_numero?: string | null; incassata?: boolean }) | null })[]) {
  const g = raggruppa(eventi, 'regione')
  const somma = (k: 'ricavi' | 'costi') => tondo(g.reduce((t, x) => t + x[k], 0))
  const ricavi = somma('ricavi'), costi = somma('costi')
  return {
    ricavi, costi, margine: tondo(ricavi - costi),
    percentuale: ricavi ? Math.round(((ricavi - costi) / ricavi) * 100) : null,
  }
}

/** I dodici mesi di un anno, anche quelli senza eventi (a zero), da gennaio a dicembre */
export function mesiDellAnno(eventi: EventoConti[], anno: number): Gruppo[] {
  const trovati = new Map(raggruppa(eventi, 'mese').map((g) => [g.chiave, g]))
  return Array.from({ length: 12 }, (_, i) => {
    const chiave = `${anno}-${String(i + 1).padStart(2, '0')}`
    return trovati.get(chiave) ?? { chiave, etichetta: nomeMese(chiave), eventi: 0, ricavi: 0, costi: 0, margine: 0, percentuale: null }
  })
}

const nomePersona = (p: { nome: string; cognome: string | null }) => `${p.nome} ${p.cognome ?? ''}`.trim()

type SpeseDiOperatore = {
  id: string; nome: string
  eventi: number                 // eventi del periodo in cui ha lavorato o speso
  totale: number                 // tutto quello che ha speso
  perVoce: { voce: Voce; importo: number }[]   // dalla voce più alta
  mediaPerEvento: number | null
}

/**
 * Quanto spende ogni operatore: le spese segnate a suo nome (carta aziendale o di tasca),
 * divise per voce. Le spese pagate dall'azienda senza operatore (es. un noleggio) non sono sue.
 * Dalla spesa più alta alla più bassa.
 */
export function spesePerOperatore(eventi: EventoConti[]): SpeseDiOperatore[] {
  const mappa = new Map<string, SpeseDiOperatore & { eventiVisti: Set<string>; voci: Map<Voce, number> }>()
  const prendi = (id: string, nome: string) => {
    let o = mappa.get(id)
    if (!o) { o = { id, nome, eventi: 0, totale: 0, perVoce: [], mediaPerEvento: null, eventiVisti: new Set(), voci: new Map() }; mappa.set(id, o) }
    return o
  }
  for (const e of eventi) {
    if (e.operatore) prendi(e.operatore.id, nomePersona(e.operatore)).eventiVisti.add(e.id)
    for (const s of e.spese) {
      if (!s.operatore_id) continue
      const chi = s.operatore ?? (e.operatore?.id === s.operatore_id ? e.operatore : null)
      const o = prendi(s.operatore_id, chi ? nomePersona(chi) : 'Operatore')
      const importo = Number(s.importo)
      o.eventiVisti.add(e.id)
      o.totale += importo
      const voce = s.voce ?? 'altro'
      o.voci.set(voce, (o.voci.get(voce) ?? 0) + importo)
    }
  }
  return [...mappa.values()]
    .map(({ eventiVisti, voci, ...o }) => ({
      ...o, eventi: eventiVisti.size, totale: tondo(o.totale),
      perVoce: [...voci].map(([voce, importo]) => ({ voce, importo: tondo(importo) })).toSorted((a, b) => b.importo - a.importo),
      mediaPerEvento: eventiVisti.size ? tondo(o.totale / eventiVisti.size) : null,
    }))
    .toSorted((a, b) => b.totale - a.totale || a.nome.localeCompare(b.nome))
}

/* ---------- Rimborsi ---------- */

type SpesaDiTasca = { id: string; importo: number; creato_il: string; operatore: { id: string; nome: string; cognome: string | null } | null }

/** Spese pagate di tasca divise per operatore: chi deve ricevere di più per primo, le spese dalla più vecchia */
export function rimborsiPerOperatore<S extends SpesaDiTasca>(spese: S[]) {
  const mappa = new Map<string, { id: string; nome: string; totale: number; spese: S[] }>()
  for (const s of spese) {
    if (!s.operatore) continue
    const o = mappa.get(s.operatore.id) ?? { id: s.operatore.id, nome: nomePersona(s.operatore), totale: 0, spese: [] }
    o.totale += Number(s.importo)
    o.spese.push(s)
    mappa.set(o.id, o)
  }
  return [...mappa.values()]
    .map((o) => ({ ...o, totale: tondo(o.totale), spese: o.spese.toSorted((a, b) => a.creato_il.localeCompare(b.creato_il)) }))
    .toSorted((a, b) => b.totale - a.totale || a.nome.localeCompare(b.nome))
}

/* ---------- Incassi ---------- */

/** Dopo quanti giorni una fattura non incassata è "in ritardo" */
export const GIORNI_PER_INCASSARE = 30

type FatturaAperta = { fattura_data: string | null; fattura_importo: number | null; prezzo: number | null; evento: { allestimento_il: string } }

/** L'importo da incassare: quello della fattura, altrimenti il prezzo concordato */
export const importoFattura = (f: Pick<FatturaAperta, 'fattura_importo' | 'prezzo'>) => Number(f.fattura_importo ?? f.prezzo ?? 0)

/** Da quanti giorni aspetta: dalla data della fattura, o dall'evento se la data manca */
export const giorniInAttesa = (f: FatturaAperta, oggi: string) =>
  Math.max(0, giorniTra(f.fattura_data ?? giornoRoma(f.evento.allestimento_il), oggi))

/** Totale da incassare e quanto è in ritardo */
export function riepilogoIncassi(fatture: FatturaAperta[], oggi: string) {
  const inRitardo = fatture.filter((f) => giorniInAttesa(f, oggi) > GIORNI_PER_INCASSARE)
  return {
    totale: tondo(fatture.reduce((t, f) => t + importoFattura(f), 0)),
    inRitardo: inRitardo.length,
    totaleInRitardo: tondo(inRitardo.reduce((t, f) => t + importoFattura(f), 0)),
  }
}
