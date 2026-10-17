import { passaggiFatti, type Passaggio } from './passaggi'

// Stesse soglie della funzione controlla_ritardi nel database.
const ORA = 3_600_000

type ConOrari = {
  stato: string; ultimo_passaggio: Passaggio | null
  allestimento_il: string; inizio_attivazione: string; smontaggio_il: string
}

/** Cosa manca a un evento in corso di svolgimento, o null se è tutto in regola. */
export function ritardo(e: ConOrari, adesso = Date.now()): string | null {
  if (e.stato !== 'confermato' && e.stato !== 'in_corso') return null
  const fatti = passaggiFatti(e.ultimo_passaggio)
  if (fatti < 6 && adesso >= new Date(e.smontaggio_il).getTime() + 4 * ORA) return 'Check-out mancante'
  if (fatti < 3 && adesso >= new Date(e.inizio_attivazione).getTime()) return 'Non ancora montato'
  if (fatti === 0 && adesso >= new Date(e.allestimento_il).getTime()) return 'Check-in mancante'
  return null
}
