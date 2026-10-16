import { useEffect, useState } from 'react'
import { minutiInAuto, trovaCoordinate, type Punto } from './api'

type Stato = 'inattivo' | 'calcolo' | 'fatto' | 'indirizzo_non_trovato' | 'magazzino_senza_posizione' | 'errore'

export type RisultatoViaggio = { stato: Stato; punto: Punto | null; minuti: number | null }

/**
 * Calcola in automatico posizione dell'evento e minuti di viaggio dal magazzino,
 * aspettando che si smetta di scrivere l'indirizzo (mezzo secondo).
 */
export function useViaggio(indirizzo: string, citta: string, magazzino: Punto | null): RisultatoViaggio {
  const [risultato, setRisultato] = useState<RisultatoViaggio>({ stato: 'inattivo', punto: null, minuti: null })

  useEffect(() => {
    if (indirizzo.trim().length < 4 || citta.trim().length < 2) {
      setRisultato({ stato: 'inattivo', punto: null, minuti: null })
      return
    }
    let annullato = false
    const timer = setTimeout(async () => {
      setRisultato((r) => ({ ...r, stato: 'calcolo' }))
      try {
        const punto = await trovaCoordinate(indirizzo, citta)
        if (annullato) return
        if (!punto) return setRisultato({ stato: 'indirizzo_non_trovato', punto: null, minuti: null })
        if (!magazzino) return setRisultato({ stato: 'magazzino_senza_posizione', punto, minuti: null })
        const minuti = await minutiInAuto(magazzino, punto)
        if (!annullato) setRisultato({ stato: minuti == null ? 'errore' : 'fatto', punto, minuti })
      } catch {
        if (!annullato) setRisultato({ stato: 'errore', punto: null, minuti: null })
      }
    }, 600)
    return () => { annullato = true; clearTimeout(timer) }
  }, [indirizzo, citta, magazzino?.lat, magazzino?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  return risultato
}

export const messaggioViaggio: Record<Stato, string> = {
  inattivo: "Inserisci indirizzo e città dell'evento",
  calcolo: 'Calcolo il percorso…',
  fatto: 'Calcolato in automatico',
  indirizzo_non_trovato: "Indirizzo non trovato: controllalo o inserisci i minuti a mano",
  magazzino_senza_posizione: 'Il magazzino non ha un indirizzo valido: aggiornalo in Magazzini',
  errore: 'Calcolo non riuscito: inserisci i minuti a mano',
}
