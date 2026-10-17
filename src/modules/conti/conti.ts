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
