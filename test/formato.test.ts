// Formattazione: fuso orario italiano, orari, nomi.
import { describe, expect, it } from 'vitest'
import { giornoRoma } from '@/shared/lib/date'
import { combinaDataOra, dataBreve, iniziali, nomeCompleto, ora, traQuanto } from '@/shared/lib/formato'

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
      expect(giornoRoma(iso)).toBe(d)
      expect(ora(iso)).toBe(o)
    }
  })
  it('il giorno è quello italiano, non quello UTC', () => expect(giornoRoma('2026-10-28T23:30:00Z')).toBe('2026-10-29'))
  it('formati', () => {
    expect(ora(null)).toBe('—')
    expect(dataBreve('2026-10-28T10:00:00Z')).toBe('Mer 28 ottobre')
    const adesso = Date.parse('2026-10-17T10:00:00Z')
    expect(traQuanto('2026-10-17T20:00:00Z', adesso)).toBe('oggi')
    expect(traQuanto('2026-10-18T08:00:00Z', adesso)).toBe('domani')
    expect(traQuanto('2026-10-29T08:00:00Z', adesso)).toBe('tra 12 giorni')
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
