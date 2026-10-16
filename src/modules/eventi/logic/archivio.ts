// Quando un evento passa in archivio: regole pure.

/** Finito (chiuso dall'operatore) o annullato. Gli eventi passati ma non chiusi restano in vista: vanno sistemati. */
export const inArchivio = (e: { stato: string }) => e.stato === 'completato' || e.stato === 'annullato'

/** Chiusi ma senza fattura */
export const daFatturare = (e: { stato: string; fattura_numero: string | null }) => e.stato === 'completato' && !e.fattura_numero

/** Fatturati ma non ancora pagati */
export const daIncassare = (e: { fattura_importo: number | null; fattura_pagata: boolean }) => e.fattura_importo != null && !e.fattura_pagata
