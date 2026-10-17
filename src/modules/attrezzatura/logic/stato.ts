// Dove si trova l'attrezzatura di un evento: regole pure.

export type StatoAttrezzatura = 'vuota' | 'in_magazzino' | 'parziale' | 'fuori' | 'rientrata'

export const ETICHETTE_STATO: Record<StatoAttrezzatura, { testo: string; stile: string }> = {
  vuota: { testo: 'Nessuna', stile: 'bg-sfondo text-tenue' },
  in_magazzino: { testo: 'In magazzino', stile: 'bg-sfondo text-tenue' },
  parziale: { testo: 'Prelevata in parte', stile: 'bg-avviso text-avviso-testo' },
  fuori: { testo: 'Fuori dal magazzino', stile: 'bg-inchiostro text-white' },
  rientrata: { testo: 'Rientrata', stile: 'bg-ok-tenue text-ok' },
}

/** Stato complessivo dell'attrezzatura di un evento */
export function statoAttrezzatura(righe: { prelevato_il: string | null; rientrato_il: string | null; articolo?: { categoria: string } | null }[]): StatoAttrezzatura {
  const daRiportare = righe.filter((r) => r.articolo?.categoria !== 'Consumabili')
  if (!righe.length) return 'vuota'
  if (righe.some((r) => !r.prelevato_il)) return righe.some((r) => r.prelevato_il) ? 'parziale' : 'in_magazzino'
  if (daRiportare.length && daRiportare.every((r) => r.rientrato_il)) return 'rientrata'
  return 'fuori'
}
