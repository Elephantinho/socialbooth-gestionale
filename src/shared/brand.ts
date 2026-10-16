// Identità del marchio: nomi, frasi e logo stanno solo qui.
// Per cambiare logo: metti il file in public/brand/ e scrivi il percorso in `logo`.
// Per cambiare i colori: src/index.css (sezione "Colori del marchio").

export const BRAND = {
  nome: 'Socialbooth',
  prodotto: 'Gestionale',
  payoff: 'Marketing Experience for Corporate Events',
  descrizione: 'Photobooth, Videobooth 360 ed esperienze interattive per eventi aziendali, fiere e convention.',
  sito: 'https://socialbooth.it',
  societa: 'Wave Innovation Company srl Società Benefit',
  /** Percorso del logo ufficiale (es. '/brand/logo.svg'); vuoto = scritta "socialbooth" */
  logo: '' as string,
  linee: ['Photobooth Experience', 'Videobooth Experience', 'Interactive Experience', 'Room Experience', 'Advergaming & Edutainment'],
  citta: ['Milano', 'Verona', 'Genova', 'Bologna', 'Firenze', 'Roma', 'Napoli', 'Bari', 'Cagliari', 'Palermo'],
} as const
