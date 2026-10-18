// Regole degli eventi: orari, passati, nome, filtri, raggruppamento per giorno.
import { describe, expect, it } from 'vitest'
import { giaPassato, passato } from '@/modules/eventi/logic/archivio'
import { filtra } from '@/modules/eventi/logic/filtri'
import { copertura, perGiorno } from '@/modules/eventi/logic/giorni'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { costruisciOrari } from '@/modules/eventi/logic/orari'

const c = (d: string, o: string) => `${d}T${o}`

describe('orari', () => {
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

describe('nome evento', () => {
  it('usa il nome', () => expect(nomeEvento({ nome: 'Matrimonio Rossi', tipo_booth: { nome: 'Photobooth' } })).toBe('Matrimonio Rossi'))
  it('vecchi eventi senza nome: il servizio', () => expect(nomeEvento({ nome: null, tipo_booth: { nome: 'Photobooth' } })).toBe('Photobooth'))
  it('nome di soli spazi conta come vuoto', () => expect(nomeEvento({ nome: '   ', tipo_booth: null })).toBe('Evento'))
})

const id = (l: { id: number }[]) => l.map((e) => e.id)

describe('filtri eventi', () => {
  const orari = { inizio_attivazione: '2030-01-01T00:00:00Z', smontaggio_il: '2030-01-01T00:00:00Z', ultimo_passaggio: null }
  const ev = [
    { id: 1, allestimento_il: '2026-10-18T16:00:00Z', regione: 'Toscana', stato: 'da_assegnare', ...orari },
    { id: 2, allestimento_il: '2026-10-31T23:30:00Z', regione: 'Lombardia', stato: 'confermato', ...orari }, // 1 novembre a Roma
    { id: 3, allestimento_il: '2026-11-05T17:00:00Z', regione: 'Toscana', stato: 'proposto', ...orari },
    { id: 4, allestimento_il: '2026-10-20T17:00:00Z', regione: 'Toscana', stato: 'bozza', ...orari },
  ]
  it('nessun filtro: tutti', () => expect(id(filtra(ev, {}))).toEqual([1, 2, 3, 4]))
  it('per mese', () => expect(id(filtra(ev, { mese: '2026-11' }))).toEqual([2, 3]))
  it('per giorno', () => expect(id(filtra(ev, { giorno: '2026-10-18' }))).toEqual([1]))
  it('per regione', () => expect(id(filtra(ev, { regione: 'Toscana' }))).toEqual([1, 3, 4]))
  it('da assegnare comprende le bozze', () => expect(id(filtra(ev, { stato: 'da_assegnare' }))).toEqual([1, 4]))
  it('in attesa', () => expect(id(filtra(ev, { stato: 'proposto' }))).toEqual([3]))
  it('filtri insieme', () => expect(id(filtra(ev, { mese: '2026-10', regione: 'Toscana', stato: 'da_assegnare' }))).toEqual([1, 4]))
})

describe('eventi per giorno', () => {
  const ev = [
    { id: 3, allestimento_il: '2026-10-18T18:00:00Z', stato: 'confermato' },
    { id: 1, allestimento_il: '2026-10-17T20:00:00Z', stato: 'proposto' },
    { id: 2, allestimento_il: '2026-10-17T09:00:00Z', stato: 'in_corso' },
  ]
  it('giorni in ordine e dentro il giorno per ora', () => expect(perGiorno(ev).map(([g, l]) => [g, l.map((e) => e.id)])).toEqual([['2026-10-17', [2, 1]], ['2026-10-18', [3]]]))
  it('archivio dal più recente', () => expect(perGiorno(ev, true).map(([g]) => g)).toEqual(['2026-10-18', '2026-10-17']))
  it("non modifica l'elenco originale", () => { perGiorno(ev); expect(ev.map((e) => e.id)).toEqual([3, 1, 2]) })
  it('copertura', () => expect(copertura(ev)).toEqual({ totale: 3, coperti: 2, attesa: 1 }))
})
