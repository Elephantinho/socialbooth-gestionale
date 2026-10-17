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
  it('un evento con la data trascorsa è passato, qualunque sia lo stato', () => {
    for (const stato of ['da_assegnare', 'proposto', 'confermato']) expect(passato({ stato, smontaggio_il: ieri }, adesso)).toBe(true)
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
