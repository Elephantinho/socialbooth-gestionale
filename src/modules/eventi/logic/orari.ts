// Regole pure sugli orari degli eventi: nessun accesso al database, facili da testare.

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

