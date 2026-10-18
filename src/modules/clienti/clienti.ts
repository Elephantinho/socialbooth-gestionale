// Clienti: i dati che servono per la fattura elettronica e i controlli sulla loro forma.
// Le stesse regole stanno nel database (migrazioni 0046 e 0047): qui servono a dire subito cosa non va.
import type { Riga } from '@/shared/types/database'

export type Cliente = Riga<'clienti'>
export type TipoCliente = 'azienda' | 'privato'

export type DatiCliente = {
  tipo: TipoCliente
  nome: string
  partita_iva: string; codice_fiscale: string; codice_sdi: string; pec: string
  indirizzo: string; cap: string; citta: string; provincia: string
  email: string; telefono: string; note: string
}

export const clienteVuoto: DatiCliente = {
  tipo: 'azienda', nome: '', partita_iva: '', codice_fiscale: '', codice_sdi: '', pec: '',
  indirizzo: '', cap: '', citta: '', provincia: '', email: '', telefono: '', note: '',
}

export const daCliente = (c: Cliente): DatiCliente => ({
  tipo: c.tipo === 'privato' ? 'privato' : 'azienda', nome: c.nome,
  partita_iva: c.partita_iva ?? '', codice_fiscale: c.codice_fiscale ?? '', codice_sdi: c.codice_sdi ?? '', pec: c.pec ?? '',
  indirizzo: c.indirizzo ?? '', cap: c.cap ?? '', citta: c.citta ?? '', provincia: c.provincia ?? '',
  email: c.email ?? '', telefono: c.telefono ?? '', note: c.note ?? '',
})

const pulisci = (t: string) => t.replace(/\s/g, '').toUpperCase()

/** Partita IVA italiana: 11 cifre e cifra di controllo giusta ("IT" davanti e spazi vanno bene) */
export function partitaIvaValida(t: string): boolean {
  const p = pulisci(t).replace(/^IT/, '')
  if (!/^\d{11}$/.test(p)) return false
  let somma = 0
  for (let i = 0; i < 10; i++) {
    const n = Number(p[i])
    somma += i % 2 === 0 ? n : n * 2 > 9 ? n * 2 - 9 : n * 2
  }
  return (10 - (somma % 10)) % 10 === Number(p[10])
}

/** Codice fiscale di una persona: 16 caratteri nella forma giusta (lettere e numeri al loro posto) */
export const codiceFiscaleValido = (t: string) =>
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(pulisci(t))

const codiceSdiValido = (t: string) => /^[A-Z0-9]{7}$/.test(pulisci(t))
const emailValida = (t: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.trim())

/** Cosa manca o è sbagliato, campo per campo (vuoto = si può salvare) */
export function controllaCliente(d: DatiCliente): Partial<Record<keyof DatiCliente, string>> {
  const e: Partial<Record<keyof DatiCliente, string>> = {}
  if (d.nome.trim().length < 2) e.nome = d.tipo === 'azienda' ? 'Scrivi la ragione sociale' : 'Scrivi nome e cognome'
  if (d.tipo === 'azienda') {
    if (!partitaIvaValida(d.partita_iva)) e.partita_iva = d.partita_iva.trim() ? 'Partita IVA non valida: controlla le cifre' : 'Scrivi la partita IVA'
    const sdi = d.codice_sdi.trim(), pec = d.pec.trim()
    if (!sdi && !pec) e.codice_sdi = 'Serve il codice SDI oppure la PEC'
    else {
      if (sdi && !codiceSdiValido(sdi)) e.codice_sdi = 'Il codice SDI ha 7 caratteri'
      if (pec && !emailValida(pec)) e.pec = 'PEC non valida'
    }
  } else if (!codiceFiscaleValido(d.codice_fiscale)) {
    e.codice_fiscale = d.codice_fiscale.trim() ? 'Codice fiscale non valido' : 'Scrivi il codice fiscale'
  }
  if (!d.indirizzo.trim()) e.indirizzo = "Scrivi l'indirizzo della sede"
  if (!/^\d{5}$/.test(d.cap.trim())) e.cap = 'CAP di 5 cifre'
  if (!d.citta.trim()) e.citta = 'Scrivi la città'
  if (!/^[A-Za-z]{2}$/.test(d.provincia.trim())) e.provincia = 'Sigla, es. FI'
  if (d.email.trim() && !emailValida(d.email)) e.email = 'Email non valida'
  return e
}

/** Il dato che identifica il cliente in fattura: "P.IVA 01234567890" o "CF RSSMRA…" */
export const identificativo = (c: Pick<Cliente, 'tipo' | 'partita_iva' | 'codice_fiscale'>) =>
  c.tipo === 'privato' ? (c.codice_fiscale ? `CF ${c.codice_fiscale}` : '') : (c.partita_iva ? `P.IVA ${c.partita_iva}` : '')

/** Minuscolo e senza accenti, per cercare senza badarci */
const norm = (t: string | null) => (t ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Ricerca per nome, partita IVA, codice fiscale o città, senza badare a maiuscole e accenti */
export function cercaClienti<C extends Pick<Cliente, 'nome' | 'partita_iva' | 'codice_fiscale' | 'citta'>>(clienti: C[], testo: string): C[] {
  const parole = norm(testo).split(/\s+/).filter(Boolean)
  if (!parole.length) return clienti
  return clienti.filter((c) => {
    const tutto = norm(`${c.nome} ${c.partita_iva ?? ''} ${c.codice_fiscale ?? ''} ${c.citta ?? ''}`)
    return parole.every((p) => tutto.includes(p))
  })
}
