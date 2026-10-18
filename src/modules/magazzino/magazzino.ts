// Magazzini: dove stanno booth e materiale, e quanta carta resta in ognuno.
// Le stesse regole stanno nel database (migrazione 0049): qui servono a dire subito cosa non va.
import type { Enum, Riga } from '@/shared/types/database'

export type Magazzino = Riga<'magazzini'>
export type Articolo = Riga<'articoli'>
export type StatoArticolo = Enum<'stato_articolo'>

export const CATEGORIE = [
  { id: 'booth', etichetta: 'Booth' },
  { id: 'stampante', etichetta: 'Stampanti' },
  { id: 'fotocamera', etichetta: 'Fotocamere' },
  { id: 'luci', etichetta: 'Luci' },
  { id: 'fondale', etichetta: 'Fondali' },
  { id: 'accessori', etichetta: 'Accessori' },
  { id: 'altro', etichetta: 'Altro' },
] as const

export const STATI: Record<StatoArticolo, string> = {
  disponibile: 'Disponibile',
  in_manutenzione: 'In manutenzione',
  fuori_uso: 'Fuori uso',
}

/** Quante stampe ci sono in un rotolo: serve per caricare la carta a rotoli interi */
export const STAMPE_PER_ROTOLO = 400

/** La carta è poca quando resta meno della scorta minima del magazzino */
export const cartaBassa = (m: Pick<Magazzino, 'carta_stampe' | 'carta_minima'>) => m.carta_stampe < m.carta_minima

/** Rotoli interi che restano, per dirlo come lo direbbe chi sta in magazzino */
export const rotoli = (stampe: number) => Math.floor(stampe / STAMPE_PER_ROTOLO)

/** Pezzi per categoria, nell'ordine fisso, solo le categorie presenti; i pezzi non disponibili a parte */
export function perCategoria(articoli: Pick<Articolo, 'categoria' | 'quantita' | 'stato'>[]) {
  return CATEGORIE.map((c) => {
    const diQuesta = articoli.filter((a) => (CATEGORIE.some((x) => x.id === a.categoria) ? a.categoria : 'altro') === c.id)
    return {
      ...c,
      pezzi: diQuesta.reduce((t, a) => t + a.quantita, 0),
      fermi: diQuesta.filter((a) => a.stato !== 'disponibile').reduce((t, a) => t + a.quantita, 0),
    }
  }).filter((c) => c.pezzi > 0)
}

export type DatiMagazzino = {
  nome: string; indirizzo: string; citta: string; regione: Enum<'regione'> | ''
  responsabile_id: string; carta_minima: string; note: string
}

export const magazzinoVuoto: DatiMagazzino = { nome: '', indirizzo: '', citta: '', regione: '', responsabile_id: '', carta_minima: String(STAMPE_PER_ROTOLO), note: '' }

export const daMagazzino = (m: Magazzino): DatiMagazzino => ({
  nome: m.nome, indirizzo: m.indirizzo, citta: m.citta, regione: m.regione,
  responsabile_id: m.responsabile_id ?? '', carta_minima: String(m.carta_minima), note: m.note ?? '',
})

const intero = (t: string) => (/^\d+$/.test(t.trim()) ? Number(t.trim()) : null)

export function controllaMagazzino(d: DatiMagazzino): Partial<Record<keyof DatiMagazzino, string>> {
  const e: Partial<Record<keyof DatiMagazzino, string>> = {}
  if (!d.nome.trim()) e.nome = 'Scrivi il nome'
  if (!d.indirizzo.trim()) e.indirizzo = "Scrivi l'indirizzo"
  if (!d.citta.trim()) e.citta = 'Scrivi la città'
  if (!d.regione) e.regione = 'Scegli la regione'
  if (intero(d.carta_minima) == null) e.carta_minima = 'Un numero di stampe, es. 400'
  return e
}

/** I dati del modulo come vanno nel database */
export const rigaMagazzino = (d: DatiMagazzino) => ({
  nome: d.nome.trim(), indirizzo: d.indirizzo.trim(), citta: d.citta.trim(), regione: d.regione as Enum<'regione'>,
  responsabile_id: d.responsabile_id || null, carta_minima: intero(d.carta_minima) ?? 0, note: d.note.trim() || null,
})

