import type { Enum } from '@/shared/types/database'

export type Passaggio = Enum<'passaggio'>

/** I passaggi dell'operatore, in ordine. "azione" è il pulsante, "fatto" come appare dopo. */
export const PASSAGGI: { id: Passaggio; azione: string; fatto: string }[] = [
  { id: 'check_in', azione: 'Check-in: ho preso la macchina', fatto: 'Check-in, macchina presa' },
  { id: 'attrezzatura', azione: "Ho caricato l'attrezzatura", fatto: 'Attrezzatura caricata' },
  { id: 'montato', azione: 'Ho montato', fatto: 'Montato' },
  { id: 'smontato', azione: 'Ho smontato', fatto: 'Smontato' },
  { id: 'rientrato', azione: 'Sono rientrato e ho scaricato', fatto: 'Rientrato e scaricato' },
  { id: 'check_out', azione: 'Check-out: macchina riconsegnata', fatto: 'Check-out' },
]

/** Quanti passaggi sono fatti (0–6) a partire dall'ultimo. */
export function passaggiFatti(ultimo: Passaggio | null | undefined): number {
  return ultimo ? PASSAGGI.findIndex((p) => p.id === ultimo) + 1 : 0
}

/** Il prossimo passaggio da fare, o null se finito. */
export function prossimoPassaggio(ultimo: Passaggio | null | undefined) {
  return PASSAGGI[passaggiFatti(ultimo)] ?? null
}
