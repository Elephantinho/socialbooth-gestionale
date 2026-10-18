// Conti: ricavo, costi, margine, importi, raggruppamenti, totali.
import { describe, expect, it } from 'vitest'
import { bilancio, euro, leggiImporto, mesiDellAnno, raggruppa, ricavo, rimborsiPerOperatore, spesePerOperatore, totali, type EventoConti } from '@/modules/conti/conti'

describe('conti', () => {
  it('il ricavo è la fattura, altrimenti il prezzo', () => {
    expect(ricavo({ prezzo: 1000, fattura_importo: 1200 })).toBe(1200)
    expect(ricavo({ prezzo: 1000, fattura_importo: null })).toBe(1000)
    expect(ricavo(null)).toBeNull()
  })
  it('margine e percentuale', () => {
    expect(bilancio({ prezzo: 1000, fattura_importo: null }, [{ importo: 180 }, { importo: 45.5 }])).toEqual({ ricavo: 1000, costi: 225.5, margine: 774.5, percentuale: 77 })
  })
  it('euro col punto delle migliaia', () => { expect(euro(1400).replace(/\s/g, ' ')).toBe('1.400,00 €'); expect(euro(null)).toBe('—') })
  it('senza ricavo il margine non si calcola', () => expect(bilancio(null, [{ importo: 50 }]).margine).toBeNull())
  it('in perdita', () => expect(bilancio({ prezzo: 100, fattura_importo: null }, [{ importo: 150 }]).margine).toBe(-50))
  it('importi scritti all\'italiana', () => {
    expect(leggiImporto('45,50')).toBe(45.5)
    expect(leggiImporto('1.200')).toBe(1200)
    expect(leggiImporto('1.200,00 €')).toBe(1200)
    expect(leggiImporto('12.5')).toBe(12.5)
    expect(leggiImporto('abc')).toBeNull()
    expect(leggiImporto('-3')).toBeNull()
  })
})

const op = (id: string, nome: string) => ({ id, nome, cognome: null })

describe('raggruppare i conti', () => {
  const ev: EventoConti[] = [
    { id: 'a', allestimento_il: '2026-10-05T16:00:00Z', regione: 'Toscana', operatore: op('g', 'Giulia'), conti: { prezzo: 1000, fattura_importo: null }, spese: [{ importo: 100, pagata_con: 'carta_aziendale', operatore_id: 'g' }, { importo: 20, pagata_con: 'operatore', operatore_id: 'g' }] },
    { id: 'b', allestimento_il: '2026-10-31T23:30:00Z', regione: 'Lombardia', operatore: op('g', 'Giulia'), conti: { prezzo: 500, fattura_importo: 600 }, spese: [{ importo: 50, pagata_con: 'azienda', operatore_id: null }] }, // 1 novembre a Roma
    { id: 'c', allestimento_il: '2026-11-10T16:00:00Z', regione: 'Toscana', operatore: null, conti: null, spese: [] },
  ]
  it('per mese (all\'ora di Roma)', () => {
    const g = raggruppa(ev, 'mese')
    expect(g.map((x) => [x.etichetta, x.eventi, x.ricavi, x.costi, x.margine])).toEqual([['Ottobre 2026', 1, 1000, 120, 880], ['Novembre 2026', 2, 600, 50, 550]])
  })
  it('per regione', () => expect(raggruppa(ev, 'regione').map((x) => [x.chiave, x.ricavi])).toEqual([['Toscana', 1000], ['Lombardia', 600]]))
  it('per operatore', () => {
    const g = raggruppa(ev, 'operatore')
    expect(g.map((x) => [x.etichetta, x.eventi, x.costi])).toEqual([['Giulia', 2, 170], ['Senza operatore', 1, 0]])
  })
  it('percentuale di margine', () => expect(raggruppa(ev, 'evento')[0].percentuale).toBe(88))
})

describe('totali dei conti', () => {
  it('somma, margine, incassi e rimborsi', () => {
    const t = totali([
      { id: 'a', allestimento_il: '2026-10-05T16:00:00Z', regione: 'Toscana', operatore: null, stato: 'completato', conti: { prezzo: 1000, fattura_importo: null, fattura_numero: null, incassata: false }, spese: [{ importo: 100, pagata_con: 'operatore', operatore_id: null }] },
      { id: 'b', allestimento_il: '2026-10-06T16:00:00Z', regione: 'Lazio', operatore: null, stato: 'completato', conti: { prezzo: 500, fattura_importo: 500, fattura_numero: '3/2026', incassata: false }, spese: [] },
      { id: 'c', allestimento_il: '2026-10-07T16:00:00Z', regione: 'Lazio', operatore: null, stato: 'confermato', conti: null, spese: [] },
      { id: 'd', allestimento_il: '2026-10-08T16:00:00Z', regione: 'Lazio', operatore: null, stato: 'completato', conti: null, spese: [] },
    ])
    expect(t).toEqual({ ricavi: 1500, costi: 100, margine: 1400, percentuale: 93, daIncassare: 1 })
  })
})

describe('anni, mesi e spese degli operatori', () => {
  const g = { id: 'g', nome: 'Giulia', cognome: 'Neri' }
  const l = { id: 'l', nome: 'Luca', cognome: null }
  const ev: EventoConti[] = [
    { id: 'a', allestimento_il: '2025-12-31T23:30:00Z', regione: 'Toscana', operatore: g, conti: { prezzo: 1000, fattura_importo: null }, // 1 gennaio 2026 a Roma
      spese: [{ importo: 60, pagata_con: 'carta_aziendale', operatore_id: 'g', voce: 'carburante' }, { importo: 15.5, pagata_con: 'operatore', operatore_id: 'g', voce: 'vitto' }] },
    { id: 'b', allestimento_il: '2026-03-10T16:00:00Z', regione: 'Toscana', operatore: g, conti: { prezzo: 800, fattura_importo: null },
      spese: [{ importo: 40, pagata_con: 'carta_aziendale', operatore_id: 'g', voce: 'carburante' }, { importo: 200, pagata_con: 'azienda', operatore_id: null, voce: 'noleggio' }] },
    { id: 'c', allestimento_il: '2025-06-10T16:00:00Z', regione: 'Lazio', operatore: l, conti: { prezzo: 500, fattura_importo: null }, spese: [] },
  ]
  it('per anno, all\'ora di Roma', () => expect(raggruppa(ev, 'anno').map((x) => [x.chiave, x.eventi, x.ricavi])).toEqual([['2026', 2, 1800], ['2025', 1, 500]]))
  it('i dodici mesi, anche vuoti', () => {
    const m = mesiDellAnno(ev, 2026)
    expect(m).toHaveLength(12)
    expect(m.map((x) => x.ricavi)).toEqual([1000, 0, 800, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(m[1].etichetta).toBe('Febbraio 2026')
  })
  it('quanto spende ogni operatore, per voce; il noleggio dell\'azienda non è suo', () => {
    const [giulia, luca] = spesePerOperatore(ev)
    expect(giulia).toMatchObject({ nome: 'Giulia Neri', eventi: 2, totale: 115.5, mediaPerEvento: 57.75 })
    expect(giulia.perVoce).toEqual([{ voce: 'carburante', importo: 100 }, { voce: 'vitto', importo: 15.5 }])
    expect(luca).toMatchObject({ nome: 'Luca', eventi: 1, totale: 0, mediaPerEvento: 0 })
  })
})

describe('rimborsi', () => {
  it('per operatore, chi deve ricevere di più per primo', () => {
    const g = { id: 'g', nome: 'Giulia', cognome: 'Neri' }
    const l = { id: 'l', nome: 'Luca', cognome: null }
    const r = rimborsiPerOperatore([
      { id: '1', importo: 12.5, creato_il: '2026-10-10T10:00:00Z', operatore: g },
      { id: '2', importo: 40, creato_il: '2026-10-02T10:00:00Z', operatore: l },
      { id: '3', importo: 7.1, creato_il: '2026-10-01T10:00:00Z', operatore: g },
      { id: '4', importo: 5, creato_il: '2026-10-01T10:00:00Z', operatore: null },
    ])
    expect(r.map((o) => [o.nome, o.totale, o.spese.map((s) => s.id)])).toEqual([['Luca', 40, ['2']], ['Giulia Neri', 19.6, ['3', '1']]])
  })
})
