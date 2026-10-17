// Chi può fare cosa. Rispecchia le regole del database (migrazione 0015):
// qui servono solo a mostrare o nascondere menu e pulsanti.
import { Navigate } from 'react-router-dom'
import { useProfilo } from './AuthProvider'
import type { Enum } from '@/shared/types/database'

export type Ruolo = Enum<'ruolo'>

export type Permesso =
  | 'eventi.crea'          // creare, duplicare, annullare eventi
  | 'eventi.modifica'      // modificare orari, luogo, magazzino e note
  | 'eventi.tutti'         // vedere gli eventi di tutti (il project vede i suoi)
  | 'eventi.assegna'       // scegliere o cambiare l'operatore di un evento
  | 'operatori.vedi'       // pagina Operatori
  | 'operatori.gestisci'   // approvare, regioni, magazzino di riferimento
  | 'carta.ricarica'       // vedere la carta degli operatori e mandare ricariche
  | 'magazzini'            // magazzini e inventario
  | 'location'             // location salvate
  | 'clienti'              // clienti
  | 'soldi'                // costi, ricavi e margini degli eventi che vede (e la pagina Andamento)
  | 'ore.approva'          // pagina Costi e compensi: approvare chiusure e spese
  | 'fatture'              // eventi da fatturare e da incassare
  | 'tariffe'              // tariffa oraria degli operatori
  | 'carte'                // carte aziendali
  | 'utenti'               // cambiare i ruoli
  | 'impostazioni'         // valori dei calcoli automatici

const TUTTI: Permesso[] = [
  'eventi.crea', 'eventi.modifica', 'eventi.tutti', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci', 'carta.ricarica', 'magazzini',
  'location', 'clienti', 'soldi', 'ore.approva', 'fatture', 'tariffe', 'carte', 'utenti', 'impostazioni',
]

/** Ogni ruolo ha solo quello che gli serve; l'admin ha tutto */
const PERMESSI: Record<Ruolo, Permesso[]> = {
  admin: TUTTI,
  // Segue i propri eventi dall'inizio alla fine; vede solo i suoi (anche nei conti)
  project: ['eventi.crea', 'eventi.modifica', 'eventi.assegna', 'carta.ricarica', 'location', 'clienti', 'soldi', 'ore.approva'],
  // Tutta l'operatività: eventi di tutti, operatori, assegnazioni, carta, magazzini, location. Niente soldi.
  gestore_operatori: ['eventi.tutti', 'eventi.modifica', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci', 'carta.ricarica', 'magazzini', 'location'],
  // Conti dell'azienda: costi, compensi, fatture, tariffe, carte
  amministrazione: ['eventi.tutti', 'operatori.vedi', 'clienti', 'soldi', 'ore.approva', 'fatture', 'tariffe', 'carte'],
  operatore: [],
}

export const RUOLI: { id: Ruolo; etichetta: string; descrizione: string }[] = [
  { id: 'admin', etichetta: 'Admin', descrizione: 'Tutto, compresi ruoli e impostazioni' },
  { id: 'project', etichetta: 'Project', descrizione: 'I propri eventi, con costi e ricavi' },
  { id: 'gestore_operatori', etichetta: 'Gestore operatori', descrizione: 'Eventi, operatori, magazzini e carta, senza importi' },
  { id: 'amministrazione', etichetta: 'Amministrazione', descrizione: 'Costi, compensi, fatture, tariffe e carte aziendali' },
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

/** Mostra il contenuto solo a chi ha il permesso */
export function SePuo({ permesso, children }: { permesso: Permesso; children: React.ReactNode }) {
  return usePuo()(permesso) ? <>{children}</> : null
}

/** Pagina riservata: chi non ha il permesso torna alla Panoramica */
export function RichiedePermesso({ permesso, children }: { permesso: Permesso; children: React.ReactNode }) {
  return usePuo()(permesso) ? <>{children}</> : <Navigate to="/gestione/panoramica" replace />
}
