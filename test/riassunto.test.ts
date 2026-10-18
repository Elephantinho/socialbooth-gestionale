// Le frasi in cima alla Panoramica.
import { describe, expect, it } from 'vitest'
import { riassuntoDelGiorno } from '@/modules/eventi/logic/riassunto'

// Domenica 18 ottobre 2026, 15:00 a Roma (UTC+2)
const adesso = Date.parse('2026-10-18T13:00:00Z')
const ev = (nome: string, inizio: string, stato = 'confermato', extra: object = {}) => ({
  nome, citta: 'Firenze', stato, ultimo_passaggio: null, operatore: { nome: 'Luca', cognome: 'Bini' },
  allestimento_il: inizio, inizio_attivazione: new Date(Date.parse(inizio) + 2 * 3600e3).toISOString(), smontaggio_il: new Date(Date.parse(inizio) + 6 * 3600e3).toISOString(), ...extra,
})

describe('riassunto del giorno', () => {
  it('nessun evento oggi: dice il prossimo', () => {
    expect(riassuntoDelGiorno([ev('Matrimonio Rossi', '2026-10-19T12:46:00Z')], adesso, true))
      .toEqual(['Oggi niente eventi. Il prossimo è domani alle 14:46: Matrimonio Rossi a Firenze.'])
    expect(riassuntoDelGiorno([ev('Gala', '2026-10-21T07:00:00Z')], adesso, true)[0])
      .toBe('Oggi niente eventi. Il prossimo è mercoledì 21 ottobre alle 09:00: Gala a Firenze.')
    expect(riassuntoDelGiorno([], adesso, true)).toEqual(['Oggi niente eventi, e per ora nessuno in programma.'])
  })
  it('un evento solo', () => {
    expect(riassuntoDelGiorno([ev('Pitti', '2026-10-18T16:00:00Z')], adesso, true))
      .toEqual(["Oggi c'è un evento: Pitti alle 18:00 a Firenze."])
  })
  it('più eventi: quanti conclusi, in corso, da iniziare', () => {
    const lista = [ev('A', '2026-10-18T06:00:00Z', 'completato'), ev('B', '2026-10-18T07:00:00Z', 'completato'),
      ev('C', '2026-10-18T10:00:00Z', 'in_corso', { ultimo_passaggio: 'montato' }), ev('D', '2026-10-18T17:00:00Z')]
    expect(riassuntoDelGiorno(lista, adesso, true)[0]).toBe('Oggi ci sono 4 eventi: 2 conclusi, 1 in corso e 1 deve ancora iniziare.')
    expect(riassuntoDelGiorno(lista.slice(0, 2), adesso, true)[0]).toBe('Oggi ci sono 2 eventi, tutti conclusi.')
  })
  it('il ritardo con il nome dell\'operatore, solo a chi segue i ritardi', () => {
    const lista = [ev('Eataly', '2026-10-18T11:56:00Z'), ev('Fiera', '2026-10-18T12:00:00Z')]
    expect(riassuntoDelGiorno(lista, adesso, true)[1]).toBe('Luca Bini non ha ancora fatto il check-in per Eataly. Anche un altro evento è in ritardo.')
    expect(riassuntoDelGiorno(lista, adesso, false)).toHaveLength(1)
  })
})
