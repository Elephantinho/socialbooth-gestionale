// Quando un evento è passato: regole pure.

/** La data dell'evento è già passata (smontaggio concluso) */
export const giaPassato = (e: { smontaggio_il: string }, adesso = Date.now()) => new Date(e.smontaggio_il).getTime() < adesso

/**
 * Tra i passati: finiti, annullati, o con la data trascorsa.
 * Un evento confermato o in corso resta in programma finché non viene chiuso
 * (check-out dell'operatore o chiusura a mano): se nessuno lo chiude è un problema da vedere, non da archiviare.
 */
export const passato = (e: { stato: string; smontaggio_il: string }, adesso = Date.now()) =>
  e.stato === 'completato' || e.stato === 'annullato'
  || (giaPassato(e, adesso) && e.stato !== 'confermato' && e.stato !== 'in_corso')
