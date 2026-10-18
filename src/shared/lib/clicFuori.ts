import { useEffect, useRef, type RefObject } from 'react'

/** Per i menu a tendina: chiude quando si clicca fuori dall'elemento o si preme Esc. */
export function useClicFuori(rif: RefObject<HTMLElement | null>, aperto: boolean, chiudi: () => void) {
  // L'ultima funzione ricevuta, senza dover rifare l'ascolto a ogni disegno
  const chiudiRif = useRef(chiudi)
  useEffect(() => { chiudiRif.current = chiudi })
  useEffect(() => {
    if (!aperto) return
    const fuori = (e: MouseEvent) => { if (!rif.current?.contains(e.target as Node)) chiudiRif.current() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudiRif.current() }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [rif, aperto])
}
