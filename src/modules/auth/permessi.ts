// Chi può fare cosa. Rispecchia le regole del database (migrazione 0015):
// qui servono solo a mostrare o nascondere menu e pulsanti.
import { useProfilo } from './sessione'
import type { Enum } from '@/shared/types/database'

export type Ruolo = Enum<'ruolo'>

export type Permesso =
  | 'eventi.elenco'        // elenco degli eventi e calendario (chi organizza; l'amministrazione no)
  | 'eventi.crea'          // creare, duplicare, annullare eventi
  | 'eventi.modifica'      // modificare orari, luogo e note
  | 'eventi.tutti'         // vedere gli eventi di tutti (il project vede i suoi)
  | 'eventi.assegna'       // scegliere o cambiare l'operatore di un evento
  | 'operatori.vedi'       // pagina Operatori
  | 'operatori.gestisci'   // attivare operatori e cambiarne le regioni
  | 'utenti'               // cambiare i ruoli
  | 'soldi'                // prezzi, fatture, spese e margini (il project solo dei suoi eventi)
  | 'carte'                // carte aziendali e pagamenti arrivati dalla banca
  | 'clienti'              // anagrafica clienti (dati per la fattura)

const TUTTI: Permesso[] = ['eventi.elenco', 'eventi.crea', 'eventi.modifica', 'eventi.tutti', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci', 'utenti', 'soldi', 'carte', 'clienti']

/** Ogni ruolo ha solo quello che gli serve; l'admin ha tutto */
const PERMESSI: Record<Ruolo, Permesso[]> = {
  admin: TUTTI,
  project: ['eventi.elenco', 'eventi.crea', 'eventi.modifica', 'eventi.assegna', 'soldi', 'clienti'],
  gestore_operatori: ['eventi.elenco', 'eventi.tutti', 'eventi.modifica', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci'],
  amministrazione: ['eventi.tutti', 'soldi', 'carte', 'clienti'],
  operatore: [],
}

export const RUOLI: { id: Ruolo; etichetta: string; descrizione: string }[] = [
  { id: 'admin', etichetta: 'Admin', descrizione: 'Tutto, compresi utenti e ruoli' },
  { id: 'project', etichetta: 'Project', descrizione: 'I suoi eventi, con costi e ricavi' },
  { id: 'gestore_operatori', etichetta: 'Gestore operatori', descrizione: 'Tutti gli eventi e gli operatori, nessun importo' },
  { id: 'amministrazione', etichetta: 'Amministrazione', descrizione: 'Spese, fatture, incassi e margini di tutti' },
  { id: 'operatore', etichetta: 'Operatore', descrizione: 'App sul telefono' },
]

export const etichettaRuolo = (r: Ruolo) => RUOLI.find((x) => x.id === r)?.etichetta ?? r

/** Ruoli che usano il pannello web */
export const RUOLI_GESTIONE: Ruolo[] = ['admin', 'project', 'gestore_operatori', 'amministrazione']

export const puo = (ruolo: Ruolo, permesso: Permesso) => PERMESSI[ruolo]?.includes(permesso) ?? false

/** const puo = usePuo(); puo('soldi') */
export function usePuo() {
  const { ruolo } = useProfilo()
  return (permesso: Permesso) => puo(ruolo, permesso)
}

/** Dove arriva ogni ruolo dopo l'accesso */
export function homePerRuolo(ruolo: Ruolo) {
  return ruolo === 'operatore' ? '/operatore' : '/gestione/panoramica'
}
