// Conti economici divisi per regione: regole pure.
import { minutiInLocationPrevisti, minutiViaggioPagati } from '@/modules/eventi/logic/orari'
import { riepilogoEconomico } from './riepilogo'
import type { Enum } from '@/shared/types/database'

export type EventoEconomico = {
  regione: string
  stato: Enum<'stato_evento'>
  allestimento_il: string
  smontaggio_il: string
  viaggio_minuti: number | null
  prezzo_cliente: number | null
  fattura_importo: number | null
  operatore: { tariffa_oraria: number | null } | null
  ore: { compenso: number | null; stato: Enum<'stato_approvazione'>; check_out_il: string | null }[]
  costi: { fase: Enum<'fase_costo'>; categoria: Enum<'categoria_costo'>; importo: number | null; stato: Enum<'stato_approvazione'>; pagato_con: Enum<'pagamento'> }[]
}

export type RigaRegione = {
  regione: string
  eventi: number
  ricavi: number
  compensi: number
  rimborsi: number          // spese anticipate dagli operatori
  altriCosti: number        // noleggi, carta, carburante, vitto… (escluso compenso)
  costiTotali: number
  margine: number
}

/** Usa i valori finali se l'evento è chiuso, altrimenti quelli previsti */
export function contiPerRegione(eventi: EventoEconomico[]): RigaRegione[] {
  const mappa = new Map<string, RigaRegione>()
  for (const e of eventi) {
    const ore = e.ore.find((o) => o.check_out_il && o.stato !== 'respinto')
    const chiuso = !!ore
    const r = riepilogoEconomico({
      costi: e.costi,
      minutiPrevisti: minutiInLocationPrevisti(e.allestimento_il, e.smontaggio_il) + minutiViaggioPagati(e.viaggio_minuti),
      tariffa: e.operatore?.tariffa_oraria ?? null,
      compensoFinale: ore?.compenso ?? null,
      ricavo: e.fattura_importo ?? e.prezzo_cliente ?? null,
    })
    const fase = chiuso ? 'finale' : 'previsto'
    const validi = e.costi.filter((c) => c.fase === fase && c.stato !== 'respinto')
    const riga = mappa.get(e.regione) ?? { regione: e.regione, eventi: 0, ricavi: 0, compensi: 0, rimborsi: 0, altriCosti: 0, costiTotali: 0, margine: 0 }
    const compenso = chiuso ? r.operatoriFinale ?? 0 : r.operatoriPrevisto
    const altri = validi.reduce((s, c) => s + Number(c.importo ?? 0), 0)
    riga.eventi += 1
    riga.ricavi += r.ricavo ?? 0
    riga.compensi += compenso
    riga.rimborsi += validi.filter((c) => c.pagato_con === 'operatore').reduce((s, c) => s + Number(c.importo ?? 0), 0)
    riga.altriCosti += altri
    riga.costiTotali += compenso + altri
    riga.margine += (r.ricavo ?? 0) - (compenso + altri)
    mappa.set(e.regione, riga)
  }
  return [...mappa.values()].sort((a, b) => b.ricavi - a.ricavi || a.regione.localeCompare(b.regione))
}
