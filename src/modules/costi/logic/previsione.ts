// Previsione dei costi sugli eventi futuri: regole pure.
import { contiEvento, type Conti, type EventoEconomico } from './perRegione'

export type ContiPrevisti = Conti & {
  carta: number            // costo carta previsto (inserito o stimato con la media)
  stampe: number           // stampe previste
  senzaPrezzo: number      // eventi senza prezzo cliente
  senzaOperatore: number   // eventi senza operatore: compenso stimato con la tariffa media
}

export type ParametriPrevisione = { tariffaMedia: number | null; costoStampa: number; mediaStampe: number | null }

const vuoti = (): ContiPrevisti => ({
  eventi: 0, ricavi: 0, compensi: 0, rimborsi: 0, altriCosti: 0, costiTotali: 0, margine: 0,
  carta: 0, stampe: 0, senzaPrezzo: 0, senzaOperatore: 0,
})

/**
 * Conti previsti di un evento. Se mancano dati li stima:
 * - nessun operatore → compenso con la tariffa media degli operatori
 * - nessun costo carta previsto → media stampe per evento × costo per stampa
 */
export function previsioneEvento(e: EventoEconomico, p: ParametriPrevisione): ContiPrevisti {
  const senzaOperatore = !e.operatore?.tariffa_oraria
  const base = contiEvento(senzaOperatore && p.tariffaMedia ? { ...e, operatore: { tariffa_oraria: p.tariffaMedia } } : e)
  const cartaInserita = e.costi
    .filter((c) => c.fase === 'previsto' && c.categoria === 'carta_stampe' && c.stato !== 'respinto')
    .reduce((s, c) => s + Number(c.importo ?? 0), 0)
  const haCarta = e.costi.some((c) => c.fase === 'previsto' && c.categoria === 'carta_stampe')
  const stampe = p.mediaStampe ?? 0
  const cartaStimata = haCarta ? 0 : Math.round(stampe * p.costoStampa * 100) / 100
  return {
    ...base,
    altriCosti: base.altriCosti + cartaStimata,
    costiTotali: base.costiTotali + cartaStimata,
    margine: base.margine - cartaStimata,
    carta: cartaInserita + cartaStimata,
    stampe,
    senzaPrezzo: base.ricavi ? 0 : 1,
    senzaOperatore: senzaOperatore ? 1 : 0,
  }
}

const somma = (a: ContiPrevisti, b: ContiPrevisti): ContiPrevisti => {
  const r = vuoti()
  for (const k of Object.keys(r) as (keyof ContiPrevisti)[]) r[k] = a[k] + b[k]
  return r
}

/** Raggruppa per una chiave (regione, mese…), ordinando per chiave */
export function previsionePer<T extends EventoEconomico>(eventi: T[], p: ParametriPrevisione, chiave: (e: T) => string) {
  const m = new Map<string, ContiPrevisti>()
  for (const e of eventi) m.set(chiave(e), somma(m.get(chiave(e)) ?? vuoti(), previsioneEvento(e, p)))
  return [...m.entries()].map(([k, c]) => ({ chiave: k, ...c }))
}

export const totalePrevisione = (righe: ContiPrevisti[]) => righe.reduce(somma, vuoti())
