// Passaggi dell'operatore e ritardi.
import { describe, expect, it } from 'vitest'
import { PASSAGGI, passaggiFatti, prossimoPassaggio } from '@/modules/passaggi/passaggi'
import { ritardo } from '@/modules/passaggi/ritardi'

describe('passaggi', () => {
  it('sono sei, dal check-in al check-out', () => { expect(PASSAGGI.map((p) => p.id)).toEqual(['check_in', 'attrezzatura', 'montato', 'smontato', 'rientrato', 'check_out']) })
  it('nessun passaggio: si parte dal check-in', () => { expect(passaggiFatti(null)).toBe(0); expect(prossimoPassaggio(null)?.id).toBe('check_in') })
  it('dopo il montaggio: 3 fatti, poi smontato', () => { expect(passaggiFatti('montato')).toBe(3); expect(prossimoPassaggio('montato')?.id).toBe('smontato') })
  it('dopo il check-out non c\'è altro', () => { expect(passaggiFatti('check_out')).toBe(6); expect(prossimoPassaggio('check_out')).toBeNull() })
})

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
