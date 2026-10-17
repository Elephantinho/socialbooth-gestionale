// Chi può fare cosa. Rispecchia le regole del database (migrazione 0015):
// qui servono solo a mostrare o nascondere menu e pulsanti.
import { Navigate } from 'react-router-dom'
import { useProfilo } from './AuthProvider'
import type { Enum } from '@/shared/types/database'

export type Ruolo = Enum<'ruolo'>

export type Permesso =
  | 'eventi.crea'          // creare, duplicare, annullare eventi
  | 'eventi.modifica'      // modificare orari, luogo e note
  | 'eventi.tutti'         // vedere gli eventi di tutti (il project vede i suoi)
  | 'eventi.assegna'       // scegliere o cambiare l'operatore di un evento
  | 'operatori.vedi'       // pagina Operatori
  | 'operatori.gestisci'   // attivare operatori e cambiarne le regioni
  | 'utenti'               // cambiare i ruoli

const TUTTI: Permesso[] = ['eventi.crea', 'eventi.modifica', 'eventi.tutti', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci', 'utenti']

/** Ogni ruolo ha solo quello che gli serve; l'admin ha tutto */
const PERMESSI: Record<Ruolo, Permesso[]> = {
  admin: TUTTI,
  project: ['eventi.crea', 'eventi.modifica', 'eventi.assegna'],
  gestore_operatori: ['eventi.tutti', 'eventi.modifica', 'eventi.assegna', 'operatori.vedi', 'operatori.gestisci'],
  amministrazione: ['eventi.tutti', 'operatori.vedi'],
  operatore: [],
}

export const RUOLI: { id: Ruolo; etichetta: string; descrizione: string }[] = [
  { id: 'admin', etichetta: 'Admin', descrizione: 'Tutto, compresi utenti e ruoli' },
  { id: 'project', etichetta: 'Project', descrizione: 'Crea i propri eventi e li assegna' },
  { id: 'gestore_operatori', etichetta: 'Gestore operatori', descrizione: 'Tutti gli eventi e gli operatori' },
  { id: 'amministrazione', etichetta: 'Amministrazione', descrizione: 'Vede eventi e operatori' },
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

/** Pagina riservata: chi non ha il permesso torna alla Panoramica */
export function RichiedePermesso({ permesso, children }: { permesso: Permesso; children: React.ReactNode }) {
  return usePuo()(permesso) ? <>{children}</> : <Navigate to="/gestione" replace />
}
