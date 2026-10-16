// Lettura di un file CSV (anche esportato da Excel) in righe di testo.
import { REGIONI, type Enum } from '@/shared/types/database'

/** Divide il testo CSV in righe e colonne. Gestisce ; o , come separatore e le virgolette. */
export function leggiCsv(testo: string): string[][] {
  const righe = testo.replace(/^﻿/, '').split(/\r?\n/).filter((r) => r.trim())
  if (!righe.length) return []
  const sep = (righe[0].match(/;/g)?.length ?? 0) >= (righe[0].match(/,/g)?.length ?? 0) ? ';' : ','
  return righe.map((r) => {
    const celle: string[] = []
    let cella = ''
    let tra = false
    for (let i = 0; i < r.length; i++) {
      const c = r[i]
      if (c === '"') {
        if (tra && r[i + 1] === '"') { cella += '"'; i++ } else tra = !tra
      } else if (c === sep && !tra) {
        celle.push(cella.trim()); cella = ''
      } else cella += c
    }
    celle.push(cella.trim())
    return celle
  })
}

/** "toscana", "TOSCANA" → "Toscana"; null se non è una regione italiana */
export function normalizzaRegione(testo: string): Enum<'regione'> | null {
  const pulito = testo.trim().toLowerCase().replace(/[-\s']+/g, '')
  return REGIONI.find((r) => r.toLowerCase().replace(/[-\s']+/g, '') === pulito) ?? null
}

export type MagazzinoDaImportare = { nome: string; indirizzo: string; citta: string; regione: Enum<'regione'> | null; riga: number }

/** Colonne attese: nome; indirizzo; città; regione (la prima riga può essere l'intestazione) */
export function magazziniDaCsv(testo: string): MagazzinoDaImportare[] {
  const righe = leggiCsv(testo)
  const conIntestazione = righe[0]?.[0]?.toLowerCase().includes('nome')
  return righe.slice(conIntestazione ? 1 : 0).map((r, i) => ({
    nome: r[0] ?? '', indirizzo: r[1] ?? '', citta: r[2] ?? '', regione: normalizzaRegione(r[3] ?? ''),
    riga: i + (conIntestazione ? 2 : 1),
  })).filter((m) => m.nome || m.indirizzo)
}

export const MODELLO_MAGAZZINI = '﻿nome;indirizzo;città;regione\nMagazzino Firenze;Via Esempio 1;Firenze;Toscana\nMagazzino Milano;Via Esempio 2;Milano;Lombardia\n'
