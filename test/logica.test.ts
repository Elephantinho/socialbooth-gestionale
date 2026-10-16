// Test delle regole pure (niente database, niente rete): npm test
import { describe, expect, it } from 'vitest'
import { costruisciOrari, minutiInLocationPrevisti, minutiViaggioPagati, orarioRitiro } from '@/modules/eventi/logic/orari'
import { inArchivio, nonSvolto, daFatturare, daIncassare } from '@/modules/eventi/logic/archivio'
import { leggiBrief } from '@/modules/eventi/logic/brief'
import { statoCarta, confezioniPer } from '@/modules/carta/logic/scorta'
import { regioneDiCitta, trovaCitta } from '@/shared/lib/citta'

const combina = (d: string, o: string) => `${d}T${o}`

describe('orari', () => {
  it('passa al giorno dopo quando si supera la mezzanotte', () => {
    expect(costruisciOrari('2026-10-28', ['20:00', '21:00', '23:30', '00:30'], combina))
      .toEqual(['2026-10-28T20:00', '2026-10-28T21:00', '2026-10-28T23:30', '2026-10-29T00:30'])
  })
  it('ritiro = allestimento − viaggio − 20 minuti', () => {
    expect(orarioRitiro('2026-10-28T18:00:00Z', 40)).toBe('2026-10-28T17:00:00.000Z')
  })
  it('conta i minuti in location e il viaggio andata e ritorno', () => {
    expect(minutiInLocationPrevisti('2026-10-28T18:00:00Z', '2026-10-28T23:30:00Z')).toBe(330)
    expect(minutiViaggioPagati(25)).toBe(50)
    expect(minutiViaggioPagati(null)).toBe(0)
  })
})

describe('archivio', () => {
  const adesso = new Date('2026-10-20T12:00:00Z').getTime()
  const ieri = '2026-10-19T23:00:00Z'
  const domani = '2026-10-21T23:00:00Z'
  it('un evento da assegnare con la data passata è "mai svolto" e va in archivio', () => {
    expect(nonSvolto({ stato: 'da_assegnare', smontaggio_il: ieri }, adesso)).toBe(true)
    expect(inArchivio({ stato: 'da_assegnare', smontaggio_il: ieri }, adesso)).toBe(true)
  })
  it('un evento confermato con la data passata resta in vista finché non si chiude', () => {
    expect(inArchivio({ stato: 'confermato', smontaggio_il: ieri }, adesso)).toBe(false)
  })
  it('gli eventi futuri non sono in archivio', () => {
    expect(inArchivio({ stato: 'da_assegnare', smontaggio_il: domani }, adesso)).toBe(false)
  })
  it('fatture', () => {
    expect(daFatturare({ stato: 'completato', fattura_numero: null })).toBe(true)
    expect(daIncassare({ fattura_importo: 500, fattura_pagata: false })).toBe(true)
    expect(daIncassare({ fattura_importo: 500, fattura_pagata: true })).toBe(false)
  })
})

describe('brief incollato', () => {
  const tipi = [{ id: 'p', nome: 'Photobooth' }, { id: 'v', nome: 'Videobooth 360' }, { id: 'm', nome: 'Social Mirror' }]
  const clienti = [{ id: 'c', nome: 'Gucci' }]
  const oggi = new Date('2026-10-16T10:00:00Z')

  it('legge un brief tipico', () => {
    const { dati } = leggiBrief(`PHOTOBOOTH 28/10 Firenze
Via Gusciana 27, Firenze
Allestimento ore 17:30
Evento 19:00 - 23:00
Smontaggio 23:30
Referente: Marco Rossi 333 1234567
Hostess: no
Dress code: total black`, { tipi, clienti, oggi })
    expect(dati).toMatchObject({
      tipoBoothId: 'p', data: '2026-10-28', indirizzo: 'Via Gusciana 27', citta: 'Firenze', regione: 'Toscana',
      allestimento: '17:30', inizio: '19:00', fine: '23:00', smontaggio: '23:30',
      referenteNome: 'Marco Rossi', referenteTelefono: '3331234567', hostess: false, outfit: 'total black',
    })
  })
  it('capisce orari misti sulla stessa riga, il 360 e il cliente', () => {
    const { dati } = leggiBrief(`360 sabato 7 novembre - Gucci
Piazza della Signoria 5, Firenze (ZTL)
arrivo alle 15, attivazione dalle 18 alle 22`, { tipi, clienti, oggi })
    expect(dati).toMatchObject({ tipoBoothId: 'v', clienteId: 'c', data: '2026-11-07', allestimento: '15:00', inizio: '18:00', fine: '22:00', ztl: true })
  })
  it('stacca la città attaccata all\'indirizzo e porta la data all\'anno dopo se è già passata', () => {
    const { dati } = leggiBrief('Social mirror\nViale Monza 120 Milano\n3/2 dalle 10.00 alle 18.00', { tipi, clienti, oggi })
    expect(dati).toMatchObject({ tipoBoothId: 'm', indirizzo: 'Viale Monza 120', citta: 'Milano', regione: 'Lombardia', data: '2027-02-03' })
  })
})

describe('carta', () => {
  it('rossa sotto soglia, rossa piena se finita, ok altrimenti', () => {
    expect(statoCarta(0, 200, 0, 300).livello).toBe('finita')
    expect(statoCarta(150, 200, 0, 300).livello).toBe('bassa')
    expect(statoCarta(500, 200, 0, 300).livello).toBe('ok')
  })
  it('rossa anche se non basta per gli eventi già assegnati', () => {
    expect(statoCarta(500, 200, 2, 300).livello).toBe('bassa')
  })
  it('operatore nuovo senza scorta registrata: "da impostare", non rosso', () => {
    expect(statoCarta(0, 200, 1, 300, false).livello).toBe('da_impostare')
  })
  it('arrotonda alle confezioni intere', () => {
    expect(confezioniPer(701, 700)).toBe(2)
    expect(confezioniPer(10, 700)).toBe(1)
  })
})

describe('città', () => {
  it('trova la regione', () => {
    expect(regioneDiCitta('reggio emilia')).toBe('Emilia-Romagna')
    expect(trovaCitta('evento a Forte dei Marmi')?.regione).toBe('Toscana')
  })
})
