import { describe, expect, it } from 'vitest'
import { aiutaData, aiutaOra, giornoBreve, giornoRoma, giorniTra, intervalloGiorni, leggiData, leggiOra, meseRoma, nomeMese, piuGiorni, piuMesi, scriviData, titoloGiorno, ultimiMesi } from '../src/shared/lib/date'

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

describe('date e orari scritti a mano', () => {
  it('legge le date all\'italiana', () => {
    expect(leggiData('19/10/2026')).toBe('2026-10-19')
    expect(leggiData('1/9/26')).toBe('2026-09-01')
    expect(leggiData('19.10.2026')).toBe('2026-10-19')
    expect(leggiData('19-10-2026')).toBe('2026-10-19')
    expect(leggiData('19102026')).toBe('2026-10-19')
    expect(leggiData('31/02/2026')).toBeNull()
    expect(leggiData('29/02/2028')).toBe('2028-02-29')
    expect(leggiData('10/19/2026')).toBeNull()
    expect(leggiData('ciao')).toBeNull()
  })
  it('scrive le date', () => expect(scriviData('2026-10-19')).toBe('19/10/2026'))
  it('legge gli orari', () => {
    expect(leggiOra('18:30')).toBe('18:30')
    expect(leggiOra('18.30')).toBe('18:30')
    expect(leggiOra('1830')).toBe('18:30')
    expect(leggiOra('18')).toBe('18:00')
    expect(leggiOra('21:')).toBe('21:00')
    expect(leggiOra('9:05')).toBe('09:05')
    expect(leggiOra('905')).toBe('09:05')
    expect(leggiOra('24:00')).toBeNull()
    expect(leggiOra('18:75')).toBeNull()
  })
  it('aiuta mentre si scrive', () => {
    expect(aiutaData('1', '19')).toBe('19/')
    expect(aiutaData('19/1', '19/10')).toBe('19/10/')
    expect(aiutaData('19/', '19')).toBe('19') // cancellando non rimette la barra
    expect(aiutaOra('1', '18')).toBe('18:')
    expect(aiutaOra('18', '183')).toBe('18:3')
    expect(aiutaOra('2', '25')).toBe('25')
  })
})
