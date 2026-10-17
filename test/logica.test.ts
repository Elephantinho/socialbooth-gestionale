// Test delle regole pure (niente database, niente rete): npm test
import { describe, expect, it } from 'vitest'
import { costruisciOrari } from '@/modules/eventi/logic/orari'
import { giaPassato, passato } from '@/modules/eventi/logic/archivio'
import { combinaDataOra, dataBreve, iniziali, nomeCompleto, ora, perCampoData, traQuanto } from '@/shared/lib/formato'
import { puo, RUOLI, RUOLI_GESTIONE, type Permesso } from '@/modules/auth/permessi'

describe('orari', () => {
  const c = (d: string, o: string) => `${d}T${o}`
  it('passa al giorno dopo quando si supera la mezzanotte', () => {
    expect(costruisciOrari('2026-10-28', ['20:00', '21:00', '23:30', '00:30'], c))
      .toEqual(['2026-10-28T20:00', '2026-10-28T21:00', '2026-10-28T23:30', '2026-10-29T00:30'])
  })
  it('orari uguali restano lo stesso giorno', () => {
    expect(costruisciOrari('2026-10-28', ['18:00', '18:00'], c)).toEqual(['2026-10-28T18:00', '2026-10-28T18:00'])
  })
  it('fine mese, fine anno, anno bisestile', () => {
    expect(costruisciOrari('2026-10-31', ['22:00', '01:00'], c)[1]).toBe('2026-11-01T01:00')
    expect(costruisciOrari('2026-12-31', ['22:00', '01:00'], c)[1]).toBe('2027-01-01T01:00')
    expect(costruisciOrari('2028-02-28', ['22:00', '01:00'], c)[1]).toBe('2028-02-29T01:00')
  })
  it('nessun orario', () => expect(costruisciOrari('2026-10-28', [], c)).toEqual([]))
})

describe('fuso orario italiano', () => {
  it('ora solare e ora legale', () => {
    expect(combinaDataOra('2026-12-10', '18:00')).toBe('2026-12-10T17:00:00.000Z')
    expect(combinaDataOra('2026-07-10', '18:00')).toBe('2026-07-10T16:00:00.000Z')
  })
  it('giorni del cambio d\'ora', () => {
    expect(combinaDataOra('2026-10-25', '20:00')).toBe('2026-10-25T19:00:00.000Z')
    expect(combinaDataOra('2026-03-29', '20:00')).toBe('2026-03-29T18:00:00.000Z')
  })
  it('data e ora ricombinate tornano uguali', () => {
    for (const [d, o] of [['2026-01-01', '00:15'], ['2026-06-30', '23:45'], ['2026-10-25', '12:00']]) {
      const iso = combinaDataOra(d, o)
      expect(perCampoData(iso)).toBe(d)
      expect(ora(iso)).toBe(o)
    }
  })
  it('il giorno è quello italiano, non quello UTC', () => expect(perCampoData('2026-10-28T23:30:00Z')).toBe('2026-10-29'))
  it('formati', () => {
    expect(ora(null)).toBe('—')
    expect(dataBreve('2026-10-28T10:00:00Z')).toBe('Mer 28 ottobre')
    expect(traQuanto(new Date().toISOString())).toBe('oggi')
  })
})

describe('nomi', () => {
  it('nome completo e iniziali', () => {
    expect(nomeCompleto(null)).toBe('Senza nome')
    expect(nomeCompleto({ nome: 'Mario', cognome: 'Rossi' })).toBe('Mario Rossi')
    expect(iniziali('altea mascolo')).toBe('AM')
    expect(iniziali('')).toBe('?')
  })
})

describe('eventi passati', () => {
  const adesso = new Date('2026-10-20T12:00:00Z').getTime()
  const ieri = '2026-10-19T23:00:00Z'
  const domani = '2026-10-21T23:00:00Z'
  it('un evento con la data trascorsa è passato se nessuno ci lavorava', () => {
    for (const stato of ['da_assegnare', 'proposto', 'bozza']) expect(passato({ stato, smontaggio_il: ieri }, adesso)).toBe(true)
  })
  it('confermato o in corso con la data trascorsa resta in programma finché non si chiude', () => {
    for (const stato of ['confermato', 'in_corso']) expect(passato({ stato, smontaggio_il: ieri }, adesso)).toBe(false)
  })
  it('annullati e completati sono passati anche se la data è futura', () => {
    expect(passato({ stato: 'annullato', smontaggio_il: domani }, adesso)).toBe(true)
    expect(passato({ stato: 'completato', smontaggio_il: domani }, adesso)).toBe(true)
  })
  it('un evento futuro non è passato', () => expect(passato({ stato: 'confermato', smontaggio_il: domani }, adesso)).toBe(false))
  it('esattamente adesso non è ancora passato', () => expect(giaPassato({ smontaggio_il: new Date(adesso).toISOString() }, adesso)).toBe(false))
})

describe('permessi', () => {
  const tutti: Permesso[] = ['eventi.crea', 'eventi.modifica', 'eventi.tutti', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci', 'utenti']
  it('l\'admin ha tutto, l\'operatore niente', () => {
    tutti.forEach((p) => { expect(puo('admin', p)).toBe(true); expect(puo('operatore', p)).toBe(false) })
  })
  it('solo l\'admin cambia utenti e ruoli', () => {
    for (const r of RUOLI.map((x) => x.id)) { expect(puo(r, 'utenti')).toBe(r === 'admin') }
  })
  it('il project crea e assegna i suoi eventi ma non vede quelli degli altri', () => {
    expect(puo('project', 'eventi.crea')).toBe(true); expect(puo('project', 'eventi.assegna')).toBe(true)
    expect(puo('project', 'eventi.tutti')).toBe(false); expect(puo('project', 'operatori.gestisci')).toBe(false)
  })
  it('chi gestisce gli operatori li vede anche', () => {
    for (const r of RUOLI.map((x) => x.id)) if (puo(r, 'operatori.gestisci')) expect(puo(r, 'operatori.vedi')).toBe(true)
  })
  it('ogni ruolo del pannello ha almeno un permesso', () => RUOLI_GESTIONE.forEach((r) => expect(tutti.some((p) => puo(r, p))).toBe(true)))
})

import { nomeEvento } from '../src/modules/eventi/logic/nome'
describe('nome evento', () => {
  it('usa il nome', () => expect(nomeEvento({ nome: 'Matrimonio Rossi', tipo_booth: { nome: 'Photobooth' } })).toBe('Matrimonio Rossi'))
  it('vecchi eventi senza nome: il servizio', () => expect(nomeEvento({ nome: null, tipo_booth: { nome: 'Photobooth' } })).toBe('Photobooth'))
  it('nome di soli spazi conta come vuoto', () => expect(nomeEvento({ nome: '   ', tipo_booth: null })).toBe('Evento'))
})

import { PASSAGGI, passaggiFatti, prossimoPassaggio } from '../src/modules/passaggi/passaggi'
describe('passaggi', () => {
  it('sono sei, dal check-in al check-out', () => { expect(PASSAGGI.map((p) => p.id)).toEqual(['check_in', 'attrezzatura', 'montato', 'smontato', 'rientrato', 'check_out']) })
  it('nessun passaggio: si parte dal check-in', () => { expect(passaggiFatti(null)).toBe(0); expect(prossimoPassaggio(null)?.id).toBe('check_in') })
  it('dopo il montaggio: 3 fatti, poi smontato', () => { expect(passaggiFatti('montato')).toBe(3); expect(prossimoPassaggio('montato')?.id).toBe('smontato') })
  it('dopo il check-out non c\'è altro', () => { expect(passaggiFatti('check_out')).toBe(6); expect(prossimoPassaggio('check_out')).toBeNull() })
})

import { filtra, giornoRoma } from '../src/modules/eventi/logic/filtri'
describe('filtri eventi', () => {
  const orari = { inizio_attivazione: '2030-01-01T00:00:00Z', smontaggio_il: '2030-01-01T00:00:00Z', ultimo_passaggio: null }
  const ev = [
    { id: 1, allestimento_il: '2026-10-18T16:00:00Z', regione: 'Toscana', stato: 'da_assegnare', ...orari },
    { id: 2, allestimento_il: '2026-10-31T23:30:00Z', regione: 'Lombardia', stato: 'confermato', ...orari }, // 1 novembre a Roma
    { id: 3, allestimento_il: '2026-11-05T17:00:00Z', regione: 'Toscana', stato: 'proposto', ...orari },
    { id: 4, allestimento_il: '2026-10-20T17:00:00Z', regione: 'Toscana', stato: 'bozza', ...orari },
  ]
  const id = (l: { id: number }[]) => l.map((e) => e.id)
  it('nessun filtro: tutti', () => expect(id(filtra(ev, {}))).toEqual([1, 2, 3, 4]))
  it('il giorno si legge all\'ora di Roma', () => expect(giornoRoma('2026-10-31T23:30:00Z')).toBe('2026-11-01'))
  it('per mese', () => expect(id(filtra(ev, { mese: '2026-11' }))).toEqual([2, 3]))
  it('per giorno', () => expect(id(filtra(ev, { giorno: '2026-10-18' }))).toEqual([1]))
  it('per regione', () => expect(id(filtra(ev, { regione: 'Toscana' }))).toEqual([1, 3, 4]))
  it('da assegnare comprende le bozze', () => expect(id(filtra(ev, { stato: 'da_assegnare' }))).toEqual([1, 4]))
  it('in attesa', () => expect(id(filtra(ev, { stato: 'proposto' }))).toEqual([3]))
  it('filtri insieme', () => expect(id(filtra(ev, { mese: '2026-10', regione: 'Toscana', stato: 'da_assegnare' }))).toEqual([1, 4]))
})

import { ritardo } from '../src/modules/passaggi/ritardi'
describe('ritardi', () => {
  const h = 3_600_000
  const t0 = Date.UTC(2026, 9, 18, 16)
  const ev = (stato: string, ultimo: Parameters<typeof ritardo>[0]['ultimo_passaggio']) => ({
    stato, ultimo_passaggio: ultimo,
    allestimento_il: new Date(t0).toISOString(), inizio_attivazione: new Date(t0 + 2 * h).toISOString(), smontaggio_il: new Date(t0 + 7 * h).toISOString(),
  })
  it('prima dell\'allestimento nessun ritardo', () => expect(ritardo(ev('confermato', null), t0 - 1)).toBeNull())
  it('allestimento passato senza check-in', () => expect(ritardo(ev('confermato', null), t0 + 1)).toBe('Check-in mancante'))
  it('check-in fatto: in regola fino all\'attivazione', () => expect(ritardo(ev('in_corso', 'check_in'), t0 + h)).toBeNull())
  it('attivazione iniziata e non montato', () => expect(ritardo(ev('in_corso', 'attrezzatura'), t0 + 2 * h)).toBe('Non ancora montato'))
  it('montato: in regola', () => expect(ritardo(ev('in_corso', 'montato'), t0 + 5 * h)).toBeNull())
  it('4 ore dopo lo smontaggio senza check-out', () => expect(ritardo(ev('in_corso', 'smontato'), t0 + 11 * h)).toBe('Check-out mancante'))
  it('completato o da assegnare: mai in ritardo', () => {
    expect(ritardo(ev('completato', 'check_out'), t0 + 20 * h)).toBeNull()
    expect(ritardo(ev('da_assegnare', null), t0 + 20 * h)).toBeNull()
  })
})

import { bilancio, euro, leggiImporto, ricavo } from '../src/modules/conti/conti'
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

import { raggruppa, type EventoConti } from '../src/modules/conti/conti'
describe('raggruppare i conti', () => {
  const op = (id: string, nome: string) => ({ id, nome, cognome: null })
  const ev: EventoConti[] = [
    { id: 'a', allestimento_il: '2026-10-05T16:00:00Z', regione: 'Toscana', operatore: op('g', 'Giulia'), conti: { prezzo: 1000, fattura_importo: null }, spese: [{ importo: 100, pagata_con: 'carta_aziendale', operatore_id: 'g' }, { importo: 20, pagata_con: 'operatore', operatore_id: 'g' }] },
    { id: 'b', allestimento_il: '2026-10-31T23:30:00Z', regione: 'Lombardia', operatore: op('g', 'Giulia'), conti: { prezzo: 500, fattura_importo: 600 }, spese: [{ importo: 50, pagata_con: 'azienda', operatore_id: null }] }, // 1 novembre a Roma
    { id: 'c', allestimento_il: '2026-11-10T16:00:00Z', regione: 'Toscana', operatore: null, conti: null, spese: [] },
  ]
  it('per mese (all\'ora di Roma)', () => {
    const g = raggruppa(ev, 'mese')
    expect(g.map((x) => [x.etichetta, x.eventi, x.ricavi, x.costi, x.margine])).toEqual([['Ottobre 2026', 1, 1000, 120, 880], ['Novembre 2026', 2, 600, 50, 550]])
  })
  it('per regione', () => expect(raggruppa(ev, 'regione').map((x) => [x.chiave, x.ricavi, x.senzaPrezzo])).toEqual([['Toscana', 1000, 1], ['Lombardia', 600, 0]]))
  it('per operatore, con quanto rimborsare', () => {
    const g = raggruppa(ev, 'operatore')
    expect(g.map((x) => [x.etichetta, x.eventi, x.daRimborsare])).toEqual([['Giulia', 2, 20], ['Senza operatore', 1, 0]])
  })
  it('percentuale di margine', () => expect(raggruppa(ev, 'evento')[0].percentuale).toBe(88))
})
