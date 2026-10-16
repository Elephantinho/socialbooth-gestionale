// Quando un evento passa in archivio: regole pure.

type Base = { stato: string; smontaggio_il: string }

/** La data dell'evento è già passata */
export const giaPassato = (e: { smontaggio_il: string }, adesso = Date.now()) => new Date(e.smontaggio_il).getTime() < adesso

/**
 * Mai svolto: la data è passata e nessun operatore l'ha confermato o iniziato
 * (era ancora in bozza, da assegnare o in attesa di risposta).
 */
export const nonSvolto = (e: Base, adesso = Date.now()) =>
  ['bozza', 'da_assegnare', 'proposto'].includes(e.stato) && giaPassato(e, adesso)

/**
 * In archivio: finito, annullato o mai svolto.
 * Gli eventi confermati o in corso con la data passata restano in vista: l'operatore li deve ancora chiudere.
 */
export const inArchivio = (e: Base, adesso = Date.now()) =>
  e.stato === 'completato' || e.stato === 'annullato' || nonSvolto(e, adesso)

/** Chiusi ma senza fattura */
export const daFatturare = (e: { stato: string; fattura_numero: string | null }) => e.stato === 'completato' && !e.fattura_numero

/** Fatturati ma non ancora pagati */
export const daIncassare = (e: { fattura_importo: number | null; fattura_pagata: boolean }) => e.fattura_importo != null && !e.fattura_pagata
