// Calcoli economici dell'evento: regole pure, senza React né database.
import type { Enum } from '@/shared/types/database'

type Costo = { fase: Enum<'fase_costo'>; categoria: Enum<'categoria_costo'>; importo: number | null; stato: Enum<'stato_approvazione'> }

export type RiepilogoEconomico = {
  operatoriPrevisto: number
  operatoriFinale: number | null        // null finché l'operatore non chiude l'evento
  perCategoria: { categoria: Enum<'categoria_costo'>; previsto: number; finale: number }[]
  totalePrevisto: number
  totaleFinale: number
  ricavo: number | null
  marginePrevisto: number | null
  margineFinale: number | null
}

/**
 * @param minutiPrevisti  minuti in location + viaggio a/r previsti
 * @param tariffa         tariffa oraria dell'operatore assegnato
 * @param compensoFinale  compenso calcolato dalle ore chiuse (null se non ancora chiuso)
 */
export function riepilogoEconomico(args: {
  costi: Costo[]
  minutiPrevisti: number
  tariffa: number | null
  compensoFinale: number | null
  ricavo: number | null
}): RiepilogoEconomico {
  const validi = args.costi.filter((c) => c.stato !== 'respinto')
  const operatoriPrevisto = round2((args.minutiPrevisti / 60) * (args.tariffa ?? 0))

  const mappa = new Map<Enum<'categoria_costo'>, { previsto: number; finale: number }>()
  for (const c of validi) {
    const r = mappa.get(c.categoria) ?? { previsto: 0, finale: 0 }
    r[c.fase] += Number(c.importo ?? 0)
    mappa.set(c.categoria, r)
  }
  const perCategoria = [...mappa.entries()].map(([categoria, v]) => ({ categoria, previsto: round2(v.previsto), finale: round2(v.finale) }))

  const totalePrevisto = round2(operatoriPrevisto + perCategoria.reduce((s, c) => s + c.previsto, 0))
  const totaleFinale = round2((args.compensoFinale ?? 0) + perCategoria.reduce((s, c) => s + c.finale, 0))

  return {
    operatoriPrevisto,
    operatoriFinale: args.compensoFinale,
    perCategoria,
    totalePrevisto,
    totaleFinale,
    ricavo: args.ricavo,
    marginePrevisto: args.ricavo == null ? null : round2(args.ricavo - totalePrevisto),
    margineFinale: args.ricavo == null || args.compensoFinale == null ? null : round2(args.ricavo - totaleFinale),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
