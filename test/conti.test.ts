// Conti, previsione, attrezzatura e import CSV: regole pure.
import { describe, expect, it } from 'vitest'
import { contiEvento, contiPerRegione, totaleConti, type EventoEconomico } from '@/modules/costi/logic/perRegione'
import { previsioneEvento, previsionePer, totalePrevisione } from '@/modules/costi/logic/previsione'
import { statoAttrezzatura } from '@/modules/attrezzatura/logic/stato'
import { leggiCsv, magazziniDaCsv, normalizzaRegione } from '@/modules/anagrafiche/logic/importaCsv'

const base = (x: Partial<EventoEconomico> = {}): EventoEconomico => ({
  regione: 'Toscana', stato: 'confermato',
  allestimento_il: '2026-11-10T10:00:00Z', smontaggio_il: '2026-11-10T18:00:00Z',
  viaggio_minuti: 0, prezzo_cliente: 1000, fattura_importo: null,
  operatore: { tariffa_oraria: 20 }, ore: [], costi: [], ...x,
})

describe('conti di un evento', () => {
  it('prima della chiusura usa compenso previsto e costi previsti', () => {
    const c = contiEvento(base({ costi: [{ fase: 'previsto', categoria: 'noleggio_veicolo', importo: 100, stato: 'approvato', pagato_con: 'azienda' }] }))
    expect(c.ricavi).toBe(1000)
    expect(c.compensi).toBeGreaterThan(0)
    expect(c.altriCosti).toBe(100)
    expect(c.margine).toBeCloseTo(1000 - c.compensi - 100)
  })

  it('dopo la chiusura usa il compenso finale e solo i costi finali non respinti', () => {
    const c = contiEvento(base({
      fattura_importo: 1200,
      ore: [{ compenso: 150, stato: 'approvato', check_out_il: '2026-11-10T18:00:00Z' }],
      costi: [
        { fase: 'previsto', categoria: 'noleggio_veicolo', importo: 999, stato: 'approvato', pagato_con: 'azienda' },
        { fase: 'finale', categoria: 'carburante', importo: 40, stato: 'approvato', pagato_con: 'operatore' },
        { fase: 'finale', categoria: 'vitto', importo: 25, stato: 'respinto', pagato_con: 'operatore' },
      ],
    }))
    expect(c).toMatchObject({ ricavi: 1200, compensi: 150, altriCosti: 40, rimborsi: 40, costiTotali: 190, margine: 1010 })
  })

  it('una chiusura respinta non conta come chiusa', () => {
    const c = contiEvento(base({ ore: [{ compenso: 999, stato: 'respinto', check_out_il: '2026-11-10T18:00:00Z' }] }))
    expect(c.compensi).not.toBe(999)
  })

  it('raggruppa per regione e ordina per ricavi', () => {
    const righe = contiPerRegione([base(), base({ regione: 'Lazio', prezzo_cliente: 3000 }), base()])
    expect(righe.map((r) => [r.regione, r.eventi])).toEqual([['Lazio', 1], ['Toscana', 2]])
    expect(totaleConti(righe).ricavi).toBe(5000)
  })
})

describe('previsione dei costi', () => {
  const p = { tariffaMedia: 15, costoStampa: 0.5, mediaStampe: 200 }

  it('senza operatore stima il compenso con la tariffa media', () => {
    const conOp = previsioneEvento(base({ operatore: { tariffa_oraria: 15 } }), p)
    const senza = previsioneEvento(base({ operatore: null }), p)
    expect(senza.senzaOperatore).toBe(1)
    expect(senza.compensi).toBe(conOp.compensi)
  })

  it('senza costo carta lo stima con la media stampe; se c\'è non lo raddoppia', () => {
    expect(previsioneEvento(base(), p).carta).toBe(100)
    const inserita = previsioneEvento(base({ costi: [{ fase: 'previsto', categoria: 'carta_stampe', importo: 60, stato: 'inviato', pagato_con: 'azienda' }] }), p)
    expect(inserita.carta).toBe(60)
    expect(inserita.altriCosti).toBe(60)
  })

  it('conta gli eventi senza prezzo e somma i totali', () => {
    const righe = previsionePer([base(), base({ prezzo_cliente: null })], p, (e) => e.regione)
    expect(righe).toHaveLength(1)
    const t = totalePrevisione(righe)
    expect(t.eventi).toBe(2)
    expect(t.senzaPrezzo).toBe(1)
    expect(t.carta).toBe(200)
  })
})

describe('attrezzatura', () => {
  const r = (prelevato: boolean, rientrato: boolean, categoria = 'Booth') =>
    ({ prelevato_il: prelevato ? 'x' : null, rientrato_il: rientrato ? 'x' : null, articolo: { categoria } })
  it('segue le tappe', () => {
    expect(statoAttrezzatura([])).toBe('vuota')
    expect(statoAttrezzatura([r(false, false)])).toBe('in_magazzino')
    expect(statoAttrezzatura([r(true, false), r(false, false)])).toBe('parziale')
    expect(statoAttrezzatura([r(true, false)])).toBe('fuori')
    expect(statoAttrezzatura([r(true, true), r(true, false, 'Consumabili')])).toBe('rientrata')
  })
})

describe('import CSV', () => {
  it('capisce ; e , e le virgolette', () => {
    expect(leggiCsv('a;b;"c;d"\n1;2;3')).toEqual([['a', 'b', 'c;d'], ['1', '2', '3']])
    expect(leggiCsv('a,"b ""x""",c')).toEqual([['a', 'b "x"', 'c']])
  })
  it('normalizza le regioni', () => {
    expect(normalizzaRegione(' TOSCANA ')).toBe('Toscana')
    expect(normalizzaRegione('Bologna')).toBeNull()
  })
  it('salta l\'intestazione e numera le righe', () => {
    const m = magazziniDaCsv('nome;indirizzo;città;regione\nMagazzino Firenze;Via X 1;Firenze;toscana')
    expect(m).toEqual([{ nome: 'Magazzino Firenze', indirizzo: 'Via X 1', citta: 'Firenze', regione: 'Toscana', riga: 2 }])
  })
})
