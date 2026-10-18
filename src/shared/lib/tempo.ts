import { useSyncExternalStore } from 'react'

// Un solo orologio per tutta l'app: le pagine che dipendono dall'ora (ritardi, "oggi", passaggi)
// si aggiornano da sole ogni 30 secondi, senza che ognuna crei il suo timer.
const PASSO = 30_000
let adesso = Date.now()
const ascoltatori = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function iscrivi(avvisa: () => void) {
  ascoltatori.add(avvisa)
  if (!timer) {
    adesso = Date.now()
    timer = setInterval(() => { adesso = Date.now(); ascoltatori.forEach((a) => a()) }, PASSO)
  }
  return () => {
    ascoltatori.delete(avvisa)
    if (!ascoltatori.size && timer) { clearInterval(timer); timer = undefined }
  }
}

/** L'ora attuale in millisecondi, che si aggiorna da sola. Da usare al posto di Date.now() nei componenti. */
export function useAdesso(): number {
  return useSyncExternalStore(iscrivi, () => adesso)
}
