// Capoluoghi di provincia e altre città frequenti → regione. Serve a capire la regione da un brief.
import type { Enum } from '@/shared/types/database'

const PER_REGIONE: Record<Enum<'regione'>, string[]> = {
  Abruzzo: ["L'Aquila", 'Chieti', 'Pescara', 'Teramo'],
  Basilicata: ['Potenza', 'Matera'],
  Calabria: ['Catanzaro', 'Cosenza', 'Crotone', 'Reggio Calabria', 'Vibo Valentia'],
  Campania: ['Napoli', 'Avellino', 'Benevento', 'Caserta', 'Salerno', 'Sorrento', 'Positano', 'Amalfi', 'Pozzuoli'],
  'Emilia-Romagna': ['Bologna', 'Ferrara', 'Forlì', 'Cesena', 'Modena', 'Parma', 'Piacenza', 'Ravenna', 'Reggio Emilia', 'Rimini', 'Riccione', 'Imola'],
  'Friuli-Venezia Giulia': ['Trieste', 'Gorizia', 'Pordenone', 'Udine'],
  Lazio: ['Roma', 'Frosinone', 'Latina', 'Rieti', 'Viterbo', 'Fiumicino', 'Tivoli'],
  Liguria: ['Genova', 'Imperia', 'La Spezia', 'Savona', 'Sanremo', 'Rapallo', 'Portofino'],
  Lombardia: ['Milano', 'Bergamo', 'Brescia', 'Como', 'Cremona', 'Lecco', 'Lodi', 'Mantova', 'Monza', 'Pavia', 'Sondrio', 'Varese', 'Rho', 'Sesto San Giovanni', 'Assago'],
  Marche: ['Ancona', 'Ascoli Piceno', 'Fermo', 'Macerata', 'Pesaro', 'Urbino'],
  Molise: ['Campobasso', 'Isernia'],
  Piemonte: ['Torino', 'Alessandria', 'Asti', 'Biella', 'Cuneo', 'Novara', 'Verbania', 'Vercelli', 'Alba'],
  Puglia: ['Bari', 'Barletta', 'Andria', 'Trani', 'Brindisi', 'Foggia', 'Lecce', 'Taranto', 'Monopoli'],
  Sardegna: ['Cagliari', 'Nuoro', 'Oristano', 'Sassari', 'Olbia', 'Alghero', 'Porto Cervo'],
  Sicilia: ['Palermo', 'Agrigento', 'Caltanissetta', 'Catania', 'Enna', 'Messina', 'Ragusa', 'Siracusa', 'Trapani', 'Taormina'],
  Toscana: ['Firenze', 'Arezzo', 'Grosseto', 'Livorno', 'Lucca', 'Massa', 'Carrara', 'Pisa', 'Pistoia', 'Prato', 'Siena', 'Viareggio', 'Forte dei Marmi', 'Scandicci', 'Sesto Fiorentino', 'Empoli', 'Fiesole'],
  'Trentino-Alto Adige': ['Trento', 'Bolzano', 'Rovereto', 'Merano'],
  Umbria: ['Perugia', 'Terni', 'Assisi', 'Spoleto'],
  "Valle d'Aosta": ['Aosta', 'Courmayeur'],
  Veneto: ['Venezia', 'Mestre', 'Belluno', 'Padova', 'Rovigo', 'Treviso', 'Verona', 'Vicenza', 'Jesolo', 'Bassano del Grappa'],
}

const normalizza = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Tutte le città conosciute, dalla più lunga (così "Reggio Emilia" vince su "Reggio") */
export const CITTA_NOTE = Object.entries(PER_REGIONE)
  .flatMap(([regione, citta]) => citta.map((nome) => ({ nome, regione: regione as Enum<'regione'>, chiave: normalizza(nome) })))
  .sort((a, b) => b.chiave.length - a.chiave.length)

export function regioneDiCitta(citta: string): Enum<'regione'> | null {
  const k = normalizza(citta)
  return CITTA_NOTE.find((c) => c.chiave === k)?.regione ?? null
}

/** Prima città conosciuta citata nel testo */
export function trovaCitta(testo: string) {
  const t = ` ${normalizza(testo).replace(/[^a-z0-9' ]+/g, ' ')} `
  return CITTA_NOTE.find((c) => t.includes(` ${c.chiave} `)) ?? null
}
