// Formattazione di date, orari e durate in italiano.

const fuso = 'Europe/Rome'

export const ora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: fuso }) : '—'

/** "Mar 28 ottobre" */
export const dataBreve = (iso: string) => {
  const s = new Date(iso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', timeZone: fuso })
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '')
}

/** "Martedì 28 ottobre" */
export const dataLunga = (iso: string) => {
  const s = new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: fuso })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "tra 12 giorni", "domani", "oggi" */
export const traQuanto = (iso: string) => {
  const inizioGiorno = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const giorni = Math.round((inizioGiorno(new Date(iso)) - inizioGiorno(new Date())) / 86_400_000)
  if (giorni === 0) return 'oggi'
  if (giorni === 1) return 'domani'
  if (giorni < 0) return 'passato'
  return `tra ${giorni} giorni`
}

/** 315 → "5 h 15 min" */
export const durata = (minuti: number | null | undefined) => {
  if (!minuti) return '0 min'
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ')
}

export const euro = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

/** Iniziali per gli avatar: "Altea Mascolo" → "AM" */
export const iniziali = (nome: string | null | undefined) =>
  (nome ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

/** Unisce data (yyyy-mm-dd) e ora (hh:mm) in un ISO con il fuso italiano corretto. */
export function combinaDataOra(data: string, orario: string): string {
  // Calcola l'offset di Roma per quella data (gestisce ora legale/solare)
  const provvisoria = new Date(`${data}T${orario}:00Z`)
  const roma = new Date(provvisoria.toLocaleString('en-US', { timeZone: fuso }))
  const utc = new Date(provvisoria.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offsetMin = (roma.getTime() - utc.getTime()) / 60_000
  return new Date(provvisoria.getTime() - offsetMin * 60_000).toISOString()
}
