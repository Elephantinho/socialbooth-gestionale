// Test a tappeto sulle regole pure, anche i casi stupidi: npm test
import { describe, expect, it } from 'vitest'
import { costruisciOrari, minutiInLocationPrevisti, minutiViaggioPagati, orarioRitiro } from '@/modules/eventi/logic/orari'
import { giaPassato, inArchivio, nonSvolto, daFatturare, daIncassare } from '@/modules/eventi/logic/archivio'
import { leggiBrief } from '@/modules/eventi/logic/brief'
import { statoCarta, confezioniPer, daRicaricare } from '@/modules/carta/logic/scorta'
import { regioneDiCitta, trovaCitta } from '@/shared/lib/citta'
import { combinaDataOra, durata, euro, iniziali, nomeCompleto, ora, perCampoData, dataBreve } from '@/shared/lib/formato'
import { chiaveMese, etichettaMese, etichettaSettimana, lunediDi } from '@/shared/lib/periodi'
import { numeroCsv } from '@/shared/lib/csv'
import { riepilogoEconomico } from '@/modules/costi/logic/riepilogo'
import { contiEvento, contiPer, type EventoEconomico } from '@/modules/costi/logic/perRegione'
import { previsioneEvento } from '@/modules/costi/logic/previsione'
import { puo, RUOLI, RUOLI_GESTIONE, type Permesso, type Ruolo } from '@/modules/auth/permessi'
import { perMe } from '@/modules/richieste/components/ListaRichieste'
import { MODELLI_OPERATORE, MODELLI_UFFICIO } from '@/modules/richieste/logic/modelli'
import { leggiCsv, magazziniDaCsv, normalizzaRegione } from '@/modules/anagrafiche/logic/importaCsv'
import { statoAttrezzatura } from '@/modules/attrezzatura/logic/stato'

/* ---------------- orari ---------------- */
describe('orari, casi limite', () => {
  const c = (d: string, o: string) => `${d}T${o}`
  it('nessun orario → nessuna data', () => expect(costruisciOrari('2026-10-28', [], c)).toEqual([]))
  it('orari uguali restano lo stesso giorno', () => {
    expect(costruisciOrari('2026-10-28', ['18:00', '18:00'], c)).toEqual(['2026-10-28T18:00', '2026-10-28T18:00'])
  })
  it('mezzanotte esatta come smontaggio va al giorno dopo', () => {
    expect(costruisciOrari('2026-10-28', ['20:00', '23:00', '00:00'], c).at(-1)).toBe('2026-10-29T00:00')
  })
  it('fine mese e fine anno', () => {
    expect(costruisciOrari('2026-10-31', ['22:00', '01:00'], c)[1]).toBe('2026-11-01T01:00')
    expect(costruisciOrari('2026-12-31', ['22:00', '01:00'], c)[1]).toBe('2027-01-01T01:00')
    expect(costruisciOrari('2028-02-28', ['22:00', '01:00'], c)[1]).toBe('2028-02-29T01:00')
  })
  it('passa la mezzanotte una volta sola anche con orari dopo', () => {
    expect(costruisciOrari('2026-10-28', ['22:00', '23:00', '00:30', '01:30'], c)).toEqual(
      ['2026-10-28T22:00', '2026-10-28T23:00', '2026-10-29T00:30', '2026-10-29T01:30'])
  })
  it('ritiro con viaggio 0 = 20 minuti prima', () => expect(orarioRitiro('2026-10-28T18:00:00Z', 0)).toBe('2026-10-28T17:40:00.000Z'))
  it('ritiro che scavalca la mezzanotte all\'indietro', () => expect(orarioRitiro('2026-10-28T00:30:00Z', 60)).toBe('2026-10-27T23:10:00.000Z'))
  it('smontaggio prima dell\'allestimento → 0, mai negativo', () => {
    expect(minutiInLocationPrevisti('2026-10-28T18:00:00Z', '2026-10-28T17:00:00Z')).toBe(0)
  })
  it('evento su due giorni', () => expect(minutiInLocationPrevisti('2026-10-28T18:00:00Z', '2026-10-29T02:00:00Z')).toBe(480))
  it('viaggio non definito', () => expect(minutiViaggioPagati(undefined)).toBe(0))
})

/* ---------------- date e fuso ---------------- */
describe('fuso orario italiano', () => {
  it('ora solare: 18:00 a Roma = 17:00 UTC', () => expect(combinaDataOra('2026-12-10', '18:00')).toBe('2026-12-10T17:00:00.000Z'))
  it('ora legale: 18:00 a Roma = 16:00 UTC', () => expect(combinaDataOra('2026-07-10', '18:00')).toBe('2026-07-10T16:00:00.000Z'))
  it('giorno del cambio d\'ora (ottobre): sera già in ora solare', () => expect(combinaDataOra('2026-10-25', '20:00')).toBe('2026-10-25T19:00:00.000Z'))
  it('giorno del cambio d\'ora (marzo): sera già in ora legale', () => expect(combinaDataOra('2026-03-29', '20:00')).toBe('2026-03-29T18:00:00.000Z'))
  it('mezzanotte e un minuto prima di mezzanotte', () => {
    expect(combinaDataOra('2026-12-10', '00:00')).toBe('2026-12-09T23:00:00.000Z')
    expect(combinaDataOra('2026-12-10', '23:59')).toBe('2026-12-10T22:59:00.000Z')
  })
  it('andata e ritorno: data e ora ricombinate tornano uguali', () => {
    for (const [d, o] of [['2026-01-01', '00:15'], ['2026-06-30', '23:45'], ['2026-10-25', '12:00'], ['2026-03-29', '04:00']]) {
      const iso = combinaDataOra(d, o)
      expect(perCampoData(iso)).toBe(d)
      expect(ora(iso)).toBe(o)
    }
  })
  it('perCampoData usa il giorno italiano, non quello UTC', () => expect(perCampoData('2026-10-28T23:30:00Z')).toBe('2026-10-29'))
  it('ora vuota', () => { expect(ora(null)).toBe('—'); expect(ora(undefined)).toBe('—') })
  it('data breve con maiuscola e senza punto', () => expect(dataBreve('2026-10-28T10:00:00Z')).toMatch(/^Mer 28 ottobre$/))
})

describe('formato', () => {
  it('durata', () => {
    expect(durata(0)).toBe('0 min'); expect(durata(null)).toBe('0 min'); expect(durata(45)).toBe('45 min')
    expect(durata(60)).toBe('1 h'); expect(durata(315)).toBe('5 h 15 min'); expect(durata(1440)).toBe('24 h')
  })
  it('euro', () => {
    expect(euro(null)).toBe('—'); expect(euro(undefined)).toBe('—')
    expect(euro(0)).toMatch(/0,00\s€/); expect(euro(12345.5)).toMatch(/12\.345,50\s€/); expect(euro(-20)).toMatch(/-20,00\s€/)
  })
  it('nomi e iniziali', () => {
    expect(nomeCompleto(null)).toBe('Senza nome'); expect(nomeCompleto({ nome: '', cognome: '' })).toBe('Senza nome')
    expect(nomeCompleto({ nome: 'Mario', cognome: null })).toBe('Mario'); expect(nomeCompleto({ nome: 'Mario', cognome: 'Rossi' })).toBe('Mario Rossi')
    expect(iniziali('altea mascolo')).toBe('AM'); expect(iniziali('Mario')).toBe('M'); expect(iniziali('')).toBe('?'); expect(iniziali(null)).toBe('?')
    expect(iniziali('  Anna   Maria  Rossi ')).toBe('AM')
  })
  it('numeri per Excel', () => {
    expect(numeroCsv(null)).toBe(''); expect(numeroCsv('')).toBe(''); expect(numeroCsv(0)).toBe('0,00')
    expect(numeroCsv('12.5')).toBe('12,50'); expect(numeroCsv(3, 0)).toBe('3')
  })
})

describe('periodi', () => {
  it('lunedì della settimana', () => {
    expect(lunediDi('2026-10-28T10:00:00Z')).toBe('2026-10-26') // mercoledì
    expect(lunediDi('2026-10-26T10:00:00Z')).toBe('2026-10-26') // lunedì stesso
    expect(lunediDi('2026-11-01T10:00:00Z')).toBe('2026-10-26') // domenica
    expect(lunediDi('2026-11-01T23:30:00Z')).toBe('2026-11-02') // domenica sera UTC = lunedì in Italia
  })
  it('mese italiano anche a cavallo della mezzanotte', () => {
    expect(chiaveMese('2026-10-31T23:30:00Z')).toBe('2026-11')
    expect(chiaveMese('2026-10-31T21:30:00Z')).toBe('2026-10')
  })
  it('etichette', () => {
    expect(etichettaSettimana('2026-10-26')).toBe('26 ott – 1 nov')
    expect(etichettaSettimana('2026-10-12')).toBe('12–18 ott')
    expect(etichettaMese('2026-10')).toBe('ottobre 2026')
  })
})

/* ---------------- archivio ---------------- */
describe('archivio, tutti gli stati', () => {
  const adesso = new Date('2026-10-20T12:00:00Z').getTime()
  const passato = '2026-10-19T23:00:00Z'
  const futuro = '2026-10-21T23:00:00Z'
  const stati = ['bozza', 'da_assegnare', 'proposto', 'confermato', 'in_corso', 'completato', 'annullato']
  it.each(stati)('%s nel futuro', (stato) => {
    expect(inArchivio({ stato, smontaggio_il: futuro }, adesso)).toBe(stato === 'completato' || stato === 'annullato')
  })
  it.each(stati)('%s nel passato', (stato) => {
    expect(inArchivio({ stato, smontaggio_il: passato }, adesso)).toBe(!['confermato', 'in_corso'].includes(stato))
  })
  it('esattamente adesso non è ancora passato', () => expect(giaPassato({ smontaggio_il: new Date(adesso).toISOString() }, adesso)).toBe(false))
  it('nonSvolto solo per chi non è mai partito', () => {
    expect(nonSvolto({ stato: 'completato', smontaggio_il: passato }, adesso)).toBe(false)
    expect(nonSvolto({ stato: 'annullato', smontaggio_il: passato }, adesso)).toBe(false)
    expect(nonSvolto({ stato: 'proposto', smontaggio_il: passato }, adesso)).toBe(true)
  })
  it('fatture: solo i completati, numero vuoto = senza fattura', () => {
    expect(daFatturare({ stato: 'confermato', fattura_numero: null })).toBe(false)
    expect(daFatturare({ stato: 'completato', fattura_numero: '' })).toBe(true)
    expect(daFatturare({ stato: 'completato', fattura_numero: '12/2026' })).toBe(false)
    expect(daIncassare({ fattura_importo: null, fattura_pagata: false })).toBe(false)
    expect(daIncassare({ fattura_importo: 0, fattura_pagata: false })).toBe(true)
  })
})

/* ---------------- carta ---------------- */
describe('carta, casi limite', () => {
  it('esattamente alla soglia non è rossa', () => expect(statoCarta(200, 200, 0, null).livello).toBe('ok'))
  it('negativa = finita', () => expect(statoCarta(-5, 200, 0, null).livello).toBe('finita'))
  it('senza media non può calcolare il fabbisogno', () => {
    const s = statoCarta(500, 200, 3, null)
    expect(s).toMatchObject({ livello: 'ok', fabbisogno: 0, eventiCoperti: null })
  })
  it('media zero come senza media', () => expect(statoCarta(500, 200, 3, 0).eventiCoperti).toBeNull())
  it('quanta mandarne: almeno fino alla soglia più il fabbisogno', () => {
    expect(statoCarta(100, 200, 0, 300).daMandare).toBe(100)
    expect(statoCarta(100, 200, 2, 300).daMandare).toBe(700)
    expect(statoCarta(5000, 200, 2, 300).daMandare).toBe(0)
  })
  it('eventi coperti', () => expect(statoCarta(650, 200, 3, 300).eventiCoperti).toBe(2))
  it('da ricaricare solo bassa o finita', () => {
    expect(daRicaricare('bassa')).toBe(true); expect(daRicaricare('finita')).toBe(true)
    expect(daRicaricare('ok')).toBe(false); expect(daRicaricare('da_impostare')).toBe(false)
  })
  it('confezioni: mai zero, mai divisione per zero', () => {
    expect(confezioniPer(0, 700)).toBe(1); expect(confezioniPer(700, 700)).toBe(1); expect(confezioniPer(1400, 700)).toBe(2)
    expect(confezioniPer(5, 0)).toBe(5)
  })
})

/* ---------------- soldi ---------------- */
const ev = (x: Partial<EventoEconomico> = {}): EventoEconomico => ({
  regione: 'Toscana', stato: 'confermato', allestimento_il: '2026-11-10T10:00:00Z', smontaggio_il: '2026-11-10T16:00:00Z',
  viaggio_minuti: 30, prezzo_cliente: 1000, fattura_importo: null, operatore: { tariffa_oraria: 20 }, ore: [], costi: [], ...x,
})

describe('riepilogo economico', () => {
  it('compenso previsto = (location + viaggio) × tariffa', () => {
    // 6 h in location + 1 h di viaggio a/r = 7 h × 20 €
    expect(contiEvento(ev()).compensi).toBe(140)
  })
  it('senza tariffa il compenso previsto è 0, non NaN', () => {
    const c = contiEvento(ev({ operatore: null }))
    expect(c.compensi).toBe(0); expect(Number.isNaN(c.margine)).toBe(false)
  })
  it('senza prezzo: ricavo 0 nei conti, margine negativo', () => {
    const c = contiEvento(ev({ prezzo_cliente: null }))
    expect(c.ricavi).toBe(0); expect(c.margine).toBe(-140)
  })
  it('la fattura vince sul prezzo concordato', () => expect(contiEvento(ev({ fattura_importo: 1100 })).ricavi).toBe(1100))
  it('fattura a 0 € vale 0, non torna al prezzo', () => expect(contiEvento(ev({ fattura_importo: 0 })).ricavi).toBe(0))
  it('i centesimi non sballano', () => {
    const r = riepilogoEconomico({
      costi: [0.1, 0.2, 0.3].map((importo) => ({ fase: 'previsto' as const, categoria: 'pedaggi' as const, importo, stato: 'approvato' as const })),
      minutiPrevisti: 0, tariffa: null, compensoFinale: null, ricavo: 1,
    })
    expect(r.totalePrevisto).toBe(0.6); expect(r.marginePrevisto).toBe(0.4)
  })
  it('margine finale solo dopo la chiusura', () => {
    expect(riepilogoEconomico({ costi: [], minutiPrevisti: 60, tariffa: 10, compensoFinale: null, ricavo: 100 }).margineFinale).toBeNull()
    expect(riepilogoEconomico({ costi: [], minutiPrevisti: 60, tariffa: 10, compensoFinale: 12, ricavo: 100 }).margineFinale).toBe(88)
  })
  it('importi null contano come 0', () => {
    const r = riepilogoEconomico({ costi: [{ fase: 'finale', categoria: 'vitto', importo: null, stato: 'inviato' }], minutiPrevisti: 0, tariffa: 0, compensoFinale: 0, ricavo: null })
    expect(r.totaleFinale).toBe(0); expect(r.marginePrevisto).toBeNull()
  })
  it('chiusura senza check-out non conta come chiusa', () => {
    expect(contiEvento(ev({ ore: [{ compenso: 999, stato: 'inviato', check_out_il: null }] })).compensi).toBe(140)
  })
  it('spesa anticipata dall\'operatore = rimborso; con carta aziendale no', () => {
    const c = contiEvento(ev({
      ore: [{ compenso: 100, stato: 'inviato', check_out_il: 'x' }],
      costi: [
        { fase: 'finale', categoria: 'parcheggio', importo: 10, stato: 'inviato', pagato_con: 'operatore' },
        { fase: 'finale', categoria: 'carburante', importo: 50, stato: 'approvato', pagato_con: 'carta_aziendale' },
      ],
    }))
    expect(c.rimborsi).toBe(10); expect(c.altriCosti).toBe(60); expect(c.costiTotali).toBe(160)
  })
  it('raggruppare non perde eventi né soldi', () => {
    const lista = Array.from({ length: 50 }, (_, i) => ev({ regione: ['Toscana', 'Lazio', 'Veneto'][i % 3], prezzo_cliente: i * 10 }))
    const m = contiPer(lista, (e) => e.regione)
    const tot = [...m.values()].reduce((s, c) => ({ e: s.e + c.eventi, r: s.r + c.ricavi }), { e: 0, r: 0 })
    expect(tot).toEqual({ e: 50, r: lista.reduce((s, e) => s + (e.prezzo_cliente ?? 0), 0) })
  })
  it('previsione: carta respinta non conta ma non viene stimata due volte', () => {
    const p = previsioneEvento(ev({ costi: [{ fase: 'previsto', categoria: 'carta_stampe', importo: 50, stato: 'respinto', pagato_con: 'azienda' }] }),
      { tariffaMedia: 20, costoStampa: 0.5, mediaStampe: 100 })
    expect(p.carta).toBe(0)
  })
  it('previsione: carta prevista a 0 € (costo non ancora impostato) viene stimata', () => {
    const p = previsioneEvento(ev({ costi: [{ fase: 'previsto', categoria: 'carta_stampe', importo: 0, stato: 'approvato', pagato_con: 'azienda' }] }),
      { tariffaMedia: 20, costoStampa: 0.5, mediaStampe: 100 })
    expect(p.carta).toBe(50)
  })
  it('previsione: un servizio che non stampa (Videobooth) non consuma carta', () => {
    const p = previsioneEvento(ev({ tipo_booth: { stampa: false } }), { tariffaMedia: 20, costoStampa: 0.5, mediaStampe: 100 })
    expect(p.carta).toBe(0); expect(p.stampe).toBe(0)
  })
  it('previsione senza dati sulla carta: 0, non NaN', () => {
    const p = previsioneEvento(ev(), { tariffaMedia: null, costoStampa: 0, mediaStampe: null })
    expect(p.carta).toBe(0); expect(p.stampe).toBe(0); expect(Number.isNaN(p.margine)).toBe(false)
  })
})

/* ---------------- permessi ---------------- */
describe('permessi', () => {
  const tutti: Permesso[] = ['eventi.crea', 'eventi.modifica', 'eventi.tutti', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci',
    'carta.ricarica', 'magazzini', 'location', 'clienti', 'soldi', 'ore.approva', 'fatture', 'tariffe', 'carte', 'utenti', 'impostazioni']
  const ruoli = RUOLI.map((r) => r.id)
  it('l\'admin ha tutto', () => tutti.forEach((p) => expect(puo('admin', p)).toBe(true)))
  it('l\'operatore non ha niente del pannello', () => tutti.forEach((p) => expect(puo('operatore', p)).toBe(false)))
  it('solo l\'admin cambia ruoli e impostazioni', () => {
    for (const r of ruoli) { expect(puo(r, 'utenti')).toBe(r === 'admin'); expect(puo(r, 'impostazioni')).toBe(r === 'admin') }
  })
  it('il gestore operatori non vede i soldi', () => {
    for (const p of ['soldi', 'fatture', 'tariffe', 'carte', 'ore.approva'] as Permesso[]) expect(puo('gestore_operatori', p)).toBe(false)
  })
  it('il project vede solo i suoi eventi e non tocca magazzini, tariffe, carte', () => {
    for (const p of ['eventi.tutti', 'magazzini', 'tariffe', 'carte', 'fatture', 'operatori.gestisci'] as Permesso[]) expect(puo('project', p)).toBe(false)
    expect(puo('project', 'eventi.crea')).toBe(true)
  })
  it('l\'amministrazione non crea né assegna eventi', () => {
    expect(puo('amministrazione', 'eventi.crea')).toBe(false); expect(puo('amministrazione', 'eventi.assegna')).toBe(false)
    expect(puo('amministrazione', 'fatture')).toBe(true)
  })
  it('chi assegna deve poter vedere gli eventi da assegnare; chi gestisce operatori li deve vedere', () => {
    for (const r of ruoli) if (puo(r, 'operatori.gestisci')) expect(puo(r, 'operatori.vedi')).toBe(true)
  })
  it('ogni ruolo del pannello ha almeno un permesso, ruolo sconosciuto nessuno', () => {
    RUOLI_GESTIONE.forEach((r) => expect(tutti.some((p) => puo(r, p))).toBe(true))
    expect(puo('hacker' as Ruolo, 'soldi')).toBe(false)
  })
})

/* ---------------- richieste ---------------- */
describe('richieste: per chi è', () => {
  const r = (x: Partial<{ da_id: string; per_utente: string | null; per_ruolo: string | null }>) =>
    ({ da_id: 'a', per_utente: null, per_ruolo: null, ...x }) as Parameters<typeof perMe>[0]
  it('mai "per me" se l\'ho scritta io', () => expect(perMe(r({ da_id: 'io', per_utente: 'io' }), { id: 'io', ruolo: 'admin' })).toBe(false))
  it('per la persona indicata', () => {
    expect(perMe(r({ per_utente: 'io' }), { id: 'io', ruolo: 'project' })).toBe(true)
    expect(perMe(r({ per_utente: 'altro' }), { id: 'io', ruolo: 'project' })).toBe(false)
  })
  it('per tutto il ruolo', () => {
    expect(perMe(r({ per_ruolo: 'gestore_operatori' }), { id: 'io', ruolo: 'gestore_operatori' })).toBe(true)
    expect(perMe(r({ per_ruolo: 'gestore_operatori' }), { id: 'io', ruolo: 'project' })).toBe(false)
  })
  it('a una persona precisa: l\'admin non la conta come sua', () => {
    expect(perMe(r({ per_utente: 'altro' }), { id: 'io', ruolo: 'admin' })).toBe(false)
  })
  it('modelli: titoli sensati anche senza campi', () => {
    for (const m of [...MODELLI_UFFICIO, ...MODELLI_OPERATORE]) {
      const t = m.titolo({})
      expect(t.length).toBeGreaterThan(3); expect(t).not.toMatch(/undefined|null|NaN/)
    }
    expect(MODELLI_UFFICIO[0].titolo({ operatore: 'Giulia', confezioni: 2 })).toBe('Carta a Giulia (2 conf.)')
  })
  it('id dei modelli unici', () => {
    expect(new Set(MODELLI_UFFICIO.map((m) => m.id)).size).toBe(MODELLI_UFFICIO.length)
    expect(new Set(MODELLI_OPERATORE.map((m) => m.id)).size).toBe(MODELLI_OPERATORE.length)
  })
})

/* ---------------- città ---------------- */
describe('città', () => {
  it('maiuscole, accenti, apostrofi', () => {
    expect(regioneDiCitta('FORLI')).toBe('Emilia-Romagna'); expect(regioneDiCitta('Forlì')).toBe('Emilia-Romagna')
    expect(regioneDiCitta("l'aquila")).toBe('Abruzzo'); expect(regioneDiCitta('  firenze ')).toBe('Toscana')
    expect(regioneDiCitta('Atlantide')).toBeNull(); expect(regioneDiCitta('')).toBeNull()
  })
  it('la più lunga vince: Reggio Emilia non è Reggio Calabria, Sesto Fiorentino non è Sesto San Giovanni', () => {
    expect(trovaCitta('evento a Reggio Emilia')?.regione).toBe('Emilia-Romagna')
    expect(trovaCitta('a Reggio Calabria')?.regione).toBe('Calabria')
    expect(trovaCitta('Sesto Fiorentino, villa')?.nome).toBe('Sesto Fiorentino')
  })
  it('non trova città dentro altre parole', () => {
    expect(trovaCitta('Romantico evento')).toBeNull()
    expect(trovaCitta('pisano')).toBeNull()
  })
  it('parole comuni non sono città, scritte minuscole', () => {
    expect(trovaCitta('allestimento sul prato del giardino')).toBeNull()
    expect(trovaCitta('partenza all\'alba')).toBeNull()
    expect(trovaCitta('evento a Prato, villa')?.regione).toBe('Toscana')
    expect(trovaCitta('PRATO')?.nome).toBe('Prato')
  })
  it('punteggiatura attaccata', () => expect(trovaCitta('(Firenze)')?.nome).toBe('Firenze'))
})

/* ---------------- brief ---------------- */
describe('brief, casi difficili', () => {
  const tipi = [{ id: 'p', nome: 'Photobooth' }, { id: 'v', nome: 'Videobooth 360' }, { id: 'va', nome: 'Videobooth 360 AI' }, { id: 'm', nome: 'Social Mirror' }]
  const clienti = [{ id: 'c', nome: 'Gucci' }, { id: 'x', nome: 'Al' }]
  const oggi = new Date('2026-10-16T10:00:00Z')
  const leggi = (t: string) => leggiBrief(t, { tipi, clienti, oggi }).dati

  it('testo vuoto non rompe nulla', () => expect(leggi('')).toEqual({}))
  it('testo senza senso non inventa campi', () => {
    const d = leggi('ciao come stai? tutto bene grazie')
    expect(d.data).toBeUndefined(); expect(d.allestimento).toBeUndefined(); expect(d.citta).toBeUndefined()
  })
  it('l\'orario con il punto non diventa una data', () => {
    expect(leggi('Allestimento ore 10.05').data).toBeUndefined()
    expect(leggi('Evento 15 marzo, allestimento ore 10.05').data).toBe('2027-03-15')
  })
  it('il civico con il trattino non diventa una data', () => {
    expect(leggi('Via Roma 3-5, Firenze').data).toBeUndefined()
  })
  it('orari con il trattino non vengono persi né presi per date', () => {
    expect(leggi('Evento 19-23')).toMatchObject({ inizio: '19:00', fine: '23:00' })
    expect(leggi('Evento 19-23').data).toBeUndefined()
    expect(leggi('Evento 28/10 dalle 18 alle 22')).toMatchObject({ data: '2026-10-28', inizio: '18:00', fine: '22:00' })
  })
  it('date in tanti formati', () => {
    expect(leggi('28/10/2026').data).toBe('2026-10-28')
    expect(leggi('28-10-26').data).toBe('2026-10-28')
    expect(leggi('28 ott').data).toBe('2026-10-28')
    expect(leggi('il 1 gennaio').data).toBe('2027-01-01')
    expect(leggi('oggi 16/10').data).toBe('2026-10-16')
  })
  it('date impossibili ignorate', () => {
    expect(leggi('45/10').data).toBeUndefined(); expect(leggi('10/13').data).toBeUndefined()
  })
  it('Videobooth 360 AI non viene scambiato per il 360 normale', () => expect(leggi('Videobooth 360 AI a Milano').tipoBoothId).toBe('va'))
  it('cliente con nome corto non si attacca a parole a caso', () => expect(leggi('Allestimento alle 18').clienteId).toBeUndefined())
  it('"no hostess" e "wifi presente"', () => {
    const d = leggi('No hostess\nWifi presente\nZTL: sì')
    expect(d).toMatchObject({ hostess: false, wifi: true, ztl: true })
  })
  it('telefono con +39', () => expect(leggi('Referente Anna +39 347 123 4567').referenteTelefono).toBe('+393471234567'))
  it('il telefono non diventa un orario', () => {
    const d = leggi('Marco 333 1234567')
    expect(d.allestimento).toBeUndefined(); expect(d.inizio).toBeUndefined()
  })
  it('deduce allestimento e smontaggio se mancano', () => {
    const d = leggi('Evento dalle 19:00 alle 23:00')
    expect(d).toMatchObject({ inizio: '19:00', fine: '23:00', allestimento: '17:30', smontaggio: '23:30' })
  })
  it('evento che finisce dopo mezzanotte: smontaggio dedotto oltre la mezzanotte', () => {
    expect(leggi('Evento dalle 22:00 alle 23:45').smontaggio).toBe('00:15')
  })
  it('allestimento la mattina presto: niente orari negativi', () => {
    expect(leggi('Inizio ore 01:00').allestimento).toBe('23:30')
  })
})

/* ---------------- CSV ---------------- */
describe('CSV', () => {
  it('file vuoto o solo spazi', () => { expect(leggiCsv('')).toEqual([]); expect(magazziniDaCsv('\n\n  \n')).toEqual([]) })
  it('BOM di Excel e fine riga Windows', () => expect(leggiCsv('﻿a;b\r\nc;d\r\n')).toEqual([['a', 'b'], ['c', 'd']]))
  it('senza intestazione la prima riga è un magazzino', () => {
    expect(magazziniDaCsv('Magazzino Roma;Via X;Roma;Lazio')[0]).toMatchObject({ nome: 'Magazzino Roma', regione: 'Lazio', riga: 1 })
  })
  it('regione sbagliata → null, non inventata', () => expect(magazziniDaCsv('A;B;C;Narnia')[0].regione).toBeNull())
  it('colonne mancanti → stringhe vuote', () => expect(magazziniDaCsv('Magazzino Nomentana')[0]).toMatchObject({ nome: 'Magazzino Nomentana', indirizzo: '', citta: '', regione: null }))
  it('regioni scritte in modi diversi', () => {
    expect(normalizzaRegione('emilia romagna')).toBe('Emilia-Romagna'); expect(normalizzaRegione("valle d aosta")).toBe("Valle d'Aosta")
    expect(normalizzaRegione('friuli venezia giulia')).toBe('Friuli-Venezia Giulia')
  })
})

describe('attrezzatura', () => {
  it('solo consumabili prelevati: resta "fuori" (non tornano), mai "rientrata" da sola', () => {
    expect(statoAttrezzatura([{ prelevato_il: 'x', rientrato_il: null, articolo: { categoria: 'Consumabili' } }])).toBe('fuori')
  })
  it('articolo senza categoria conta come da riportare', () => {
    expect(statoAttrezzatura([{ prelevato_il: 'x', rientrato_il: null, articolo: null }])).toBe('fuori')
  })
})
