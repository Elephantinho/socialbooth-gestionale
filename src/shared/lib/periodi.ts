// Raggruppamento per settimana e per mese (fuso italiano, settimane dal lunedì).

const fuso = 'Europe/Rome'

/** Data italiana "yyyy-mm-dd" di un ISO */
const giorno = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: fuso })

/** Lunedì della settimana di quella data, "yyyy-mm-dd" */
export function lunediDi(iso: string) {
  const d = new Date(`${giorno(iso)}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export const chiaveMese = (iso: string) => giorno(iso).slice(0, 7)

/** "13–19 ott" */
export function etichettaSettimana(lunedi: string) {
  const inizio = new Date(`${lunedi}T12:00:00Z`)
  const fine = new Date(inizio); fine.setUTCDate(fine.getUTCDate() + 6)
  const g = (d: Date) => d.getUTCDate()
  const m = (d: Date) => d.toLocaleDateString('it-IT', { month: 'short', timeZone: 'UTC' }).replace('.', '')
  return inizio.getUTCMonth() === fine.getUTCMonth() ? `${g(inizio)}–${g(fine)} ${m(fine)}` : `${g(inizio)} ${m(inizio)} – ${g(fine)} ${m(fine)}`
}

/** "ottobre 2026" */
export const etichettaMese = (chiave: string) =>
  new Date(`${chiave}-15T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' })
