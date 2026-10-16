// Regole pure sulla scorta di carta di un operatore.

export type LivelloCarta = 'ok' | 'bassa' | 'finita' | 'da_impostare'

/** Livelli che chiedono una ricarica */
export const daRicaricare = (l: LivelloCarta) => l === 'bassa' || l === 'finita'

export type StatoCarta = {
  livello: LivelloCarta
  disponibili: number
  /** stampe che serviranno per i prossimi eventi già assegnati (media × eventi) */
  fabbisogno: number
  /** quanti dei prossimi eventi riesce a coprire con la carta che ha */
  eventiCoperti: number | null
  /** stampe da mandare per arrivare sopra soglia e coprire i prossimi eventi */
  daMandare: number
}

/**
 * Rossa quando è finita; arancione/rossa quando è sotto la soglia
 * o non basta per i prossimi eventi già assegnati.
 * "Da impostare" se nessuno ha mai registrato quanta carta ha (operatore nuovo): niente allarmi finti.
 */
export function statoCarta(disponibili: number, soglia: number, prossimiEventi: number, mediaPerEvento: number | null, impostata = true): StatoCarta {
  const media = mediaPerEvento && mediaPerEvento > 0 ? mediaPerEvento : 0
  const fabbisogno = Math.round(prossimiEventi * media)
  const livello: LivelloCarta = !impostata ? 'da_impostare'
    : disponibili <= 0 ? 'finita' : disponibili < soglia || disponibili < fabbisogno ? 'bassa' : 'ok'
  return {
    livello,
    disponibili,
    fabbisogno,
    eventiCoperti: media ? Math.floor(disponibili / media) : null,
    daMandare: Math.max(0, Math.max(soglia, fabbisogno + soglia) - disponibili),
  }
}

/** Arrotonda alle confezioni intere: 1 confezione = N stampe */
export const confezioniPer = (stampe: number, perConfezione: number) => Math.max(1, Math.ceil(stampe / Math.max(1, perConfezione)))
