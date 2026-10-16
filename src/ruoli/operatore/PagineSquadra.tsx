import { PaginaRichieste } from '@/modules/richieste/components/PaginaRichieste'
import { Squadra } from '@/modules/squadra/components/Squadra'

/** Richieste dall'app: stesso contenuto dell'ufficio, con i margini del telefono */
export function RichiesteOperatore() {
  return <div className="px-5 pt-sicura pb-6"><PaginaRichieste compatta /></div>
}

/** Chat a schermo intero sopra la barra in basso */
export function SquadraOperatore() {
  return <Squadra telefono />
}
