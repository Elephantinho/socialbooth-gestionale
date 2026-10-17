import type { Enum } from '@/shared/types/database'

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
  const costi = Math.round(spese.reduce((t, s) => t + Number(s.importo), 0) * 100) / 100
  const margine = r == null ? null : Math.round((r - costi) * 100) / 100
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

export type Per = 'mese' | 'evento' | 'operatore' | 'regione'

export type EventoConti = {
  id: string; allestimento_il: string; regione: string
  operatore: { id: string; nome: string; cognome: string | null } | null
  conti: Conti
  spese: { importo: number; pagata_con: PagataCon; operatore_id: string | null }[]
}

export type Gruppo = {
  chiave: string; etichetta: string; eventi: number
  ricavi: number; costi: number; margine: number; percentuale: number | null
  senzaPrezzo: number; daRimborsare: number
}

const meseRoma = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }).slice(0, 7)
const nomeMeseIt = (m: string) => { const t = new Date(`${m}-15T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }); return t[0].toUpperCase() + t.slice(1) }

/** Somma ricavi, costi e margine degli eventi divisi per mese, evento, operatore o regione. */
export function raggruppa(eventi: EventoConti[], per: Per, nomeEvento: (e: EventoConti) => string = (e) => e.id): Gruppo[] {
  const gruppi = new Map<string, Gruppo>()
  for (const e of eventi) {
    const [chiave, etichetta] =
      per === 'mese' ? [meseRoma(e.allestimento_il), nomeMeseIt(meseRoma(e.allestimento_il))]
      : per === 'regione' ? [e.regione, e.regione]
      : per === 'operatore' ? (e.operatore ? [e.operatore.id, `${e.operatore.nome} ${e.operatore.cognome ?? ''}`.trim()] : ['-', 'Senza operatore'])
      : [e.id, nomeEvento(e)]
    const g = gruppi.get(chiave) ?? { chiave, etichetta, eventi: 0, ricavi: 0, costi: 0, margine: 0, percentuale: null, senzaPrezzo: 0, daRimborsare: 0 }
    const b = bilancio(e.conti, e.spese)
    g.eventi += 1
    g.ricavi += b.ricavo ?? 0
    g.costi += b.costi
    if (b.ricavo == null) g.senzaPrezzo += 1
    g.daRimborsare += e.spese.filter((s) => s.pagata_con === 'operatore').reduce((t, s) => t + Number(s.importo), 0)
    gruppi.set(chiave, g)
  }
  const tondo = (n: number) => Math.round(n * 100) / 100
  return [...gruppi.values()].map((g) => {
    const ricavi = tondo(g.ricavi), costi = tondo(g.costi), margine = tondo(g.ricavi - g.costi)
    return { ...g, ricavi, costi, margine, daRimborsare: tondo(g.daRimborsare), percentuale: ricavi ? Math.round((margine / ricavi) * 100) : null }
  })
}
