/** Filtri della pagina eventi. Le date si leggono all'ora di Roma. */
export type Filtri = { mese?: string; giorno?: string; regione?: string; stato?: 'da_assegnare' | 'proposto' }

type Filtrabile = { allestimento_il: string; regione: string; stato: string }

/** "2026-10-18" all'ora di Roma */
export function giornoRoma(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
}

export function filtra<T extends Filtrabile>(eventi: T[], f: Filtri): T[] {
  return eventi.filter((e) => {
    const giorno = giornoRoma(e.allestimento_il)
    if (f.giorno && giorno !== f.giorno) return false
    if (f.mese && !giorno.startsWith(f.mese)) return false
    if (f.regione && e.regione !== f.regione) return false
    // "Da assegnare" comprende le bozze: in entrambi i casi manca l'operatore
    if (f.stato === 'da_assegnare' && !['da_assegnare', 'bozza'].includes(e.stato)) return false
    if (f.stato === 'proposto' && e.stato !== 'proposto') return false
    return true
  })
}
