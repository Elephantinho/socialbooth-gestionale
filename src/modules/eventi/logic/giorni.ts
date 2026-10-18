import { giornoRoma } from '@/shared/lib/date'

/**
 * Raggruppa gli eventi per giorno (italiano) dell'allestimento.
 * Dentro ogni giorno dal più presto al più tardi; i giorni in ordine di data, o dal più recente se "recenti".
 * Non modifica l'elenco ricevuto.
 */
export function perGiorno<T extends { allestimento_il: string }>(eventi: T[], recenti = false): [string, T[]][] {
  const gruppi = new Map<string, T[]>()
  for (const e of eventi) {
    const g = giornoRoma(e.allestimento_il)
    gruppi.set(g, [...(gruppi.get(g) ?? []), e])
  }
  return [...gruppi]
    .map(([g, lista]): [string, T[]] => [g, lista.toSorted((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))])
    .toSorted(([a], [b]) => (recenti ? b.localeCompare(a) : a.localeCompare(b)))
}

/** Quanti sono coperti (confermati o in corso) e quanti in attesa di risposta */
export function copertura(eventi: { stato: string }[]) {
  const coperti = eventi.filter((e) => e.stato === 'confermato' || e.stato === 'in_corso').length
  const attesa = eventi.filter((e) => e.stato === 'proposto').length
  return { totale: eventi.length, coperti, attesa }
}
