import { useMemo, useState } from 'react'
import { AlertTriangle, Car, CheckCircle2, CloudRain, Coffee, Fuel, Loader2, ShoppingCart, Sun, Wind, Wrench, ChevronDown } from 'lucide-react'
import { descriviMeteo, useDintorni, useMeteo, usePosizione, type Parcheggio, type Servizio } from '../api'
import { linkNavigatore } from '@/modules/viaggio/api'
import { perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Mappa, type Segnaposto } from '@/shared/ui/Mappa'

const coloriParcheggio: Record<Parcheggio['tipo'], { colore: string; etichetta: string; stile: string }> = {
  strisce_bianche: { colore: '#2F9E5C', etichetta: 'Strisce bianche', stile: 'bg-[#E3F4EA] text-[#1E6B3E]' },
  gratuito: { colore: '#2F9E5C', etichetta: 'Gratuito', stile: 'bg-[#E3F4EA] text-[#1E6B3E]' },
  pagamento: { colore: '#2F6FD1', etichetta: 'A pagamento', stile: 'bg-[#E2EEF8] text-[#1F4E79]' },
  da_verificare: { colore: '#98A2B3', etichetta: 'Da verificare', stile: 'bg-sfondo text-tenue' },
}

const iconeServizio: Record<Servizio['categoria'], { Icona: typeof Fuel; etichetta: string }> = {
  carburante: { Icona: Fuel, etichetta: 'Distributore' },
  bar: { Icona: Coffee, etichetta: 'Bar / caffè' },
  ferramenta: { Icona: Wrench, etichetta: 'Ferramenta' },
  supermercato: { Icona: ShoppingCart, etichetta: 'Supermercato' },
}

const metri = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)

type Props = {
  indirizzo: string
  citta: string
  lat: number | null
  lng: number | null
  data: string               // ISO dell'allestimento
  magazzino?: { nome: string; lat: number | null; lng: number | null } | null
  ztlDichiarata?: boolean
  compatto?: boolean         // versione per telefono
}

/** Mappa, ZTL, parcheggi, meteo e servizi vicini al luogo dell'evento */
export function InfoLuogo({ indirizzo, citta, lat, lng, data, magazzino, ztlDichiarata, compatto }: Props) {
  const salvata = lat != null && lng != null ? { lat, lng } : null
  const posizione = usePosizione(salvata, indirizzo, citta)
  const punto = posizione.data ?? null
  const dintorni = useDintorni(punto)
  const meteo = useMeteo(punto, perCampoData(data))
  const [selezionato, setSelezionato] = useState<string>()
  const [aperto, setAperto] = useState(false)

  const segnaposti = useMemo<Segnaposto[]>(() => {
    if (!punto) return []
    const s: Segnaposto[] = [{ id: 'evento', lat: punto.lat, lng: punto.lng, colore: '#16181D', raggio: 11, etichetta: 'Evento', sempre: true }]
    for (const p of dintorni.data?.parcheggi.slice(0, 8) ?? []) {
      s.push({ id: p.id, lat: p.punto.lat, lng: p.punto.lng, colore: coloriParcheggio[p.tipo].colore, raggio: selezionato === p.id ? 10 : 7, etichetta: `${p.nome}, ${coloriParcheggio[p.tipo].etichetta}`, onClick: () => setSelezionato(p.id) })
    }
    return s
  }, [punto, dintorni.data, selezionato])

  const ztl = dintorni.data?.ztl
  const servizi = Object.entries((dintorni.data?.servizi ?? []).reduce<Record<string, Servizio>>((acc, s) => {
    acc[s.categoria] ??= s
    return acc
  }, {}))

  return (
    <Card className="overflow-hidden">
      <div className="p-4 md:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap justify-between gap-3 items-start">
          <div>
            <p className="font-semibold text-[16px]">{indirizzo}</p>
            <p className="text-sm text-tenue">{citta}</p>
          </div>
          <a href={linkNavigatore(indirizzo, citta)} target="_blank" rel="noreferrer"
            className="h-11 px-4 rounded-lg bg-inchiostro text-white font-semibold text-sm inline-flex items-center gap-2">
            <Car className="size-4" aria-hidden /> Naviga
          </a>
        </div>

        {/* ZTL e meteo: si mostrano solo quando c'è qualcosa da dire */}
        <div className="grid gap-2.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] empty:hidden">
          {(ztlDichiarata || ztl || (dintorni.isPending && punto)) && <div className={cn('rounded-xl p-3.5 flex gap-3',
            ztl?.stato === 'dentro' || ztlDichiarata ? 'bg-urgente-tenue text-urgente-testo' : ztl?.stato === 'vicino' ? 'bg-avviso text-avviso-testo' : 'bg-sfondo')}>
            {dintorni.isPending && punto ? <Loader2 className="size-5 animate-spin shrink-0" aria-hidden />
              : ztl?.stato === 'non_rilevata' && !ztlDichiarata ? <CheckCircle2 className="size-5 shrink-0 text-accento-scuro" aria-hidden />
              : <AlertTriangle className="size-5 shrink-0" aria-hidden />}
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                {ztlDichiarata ? 'ZTL indicata dal project' : !ztl ? (dintorni.error ? 'ZTL' : 'Controllo ZTL…') : ztl.stato === 'dentro' ? 'Dentro una ZTL' : ztl.stato === 'vicino' ? 'ZTL nelle vicinanze' : 'Nessuna ZTL rilevata'}
              </p>
              <p className="text-xs opacity-80">
                {ztlDichiarata && !ztl ? 'Serve il permesso per entrare'
                  : !ztl ? (dintorni.error ? 'Controllo non disponibile ora' : 'Controllo in corso…')
                  : ztl.dettaglio ?? (ztl.stato === 'non_rilevata' ? 'Verifica comunque i cartelli' : 'Serve il permesso per entrare')}
              </p>
            </div>
          </div>}

          {((meteo.data && typeof meteo.data === 'object') || (meteo.isPending && punto)) && <div className="rounded-xl p-3.5 bg-sfondo flex gap-3">
            {meteo.data && typeof meteo.data === 'object' && meteo.data.pioggia >= 40
              ? <CloudRain className="size-5 shrink-0 text-[#2F6FD1]" aria-hidden />
              : <Sun className="size-5 shrink-0 text-avviso-icona" aria-hidden />}
            <div className="min-w-0">
              {meteo.isPending && punto ? <p className="text-sm font-semibold">Meteo…</p>
                : meteo.data === 'troppo_presto' ? <><p className="font-semibold text-sm">Meteo</p><p className="text-xs text-tenue">Disponibile 15 giorni prima</p></>
                : meteo.data === 'passato' || !meteo.data ? <><p className="font-semibold text-sm">Meteo</p><p className="text-xs text-tenue">Non disponibile</p></>
                : (
                  <>
                    <p className="font-semibold text-sm">{descriviMeteo(meteo.data.codice)}, {meteo.data.min}°/{meteo.data.max}°</p>
                    <p className="text-xs text-tenue inline-flex items-center gap-2">
                      Pioggia {meteo.data.pioggia}% <Wind className="size-3" aria-hidden /> {meteo.data.vento} km/h
                    </p>
                  </>
                )}
            </div>
          </div>}
        </div>

        {/* Mappa, parcheggi e servizi: chiusi finché non servono */}
        <button type="button" onClick={() => setAperto((a) => !a)} aria-expanded={aperto}
          className="h-11 rounded-lg border border-bordo-forte font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-sfondo">
          <ChevronDown className={cn('size-4 transition', aperto && 'rotate-180')} aria-hidden />
          {aperto ? 'Chiudi' : `Mappa, parcheggi${dintorni.data?.parcheggi.length ? ` (${dintorni.data.parcheggi.length})` : ''} e servizi vicini`}
        </button>
        {aperto && (<>
        {punto ? (
          <Mappa punti={segnaposti} altezza={compatto ? 200 : 260} className="rounded-xl border border-bordo overflow-hidden" />
        ) : (
          <div className="h-32 rounded-xl bg-[#E7EEEA] flex items-center justify-center text-sm text-tenue font-semibold">
            {posizione.isFetching ? <Loader2 className="size-5 animate-spin" aria-hidden /> : 'Posizione non trovata'}
          </div>
        )}
        {/* Parcheggi */}
        <div className="flex flex-col gap-2">
          <TitoloSezione className="text-[15px]">Parcheggi vicini</TitoloSezione>
          {dintorni.isPending && punto ? <p className="text-sm text-tenue inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden /> Caricamento parcheggi…</p>
            : dintorni.error ? <p className="text-sm text-tenue">Parcheggi non disponibili al momento.</p>
            : !dintorni.data?.parcheggi.length ? <p className="text-sm text-tenue">Nessun parcheggio segnato sulle mappe qui vicino.</p>
            : dintorni.data.parcheggi.slice(0, compatto ? 5 : 8).map((p) => {
              const c = coloriParcheggio[p.tipo]
              return (
                <a key={p.id} href={`https://www.google.com/maps/dir/?api=1&destination=${p.punto.lat},${p.punto.lng}`} target="_blank" rel="noreferrer"
                  onMouseEnter={() => setSelezionato(p.id)}
                  className={cn('flex items-center gap-3 rounded-lg border p-2.5 transition', selezionato === p.id ? 'border-accento bg-accento-tenue/40' : 'border-bordo hover:border-bordo-forte')}>
                  <span className="size-3 rounded-full shrink-0" style={{ background: c.colore }} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.nome}</p>
                    {p.dettaglio && <p className="text-xs text-tenue truncate">{p.dettaglio}</p>}
                  </div>
                  <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap', c.stile)}>{c.etichetta}</span>
                  <span className="text-xs font-semibold w-14 text-right">{metri(p.distanza)}</span>
                </a>
              )
            })}
        </div>

        {/* Servizi utili */}
        {servizi.length > 0 && (
          <div className="flex flex-col gap-2">
            <TitoloSezione className="text-[15px]">Servizi utili</TitoloSezione>
            <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
              {servizi.map(([cat, s]) => {
                const { Icona, etichetta } = iconeServizio[cat as Servizio['categoria']]
                return (
                  <a key={s.id} href={`https://www.google.com/maps/dir/?api=1&destination=${s.punto.lat},${s.punto.lng}`} target="_blank" rel="noreferrer"
                    className="rounded-lg bg-sfondo p-3 flex items-center gap-2.5 hover:bg-bordo/50 transition">
                    <Icona className="size-4 shrink-0 text-accento-scuro" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-tenue">{etichetta}, {metri(s.distanza)}</p>
                      <p className="text-sm font-semibold truncate">{s.nome || etichetta}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        </>)}

        {magazzino && magazzino.lat == null && (
          <p className="text-xs text-tenue">Il magazzino {magazzino.nome} non ha una posizione: aggiornala per calcolare i viaggi.</p>
        )}
      </div>
    </Card>
  )
}
