// Chi può fare cosa (rispecchia le regole del database, verificate nei test SQL).
import { describe, expect, it } from 'vitest'
import { puo, RUOLI, RUOLI_GESTIONE, type Permesso } from '@/modules/auth/permessi'

describe('permessi', () => {
  const tutti: Permesso[] = ['eventi.crea', 'eventi.modifica', 'eventi.tutti', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci', 'utenti', 'soldi', 'carte']
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
  it('il gestore operatori non vede nessun importo', () => { expect(puo('gestore_operatori', 'soldi')).toBe(false); expect(puo('gestore_operatori', 'carte')).toBe(false) })
  it('il project vede i soldi (dei suoi eventi) ma non le carte', () => { expect(puo('project', 'soldi')).toBe(true); expect(puo('project', 'carte')).toBe(false) })
  it('l\'amministrazione vede soldi e carte ma non crea eventi', () => {
    expect(puo('amministrazione', 'soldi')).toBe(true); expect(puo('amministrazione', 'carte')).toBe(true); expect(puo('amministrazione', 'eventi.crea')).toBe(false)
  })
})
