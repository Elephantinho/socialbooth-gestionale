import { Link } from 'react-router-dom'
import { CalendarCheck, Hourglass, ListChecks, UserX } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { useReportOre } from '@/modules/eventi/api'
import { useAttivita } from '@/modules/attivita/api'
import { meseCorrente, perCampoData } from '@/shared/lib/formato'
import { Numero } from '@/shared/ui/Intestazione'
import type { EventoLista } from './tipi'

/** I numeri da guardare per primi: cosa aspetta una decisione */
export function DaFare({ futuri }: { futuri: EventoLista[] }) {
  const soldi = usePuo()('soldi')
  const ore = useReportOre(meseCorrente())
  const attivita = useAttivita()

  const daAssegnare = futuri.filter((e) => e.stato === 'da_assegnare').length
  const inAttesa = futuri.filter((e) => e.stato === 'proposto').length
  const daApprovare = (ore.data ?? []).filter((r) => r.stato === 'inviato').length
  const aperte = (attivita.data ?? []).filter((a) => a.stato !== 'fatto')
  const oggi = perCampoData(new Date().toISOString())
  const scadute = aperte.filter((a) => a.scadenza && a.scadenza < oggi).length

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
      <Link to="/gestione" className="hover:opacity-90">
        <Numero valore={daAssegnare} etichetta="eventi da assegnare" tono={daAssegnare ? 'urgente' : 'chiaro'} icona={<UserX className="size-5" aria-hidden />} />
      </Link>
      <Numero valore={inAttesa} etichetta="in attesa di risposta" icona={<Hourglass className="size-5" aria-hidden />} />
      {soldi && (
        <Link to="/gestione/report" className="hover:opacity-90">
          <Numero valore={daApprovare} etichetta="chiusure da approvare" tono={daApprovare ? 'urgente' : 'chiaro'} icona={<CalendarCheck className="size-5" aria-hidden />} />
        </Link>
      )}
      <Link to="/gestione/attivita" className="hover:opacity-90">
        <Numero valore={aperte.length} etichetta={scadute ? `attività aperte · ${scadute} scadute` : 'attività aperte'}
          tono={scadute ? 'urgente' : 'chiaro'} icona={<ListChecks className="size-5" aria-hidden />} />
      </Link>
    </div>
  )
}
