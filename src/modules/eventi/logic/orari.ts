// Regole pure sugli orari degli eventi: nessun accesso al database, facili da testare.

/** Minuti di margine tra l'arrivo previsto e l'inizio dell'allestimento. */
export const MARGINE_MINUTI = 20

/** Orario di ritiro al magazzino: allestimento − viaggio − margine. */
export function orarioRitiro(allestimentoIso: string, viaggioMinuti: number, margine = MARGINE_MINUTI): string {
  return new Date(new Date(allestimentoIso).getTime() - (viaggioMinuti + margine) * 60_000).toISOString()
}

/** Minuti in location previsti: dall'allestimento allo smontaggio. */
export function minutiInLocationPrevisti(allestimentoIso: string, smontaggioIso: string): number {
  return Math.max(0, Math.round((new Date(smontaggioIso).getTime() - new Date(allestimentoIso).getTime()) / 60_000))
}

/**
 * Trasforma la data dell'evento e gli orari "hh:mm" in date complete.
 * Se un orario è prima del precedente vuol dire che si va oltre la mezzanotte
 * (es. smontaggio alle 00:30): passa al giorno dopo.
 */
export function costruisciOrari(
  data: string,
  orari: string[],
  combina: (data: string, ora: string) => string,
): string[] {
  const risultato: string[] = []
  let giorno = data
  orari.forEach((o, i) => {
    if (i > 0 && o < orari[i - 1]) giorno = giornoDopo(giorno)
    risultato.push(combina(giorno, o))
  })
  return risultato
}

function giornoDopo(data: string) {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Minuti di viaggio pagati: andata + ritorno dal magazzino. */
export const minutiViaggioPagati = (viaggioMinuti: number | null | undefined) => (viaggioMinuti ?? 0) * 2
