// Giorni e mesi del calendario italiano.
// Un "giorno" è una stringa "2026-10-18" e un "mese" è "2026-10", sempre letti all'ora di Roma:
// così un evento alle 00:30 del 1° novembre cade a novembre anche se in UTC è ancora il 31 ottobre.

const FUSO = 'Europe/Rome'
const GIORNO_MS = 86_400_000

type Istante = string | number | Date

/** Istante → "2026-10-18" (giorno italiano) */
export const giornoRoma = (t: Istante) => new Date(t).toLocaleDateString('sv-SE', { timeZone: FUSO })

/** Istante → "2026-10" (mese italiano) */
export const meseRoma = (t: Istante) => giornoRoma(t).slice(0, 7)

/** "2026-10-18" + 3 → "2026-10-21" (anche indietro, con n negativo) */
export function piuGiorni(giorno: string, n: number): string {
  const d = new Date(`${giorno}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** "2026-10" + 1 → "2026-11" */
export function piuMesi(mese: string, n: number): string {
  const [a, m] = mese.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + n, 15))
  return d.toISOString().slice(0, 7)
}

/** Primo istante del mese e del mese dopo (per le letture dal database) */
export function confiniMese(mese: string): { dal: Date; al: Date } {
  const [a, m] = mese.split('-').map(Number)
  return { dal: new Date(a, m - 1, 1), al: new Date(a, m, 1) }
}

/** Gli ultimi n mesi a partire da "mese", dal più recente: ["2026-10", "2026-09", …] */
export const ultimiMesi = (mese: string, n: number) => Array.from({ length: n }, (_, i) => piuMesi(mese, -i))

export const maiuscola = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t)

/** Formatta un giorno "2026-10-18" senza spostamenti di fuso */
const formatta = (giorno: string, opzioni: Intl.DateTimeFormatOptions) =>
  new Date(`${giorno}T12:00:00Z`).toLocaleDateString('it-IT', { timeZone: 'UTC', ...opzioni })

/** "2026-10" → "Ottobre 2026" */
export const nomeMese = (mese: string) => maiuscola(formatta(`${mese}-15`, { month: 'long', year: 'numeric' }))

/** "2026-10-18" → "Dom 18 ott" */
export const giornoBreve = (giorno: string) => maiuscola(formatta(giorno, { weekday: 'short', day: 'numeric', month: 'short' }).replaceAll('.', ''))

/** "2026-10-18" → "domenica 18 ottobre" (con l'anno se diverso da "anno") */
export const giornoLungo = (giorno: string, anno?: number) =>
  formatta(giorno, { weekday: 'long', day: 'numeric', month: 'long', ...(anno && Number(giorno.slice(0, 4)) !== anno && { year: 'numeric' }) })

/** Titolo di un giorno rispetto a oggi: "Oggi, sabato 17 ottobre", "Domani, …", "Ieri, …", "Lunedì 19 ottobre" */
export function titoloGiorno(giorno: string, oggi: string): string {
  const testo = giornoLungo(giorno, Number(oggi.slice(0, 4)))
  if (giorno === oggi) return `Oggi, ${testo}`
  if (giorno === piuGiorni(oggi, 1)) return `Domani, ${testo}`
  if (giorno === piuGiorni(oggi, -1)) return `Ieri, ${testo}`
  return maiuscola(testo)
}

/** "17 – 23 ottobre", oppure "28 ottobre – 3 novembre" */
export function intervalloGiorni(da: string, a: string): string {
  return da.slice(0, 7) === a.slice(0, 7)
    ? `${formatta(da, { day: 'numeric' })} – ${formatta(a, { day: 'numeric', month: 'long' })}`
    : `${formatta(da, { day: 'numeric', month: 'long' })} – ${formatta(a, { day: 'numeric', month: 'long' })}`
}

/** Giorni tra due giorni del calendario: ("2026-10-18", "2026-10-21") → 3 */
export const giorniTra = (da: string, a: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${da}T12:00:00Z`)) / GIORNO_MS)
