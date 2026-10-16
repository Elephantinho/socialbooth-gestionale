// Conti economici aggregati (per regione, per mese…): regole pure.
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

export type Conti = {
  eventi: number
  ricavi: number
  compensi: number
  rimborsi: number          // spese anticipate dagli operatori
  altriCosti: number        // noleggi, carta, carburante, vitto… (escluso compenso)
  costiTotali: number
  margine: number
}

export type RigaRegione = Conti & { regione: string }

const vuoti = (): Conti => ({ eventi: 0, ricavi: 0, compensi: 0, rimborsi: 0, altriCosti: 0, costiTotali: 0, margine: 0 })

/** Conti di un evento: valori finali se chiuso, altrimenti quelli previsti */
export function contiEvento(e: EventoEconomico): Conti {
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
  const compenso = chiuso ? r.operatoriFinale ?? 0 : r.operatoriPrevisto
  const altri = validi.reduce((s, c) => s + Number(c.importo ?? 0), 0)
  const ricavo = r.ricavo ?? 0
  return {
    eventi: 1, ricavi: ricavo, compensi: compenso,
    rimborsi: validi.filter((c) => c.pagato_con === 'operatore').reduce((s, c) => s + Number(c.importo ?? 0), 0),
    altriCosti: altri, costiTotali: compenso + altri, margine: ricavo - compenso - altri,
  }
}

const somma = (a: Conti, b: Conti): Conti => ({
  eventi: a.eventi + b.eventi, ricavi: a.ricavi + b.ricavi, compensi: a.compensi + b.compensi, rimborsi: a.rimborsi + b.rimborsi,
  altriCosti: a.altriCosti + b.altriCosti, costiTotali: a.costiTotali + b.costiTotali, margine: a.margine + b.margine,
})

/** Raggruppa gli eventi con una chiave qualsiasi (regione, mese, operatore…) */
export function contiPer<T extends EventoEconomico>(eventi: T[], chiave: (e: T) => string): Map<string, Conti> {
  const m = new Map<string, Conti>()
  for (const e of eventi) {
    const k = chiave(e)
    m.set(k, somma(m.get(k) ?? vuoti(), contiEvento(e)))
  }
  return m
}

export function contiPerRegione(eventi: EventoEconomico[]): RigaRegione[] {
  return [...contiPer(eventi, (e) => e.regione).entries()]
    .map(([regione, c]) => ({ regione, ...c }))
    .sort((a, b) => b.ricavi - a.ricavi || a.regione.localeCompare(b.regione))
}

export const totaleConti = (righe: Conti[]) => righe.reduce(somma, vuoti())
