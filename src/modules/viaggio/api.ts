// Calcolo automatico di posizioni e tempi di viaggio.
//
// Usa servizi gratuiti basati su OpenStreetMap:
//  - Nominatim per trasformare un indirizzo in coordinate
//  - OSRM per il tempo di percorrenza in auto
// Vanno bene per l'uso di un gestionale (poche richieste). Se un giorno servisse
// il traffico in tempo reale, si sostituisce solo questo file con Google Maps.

export type Punto = { lat: number; lng: number }

/** Indirizzo → coordinate. Restituisce null se non trovato. */
export async function trovaCoordinate(indirizzo: string, citta: string): Promise<Punto | null> {
  const q = [indirizzo, citta, 'Italia'].filter(Boolean).join(', ')
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { headers: { 'Accept-Language': 'it' } })
  if (!r.ok) return null
  const dati = (await r.json()) as { lat: string; lon: string }[]
  return dati[0] ? { lat: Number(dati[0].lat), lng: Number(dati[0].lon) } : null
}

/** Minuti in auto tra due punti, arrotondati per eccesso a 5 minuti. */
export async function minutiInAuto(da: Punto, a: Punto): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${da.lng},${da.lat};${a.lng},${a.lat}?overview=false`
  const r = await fetch(url)
  if (!r.ok) return null
  const dati = (await r.json()) as { routes?: { duration: number }[] }
  const secondi = dati.routes?.[0]?.duration
  return secondi == null ? null : arrotondaA5(secondi / 60)
}

/** 23.2 → 25. Non meno di 5 minuti. */
export const arrotondaA5 = (minuti: number) => Math.max(5, Math.ceil(minuti / 5) * 5)

/** Link per aprire il navigatore sul telefono */
export const linkNavigatore = (indirizzo: string, citta: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${indirizzo}, ${citta}`)}`
