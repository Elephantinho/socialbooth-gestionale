// Informazioni automatiche sul luogo dell'evento, da servizi gratuiti:
//  - OpenStreetMap (Overpass) per ZTL, parcheggi e servizi vicini
//  - Open-Meteo per le previsioni del tempo
// Sono dati della comunità: utilissimi, ma da considerare indicativi.
import { useQuery } from '@tanstack/react-query'
import { trovaCoordinate, type Punto } from '@/modules/viaggio/api'

const OVERPASS = 'https://overpass-api.de/api/interpreter'

export type Parcheggio = {
  id: string
  nome: string
  tipo: 'gratuito' | 'pagamento' | 'strisce_bianche' | 'da_verificare'
  dettaglio: string
  punto: Punto
  distanza: number   // metri
}

export type Servizio = { id: string; nome: string; categoria: 'carburante' | 'bar' | 'ferramenta' | 'supermercato'; punto: Punto; distanza: number }

export type Dintorni = {
  ztl: { stato: 'dentro' | 'vicino' | 'non_rilevata'; dettaglio?: string }
  parcheggi: Parcheggio[]
  servizi: Servizio[]
}

type ElementoOsm = {
  type: 'node' | 'way' | 'relation' | 'area'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/** Distanza in metri tra due punti (formula dell'emisenoverso) */
export function distanza(a: Punto, b: Punto) {
  const R = 6_371_000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(x)))
}

export async function cercaDintorni(p: Punto): Promise<Dintorni> {
  const { lat, lng } = p
  const query = `
    [out:json][timeout:25];
    is_in(${lat},${lng})->.dentro;
    (
      area.dentro["boundary"="low_emission_zone"];
      area.dentro["name"~"ZTL|[Tt]raffico [Ll]imitato"];
    )->.ztl;
    .ztl out tags;
    (
      nwr(around:350,${lat},${lng})["name"~"ZTL|[Vv]archi|[Tt]raffico [Ll]imitato"];
      nwr(around:350,${lat},${lng})["boundary"="low_emission_zone"];
    )->.vicino;
    .vicino out center tags;
    nwr(around:700,${lat},${lng})["amenity"="parking"]["access"!~"private|customers|no"];
    out center tags;
    way(around:450,${lat},${lng})[~"^parking:(both|left|right)(:fee)?$"~"."];
    out center tags;
    nwr(around:3000,${lat},${lng})["amenity"="fuel"];
    out center tags 5;
    nwr(around:400,${lat},${lng})["amenity"~"^(cafe|bar)$"];
    out center tags 5;
    nwr(around:2500,${lat},${lng})["shop"~"^(hardware|doityourself)$"];
    out center tags 3;
    nwr(around:1500,${lat},${lng})["shop"="supermarket"];
    out center tags 3;
  `
  const r = await fetch(OVERPASS, { method: 'POST', body: new URLSearchParams({ data: query }) })
  if (!r.ok) throw new Error('Servizio mappe non disponibile, riprova tra poco')
  const { elements } = (await r.json()) as { elements: ElementoOsm[] }

  const punto = (e: ElementoOsm): Punto | null =>
    e.lat != null && e.lon != null ? { lat: e.lat, lng: e.lon } : e.center ? { lat: e.center.lat, lng: e.center.lon } : null

  // ZTL
  const aree = elements.filter((e) => e.type === 'area')
  const vicine = elements.filter((e) => e.type !== 'area' && (e.tags?.boundary === 'low_emission_zone' || /ZTL|varchi|traffico limitato/i.test(e.tags?.name ?? '')))
  const ztl: Dintorni['ztl'] = aree.length
    ? { stato: 'dentro', dettaglio: aree[0].tags?.name ?? 'Zona a traffico limitato' }
    : vicine.length
      ? { stato: 'vicino', dettaglio: vicine[0].tags?.name ?? 'ZTL nelle vicinanze' }
      : { stato: 'non_rilevata' }

  // Parcheggi
  const parcheggi: Parcheggio[] = []
  for (const e of elements) {
    const t = e.tags ?? {}
    const pos = punto(e)
    if (!pos) continue
    if (t.amenity === 'parking') {
      const gratuito = t.fee === 'no'
      const pagamento = t.fee === 'yes' || t.fee?.includes('€')
      parcheggi.push({
        id: `${e.type}${e.id}`,
        nome: t.name ?? (t.parking === 'multi-storey' ? 'Parcheggio multipiano' : t.parking === 'underground' ? 'Parcheggio sotterraneo' : 'Parcheggio'),
        tipo: gratuito ? 'gratuito' : pagamento ? 'pagamento' : 'da_verificare',
        dettaglio: [t.capacity && `${t.capacity} posti`, t.maxstay && `max ${t.maxstay}`, t.opening_hours].filter(Boolean).join(', '),
        punto: pos,
        distanza: distanza(p, pos),
      })
    } else if (Object.keys(t).some((k) => k.startsWith('parking:'))) {
      // Sosta lungo la strada: strisce bianche se gratuita
      const fee = t['parking:both:fee'] ?? t['parking:right:fee'] ?? t['parking:left:fee'] ?? t['parking:fee']
      const nessuna = ['no', 'no_parking', 'no_stopping', 'separate'].includes(t['parking:both'] ?? t['parking:right'] ?? t['parking:left'] ?? '')
      if (nessuna) continue
      parcheggi.push({
        id: `${e.type}${e.id}`,
        nome: t.name ? `Sosta in ${t.name}` : 'Sosta su strada',
        tipo: fee === 'no' ? 'strisce_bianche' : fee === 'yes' ? 'pagamento' : 'da_verificare',
        dettaglio: fee === 'no' ? 'Sosta lungo la strada senza pagamento' : fee === 'yes' ? 'Strisce blu' : 'Tipo di sosta non indicato',
        punto: pos,
        distanza: distanza(p, pos),
      })
    }
  }
  const ordine = { strisce_bianche: 0, gratuito: 0, da_verificare: 1, pagamento: 2 }
  parcheggi.sort((a, b) => a.distanza - b.distanza || ordine[a.tipo] - ordine[b.tipo])

  // Servizi utili
  const servizi: Servizio[] = elements.flatMap((e) => {
    const t = e.tags ?? {}
    const pos = punto(e)
    if (!pos) return []
    const categoria = t.amenity === 'fuel' ? 'carburante' : t.amenity === 'cafe' || t.amenity === 'bar' ? 'bar'
      : t.shop === 'hardware' || t.shop === 'doityourself' ? 'ferramenta' : t.shop === 'supermarket' ? 'supermercato' : null
    if (!categoria) return []
    return [{ id: `${e.type}${e.id}`, nome: t.name ?? t.brand ?? '', categoria, punto: pos, distanza: distanza(p, pos) } as Servizio]
  }).sort((a, b) => a.distanza - b.distanza)

  return { ztl, parcheggi: dedup(parcheggi).slice(0, 12), servizi }
}

const dedup = <T extends { nome: string; distanza: number; tipo?: string }>(l: T[]) =>
  l.filter((x, i) => l.findIndex((y) => y.nome === x.nome && y.tipo === x.tipo && Math.abs(y.distanza - x.distanza) < 60) === i)

/* ---------------- Meteo ---------------- */

export type Meteo = { data: string; max: number; min: number; pioggia: number; vento: number; codice: number } | null

/** Previsioni per il giorno dell'evento (disponibili fino a 16 giorni prima) */
export async function meteoDelGiorno(p: Punto, data: string): Promise<Meteo | 'troppo_presto' | 'passato'> {
  const giorni = (new Date(data).getTime() - Date.now()) / 86_400_000
  if (giorni > 15) return 'troppo_presto'
  if (giorni < -1) return 'passato'
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=Europe%2FRome&start_date=${data}&end_date=${data}`
  const r = await fetch(url)
  if (!r.ok) return null
  const d = (await r.json()).daily
  if (!d?.time?.length) return null
  return {
    data, max: Math.round(d.temperature_2m_max[0]), min: Math.round(d.temperature_2m_min[0]),
    pioggia: d.precipitation_probability_max[0] ?? 0, vento: Math.round(d.wind_speed_10m_max[0] ?? 0), codice: d.weather_code[0],
  }
}

export function descriviMeteo(codice: number) {
  if (codice === 0) return 'Sereno'
  if (codice <= 3) return 'Poco nuvoloso'
  if (codice <= 48) return 'Nebbia'
  if (codice <= 67) return 'Pioggia'
  if (codice <= 77) return 'Neve'
  if (codice <= 82) return 'Rovesci'
  return 'Temporale'
}

/* ---------------- Hook ---------------- */

/** Posizione dell'evento: quella salvata, altrimenti la cerca dall'indirizzo */
export function usePosizione(salvata: Punto | null, indirizzo: string, citta: string) {
  return useQuery({
    queryKey: ['posizione', indirizzo, citta],
    enabled: !salvata && !!indirizzo,
    staleTime: Infinity,
    queryFn: () => trovaCoordinate(indirizzo, citta),
    initialData: salvata ?? undefined,
  })
}

const chiavePunto = (p: Punto | null | undefined) => (p ? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : '')

export function useDintorni(p: Punto | null | undefined) {
  return useQuery({
    queryKey: ['dintorni', chiavePunto(p)],
    enabled: !!p,
    staleTime: 24 * 3_600_000,
    retry: 1,
    queryFn: () => cercaDintorni(p!),
  })
}

export function useMeteo(p: Punto | null | undefined, data: string) {
  return useQuery({
    queryKey: ['meteo', chiavePunto(p), data],
    enabled: !!p && !!data,
    staleTime: 3 * 3_600_000,
    queryFn: () => meteoDelGiorno(p!, data),
  })
}
