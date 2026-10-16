// Chi può fare cosa. Rispecchia le regole del database (migrazione 0015):
// qui servono solo a mostrare o nascondere menu e pulsanti.
import { Navigate } from 'react-router-dom'
import { useProfilo } from './AuthProvider'
import type { Enum } from '@/shared/types/database'

export type Ruolo = Enum<'ruolo'>

export type Permesso =
  | 'eventi.crea'          // creare e modificare eventi
  | 'eventi.tutti'         // vedere gli eventi di tutti (il project vede i suoi)
  | 'operatori.gestisci'   // approvare, regioni, magazzino di riferimento, assegnare
  | 'soldi'                // costi, compensi, margini, previsioni
  | 'tariffe'              // cambiare la tariffa oraria degli operatori
  | 'carte'                // carte aziendali
  | 'magazzini'            // creare magazzini e importarli
  | 'clienti'              // creare e modificare clienti
  | 'utenti'               // cambiare i ruoli
  | 'impostazioni'         // valori dei calcoli automatici

const PERMESSI: Record<Ruolo, Permesso[]> = {
  admin: ['eventi.crea', 'eventi.tutti', 'operatori.gestisci', 'soldi', 'tariffe', 'carte', 'magazzini', 'clienti', 'utenti', 'impostazioni'],
  project: ['eventi.crea', 'soldi', 'clienti'],
  gestore_operatori: ['eventi.tutti', 'operatori.gestisci', 'magazzini'],
  amministrazione: ['eventi.tutti', 'soldi', 'tariffe', 'carte', 'clienti'],
  operatore: [],
}

export const RUOLI: { id: Ruolo; etichetta: string; descrizione: string }[] = [
  { id: 'admin', etichetta: 'Admin', descrizione: 'Il titolare: vede e può fare tutto' },
  { id: 'project', etichetta: 'Project', descrizione: 'Crea e segue i propri eventi' },
  { id: 'gestore_operatori', etichetta: 'Gestore operatori', descrizione: 'Approva gli operatori, assegna gli eventi, manda la carta. Non vede i soldi' },
  { id: 'amministrazione', etichetta: 'Amministrazione', descrizione: 'Costi, compensi, fatture e carte aziendali' },
  { id: 'operatore', etichetta: 'Operatore', descrizione: "Usa l'app sul telefono" },
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
