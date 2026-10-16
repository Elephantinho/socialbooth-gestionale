import { useEffect, useRef, useState } from 'react'
import { distanza } from '@/modules/luogo/api'
import { AnimatePresence } from 'framer-motion'
import { Car, Check, Flag, Home, MapPin, Receipt } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useRegistraTappa, useTappe, type Tappa } from '@/modules/eventi/api'
import type { EventoDettaglio } from '@/modules/eventi/types'
import { durata, ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'
import { ChiudiEvento } from './ChiudiEvento'

const minuti = (da: string | null, a: string | null) =>
  da && a ? Math.max(0, Math.round((new Date(a).getTime() - new Date(da).getTime()) / 60_000)) : null

/**
 * Le ore si calcolano da sole: l'operatore preme un tasto a ogni tappa
 * (parto → arrivato → finito → rientrato) e l'app registra ora e posizione.
 */
export function TappeLavoro({ e }: { e: EventoDettaglio }) {
  const profilo = useProfilo()
  const { data: t } = useTappe(e.id, profilo.id)
  const registra = useRegistraTappa()
  const [manuale, setManuale] = useState(false)
  const [spese, setSpese] = useState(false)

  const passi = [
    { chiave: 'partenza', etichetta: 'Partenza dal magazzino', quando: t?.partenza_il, Icona: Car },
    { chiave: 'arrivo', etichetta: 'Arrivo in location', quando: t?.check_in_il, Icona: MapPin },
    { chiave: 'fine', etichetta: 'Fine lavoro', quando: t?.fine_il, Icona: Flag },
    { chiave: 'rientro', etichetta: 'Rientro in magazzino', quando: t?.rientro_il, Icona: Home },
  ]
  const chiuso = e.stato === 'completato' || !!t?.check_out_il
  const vai = (tappa: Tappa) => registra.mutate({ eventoId: e.id, tappa })

  // Riconoscimento automatico col GPS (con l'app aperta): entro 150 m dalla location → arrivo,
  // dopo la fine lavoro entro 150 m dal magazzino → rientro
  const [auto, setAuto] = useState<string>()
  const inviata = useRef<string>(undefined)
  const prossima: Tappa | null = chiuso ? null
    : t?.partenza_il && !t?.check_in_il ? 'arrivo'
    : t?.fine_il && !t?.rientro_il ? 'rientro'
    : null
  useEffect(() => {
    if (!prossima || !navigator.geolocation) return
    const meta = prossima === 'arrivo'
      ? (e.lat != null && e.lng != null ? { lat: e.lat, lng: e.lng } : null)
      : (e.magazzino?.lat != null && e.magazzino?.lng != null ? { lat: e.magazzino.lat, lng: e.magazzino.lng } : null)
    if (!meta) return
    const id = navigator.geolocation.watchPosition((pos) => {
      const d = distanza({ lat: pos.coords.latitude, lng: pos.coords.longitude }, meta)
      if (d <= 150 && inviata.current !== prossima) {
        inviata.current = prossima
        setAuto(prossima === 'arrivo' ? 'Arrivo registrato in automatico' : 'Rientro registrato in automatico')
        registra.mutate({ eventoId: e.id, tappa: prossima })
      }
    }, undefined, { enableHighAccuracy: true, maximumAge: 30_000 })
    return () => navigator.geolocation.clearWatch(id)
  }, [prossima, e.id, e.lat, e.lng, e.magazzino?.lat, e.magazzino?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prossima azione
  let azione: React.ReactNode = null
  if (!chiuso) {
    if (!t?.partenza_il && !t?.check_in_il) {
      azione = (
        <>
          <Pulsante taglia="xl" pieno icona={<Car className="size-5" aria-hidden />} caricamento={registra.isPending} onClick={() => vai('partenza')}>
            Parto dal magazzino
          </Pulsante>
          <button onClick={() => vai('arrivo')} disabled={registra.isPending} className="text-sm font-bold text-tenue py-1 cursor-pointer">Vado direttamente in location</button>
        </>
      )
    } else if (!t?.check_in_il) {
      azione = <Pulsante taglia="xl" pieno icona={<MapPin className="size-5" aria-hidden />} caricamento={registra.isPending} onClick={() => vai('arrivo')}>Sono arrivato in location</Pulsante>
    } else if (!t?.fine_il) {
      azione = <Pulsante taglia="xl" pieno variante="scuro" icona={<Flag className="size-5" aria-hidden />} caricamento={registra.isPending} onClick={() => vai('fine')}>Ho finito e smontato</Pulsante>
    } else {
      azione = (
        <>
          <Pulsante taglia="xl" pieno icona={<Home className="size-5" aria-hidden />} caricamento={registra.isPending} onClick={() => vai('rientro')}>
            Rientrato in magazzino
          </Pulsante>
          <button onClick={() => confirm('Chiudere senza rientro? Il ritorno verrà stimato con il viaggio previsto.') && vai('chiudi')}
            disabled={registra.isPending} className="text-sm font-bold text-tenue py-1 cursor-pointer">Non rientro in magazzino, chiudi qui</button>
        </>
      )
    }
  }

  const andata = minuti(t?.partenza_il ?? null, t?.check_in_il ?? null)
  const inLocation = minuti(t?.check_in_il ?? null, t?.fine_il ?? null)

  return (
    <>
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-[15px]">Le tue tappe</p>
          <span className="text-xs font-bold text-accento bg-accento-tenue px-2 py-1 rounded-md">Ore calcolate in automatico</span>
        </div>
        <ol className="flex flex-col">
          {passi.map((p, i) => {
            const fatto = !!p.quando
            const prossimo = !chiuso && i === passi.findIndex((x, j) => !x.quando && (j > 0 || !passi[1].quando))
            return (
              <li key={p.chiave} className="flex gap-3">
                <span className="flex flex-col items-center" aria-hidden>
                  <span className={cn('size-8 rounded-full flex items-center justify-center',
                    fatto ? 'bg-accento text-white' : prossimo ? 'bg-inchiostro text-white' : 'bg-sfondo text-tenue')}>
                    {fatto ? <Check className="size-4" /> : <p.Icona className="size-4" />}
                  </span>
                  {i < passi.length - 1 && <span className={cn('w-0.5 flex-1 min-h-4', fatto ? 'bg-accento' : 'bg-bordo')} />}
                </span>
                <div className="pb-3 pt-1 flex-1 flex justify-between gap-2">
                  <span className={cn('text-sm font-bold', !fatto && 'text-tenue')}>{p.etichetta}</span>
                  <span className="text-sm font-bold">{p.quando ? ora(p.quando) : ''}</span>
                </div>
              </li>
            )
          })}
        </ol>
        {(andata != null || inLocation != null) && (
          <p className="text-sm text-tenue -mt-1">
            {andata != null && <>Andata <strong className="text-inchiostro">{durata(andata)}</strong></>}
            {andata != null && inLocation != null && ' · '}
            {inLocation != null && <>In location <strong className="text-inchiostro">{durata(inLocation)}</strong></>}
          </p>
        )}
        {chiuso && t && (
          <div className="rounded-2xl bg-accento-tenue text-accento-scuro p-3.5">
            <p className="font-bold">Evento chiuso · {durata(t.minuti_totali)} totali</p>
            <p className="text-sm">{durata(t.minuti_in_location)} in location + {durata(t.minuti_viaggio)} di viaggio. Ore inviate al project.</p>
            {t.nota_operatore && <p className="text-xs mt-1 opacity-80">{t.nota_operatore}</p>}
          </div>
        )}
      </Card>

      {/* Barra fissa in basso con il prossimo tasto da premere; lo spazio sotto evita che copra la pagina */}
      <div aria-hidden className="h-44 order-last" />
      <div className="fixed bottom-0 inset-x-0 z-30 max-w-md mx-auto bg-sfondo/95 backdrop-blur border-t border-bordo px-5 pt-3.5 pb-sicura flex flex-col gap-1.5 shadow-[0_-8px_24px_-16px_rgba(21,22,26,0.25)]">
        {registra.error && <Errore errore={registra.error} />}
        {auto && <p className="text-center text-sm font-bold text-accento" role="status">{auto}</p>}
        {prossima && !auto && <p className="text-center text-xs text-tenue">Con l'app aperta, {prossima === 'arrivo' ? "l'arrivo" : 'il rientro'} si registra da solo quando sei sul posto</p>}
        {azione}
        <div className="flex justify-center gap-4">
          <button onClick={() => setSpese(true)} className="text-sm font-bold text-accento py-1 inline-flex items-center gap-1.5 cursor-pointer">
            <Receipt className="size-4" aria-hidden /> Aggiungi una spesa
          </button>
          {!chiuso && (
            <button onClick={() => setManuale(true)} className="text-sm font-bold text-tenue py-1 cursor-pointer">Inserisci ore a mano</button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {manuale && <ChiudiEvento e={e} onChiudi={() => setManuale(false)} />}
        {spese && <ChiudiEvento e={e} soloSpese onChiudi={() => setSpese(false)} />}
      </AnimatePresence>
    </>
  )
}
