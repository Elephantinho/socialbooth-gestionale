// Clienti: controlli dei dati per la fattura e ricerca.
import { describe, expect, it } from 'vitest'
import { cercaClienti, clienteVuoto, codiceFiscaleValido, controllaCliente, partitaIvaValida } from '@/modules/clienti/clienti'

describe('dati del cliente', () => {
  it('partita IVA con cifra di controllo', () => {
    expect(partitaIvaValida('01234567897')).toBe(true)
    expect(partitaIvaValida('IT 01234567897')).toBe(true)
    expect(partitaIvaValida('01234567890')).toBe(false)
    expect(partitaIvaValida('1234')).toBe(false)
  })
  it('codice fiscale', () => {
    expect(codiceFiscaleValido('RSSMRA80A01H501U')).toBe(true)
    expect(codiceFiscaleValido('rss mra 80a01 h501u')).toBe(true)
    expect(codiceFiscaleValido('RSSMRA80A01H501')).toBe(false)
  })
  it('azienda: serve SDI oppure PEC', () => {
    const base = { ...clienteVuoto, nome: 'Rossi srl', partita_iva: '01234567897', indirizzo: 'Via Roma 1', cap: '50100', citta: 'Firenze', provincia: 'FI' }
    expect(controllaCliente(base).codice_sdi).toBe('Serve il codice SDI oppure la PEC')
    expect(controllaCliente({ ...base, codice_sdi: 'M5UXCR1' })).toEqual({})
    expect(controllaCliente({ ...base, pec: 'rossi@pec.it' })).toEqual({})
    expect(controllaCliente({ ...base, codice_sdi: 'ABC' }).codice_sdi).toBe('Il codice SDI ha 7 caratteri')
  })
  it('privato: serve il codice fiscale, non la partita IVA', () => {
    const p = { ...clienteVuoto, tipo: 'privato' as const, nome: 'Mario Rossi', indirizzo: 'Via Po 3', cap: '10100', citta: 'Torino', provincia: 'TO' }
    expect(controllaCliente(p).codice_fiscale).toBe('Scrivi il codice fiscale')
    expect(controllaCliente({ ...p, codice_fiscale: 'RSSMRA80A01H501U' })).toEqual({})
  })
  it('sede completa', () => {
    const e = controllaCliente({ ...clienteVuoto, nome: 'X srl', partita_iva: '01234567897', pec: 'a@pec.it', cap: '501', provincia: 'Firenze' })
    expect(Object.keys(e).toSorted()).toEqual(['cap', 'citta', 'indirizzo', 'provincia'])
  })
  it('ricerca per nome, partita IVA o città, senza accenti', () => {
    const c = [
      { nome: 'Caffè Rossi srl', partita_iva: '01234567897', codice_fiscale: null, citta: 'Firenze' },
      { nome: 'Mario Bianchi', partita_iva: null, codice_fiscale: 'BNCMRA80A01H501U', citta: 'Torino' },
    ]
    expect(cercaClienti(c, 'caffe').map((x) => x.nome)).toEqual(['Caffè Rossi srl'])
    expect(cercaClienti(c, '0123').length).toBe(1)
    expect(cercaClienti(c, 'torino bianchi').map((x) => x.nome)).toEqual(['Mario Bianchi'])
    expect(cercaClienti(c, '').length).toBe(2)
  })
})
