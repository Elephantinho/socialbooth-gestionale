import { describe, expect, it } from 'vitest'
import { giornoBreve, giornoRoma, giorniTra, intervalloGiorni, meseRoma, nomeMese, piuGiorni, piuMesi, titoloGiorno, ultimiMesi } from '../src/shared/lib/date'

describe('giorni e mesi all\'ora di Roma', () => {
  it('mezzanotte e mezza del 1° novembre è novembre anche se in UTC è il 31 ottobre', () => {
    expect(giornoRoma('2026-10-31T23:30:00Z')).toBe('2026-11-01')
    expect(meseRoma('2026-10-31T23:30:00Z')).toBe('2026-11')
  })
  it('in estate (UTC+2) le 22:30 UTC sono già il giorno dopo', () => expect(giornoRoma('2026-07-10T22:30:00Z')).toBe('2026-07-11'))
  it('piuGiorni attraversa mesi, anni e il cambio d\'ora', () => {
    expect(piuGiorni('2026-10-31', 1)).toBe('2026-11-01')
    expect(piuGiorni('2026-12-31', 1)).toBe('2027-01-01')
    expect(piuGiorni('2026-10-25', -1)).toBe('2026-10-24')
    expect(piuGiorni('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('piuMesi e ultimiMesi', () => {
    expect(piuMesi('2026-12', 1)).toBe('2027-01')
    expect(piuMesi('2026-01', -1)).toBe('2025-12')
    expect(ultimiMesi('2026-02', 3)).toEqual(['2026-02', '2026-01', '2025-12'])
  })
  it('giorni tra due date', () => expect(giorniTra('2026-10-24', '2026-10-26')).toBe(2))
})

describe('nomi in italiano', () => {
  it('nome del mese con la maiuscola', () => expect(nomeMese('2026-10')).toBe('Ottobre 2026'))
  it('giorno breve', () => expect(giornoBreve('2026-10-18')).toBe('Dom 18 ott'))
  it('titolo rispetto a oggi', () => {
    expect(titoloGiorno('2026-10-17', '2026-10-17')).toBe('Oggi, sabato 17 ottobre')
    expect(titoloGiorno('2026-10-18', '2026-10-17')).toBe('Domani, domenica 18 ottobre')
    expect(titoloGiorno('2026-10-16', '2026-10-17')).toBe('Ieri, venerdì 16 ottobre')
    expect(titoloGiorno('2026-10-20', '2026-10-17')).toBe('Martedì 20 ottobre')
    expect(titoloGiorno('2027-01-05', '2026-10-17')).toBe('Martedì 5 gennaio 2027')
  })
  it('intervallo di giorni', () => {
    expect(intervalloGiorni('2026-10-17', '2026-10-23')).toBe('17 – 23 ottobre')
    expect(intervalloGiorni('2026-10-28', '2026-11-03')).toBe('28 ottobre – 3 novembre')
  })
})
