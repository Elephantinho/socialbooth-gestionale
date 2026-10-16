import { useProfilo } from '@/modules/auth/AuthProvider'
import { useRichieste } from '@/modules/richieste/api'
import { perMe } from '@/modules/richieste/components/ListaRichieste'
import { Link } from 'react-router-dom'
import { Inbox, CalendarCheck, FileText, Hourglass, Printer, UserCheck, UserX, Wallet } from 'lucide-react'
import { usePuo, type Permesso } from '@/modules/auth/permessi'
import { useReportOre } from '@/modules/eventi/api'
import { useOperatori } from '@/modules/anagrafiche/api'
import { useScorteVisibili } from '@/modules/carta/api'
import { euro, meseCorrente } from '@/shared/lib/formato'
import { Numero } from '@/shared/ui/Intestazione'
import type { EventoLista } from './tipi'

type Riquadro = {
  permesso: Permesso | Permesso[]   // basta averne uno
  a?: string
  valore: React.ReactNode
  etichetta: string
  urgente: boolean
  Icona: typeof UserX
}

/**
 * I numeri da guardare per primi: cosa aspetta una decisione.
 * Ogni ruolo vede solo i riquadri del suo lavoro.
 */
export function DaFare({ futuri, tutti }: { futuri: EventoLista[]; tutti: EventoLista[] }) {
  const puo = usePuo()
  const ore = useReportOre(meseCorrente(), { enabled: puo('ore.approva') })
  const operatori = useOperatori()
  const carta = useScorteVisibili()
  const io = useProfilo()
  const richiestePerMe = (useRichieste().data ?? []).filter((r) => (r.stato === 'aperta' || r.stato === 'in_corso') && perMe(r, io)).length

  const daAssegnare = futuri.filter((e) => e.stato === 'da_assegnare').length
  const inAttesa = futuri.filter((e) => e.stato === 'proposto').length
  const daApprovare = (ore.data ?? []).filter((r) => r.stato === 'inviato').length
  const nuoviOperatori = (operatori.data ?? []).filter((o) => !o.attivo).length
  const cartaRossa = (carta.data ?? []).filter((o) => o.livello !== 'ok').length
  const completati = tutti.filter((e) => e.stato === 'completato')
  const daFatturare = completati.filter((e) => !e.fattura_numero).length
  const daIncassare = completati.filter((e) => e.fattura_importo != null && !e.fattura_pagata).reduce((s, e) => s + Number(e.fattura_importo), 0)

  const riquadri: Riquadro[] = [
    { permesso: [], a: '/gestione/richieste', valore: richiestePerMe, etichetta: 'richieste per te', urgente: richiestePerMe > 0, Icona: Inbox },
    { permesso: 'eventi.assegna', a: '/gestione?filtro=assegnare', valore: daAssegnare, etichetta: 'eventi senza operatore', urgente: daAssegnare > 0, Icona: UserX },
    { permesso: 'eventi.assegna', a: '/gestione?filtro=attesa', valore: inAttesa, etichetta: 'proposte che l\'operatore non ha ancora accettato', urgente: false, Icona: Hourglass },
    { permesso: 'operatori.gestisci', a: '/gestione/operatori', valore: nuoviOperatori, etichetta: 'nuovi operatori da attivare', urgente: nuoviOperatori > 0, Icona: UserCheck },
    { permesso: 'carta.ricarica', valore: cartaRossa, etichetta: 'operatori con poca carta', urgente: cartaRossa > 0, Icona: Printer },
    { permesso: 'ore.approva', a: '/gestione/report', valore: daApprovare, etichetta: 'eventi finiti con ore da approvare', urgente: daApprovare > 0, Icona: CalendarCheck },
    { permesso: 'fatture', a: '/gestione/archivio?filtro=fatturare', valore: daFatturare, etichetta: 'eventi da fatturare', urgente: daFatturare > 0, Icona: FileText },
    { permesso: 'fatture', a: '/gestione/archivio?filtro=incassare', valore: euro(Math.round(daIncassare)), etichetta: 'da incassare', urgente: false, Icona: Wallet },
  ]
  const visibili = riquadri.filter((r) => {
    const p = Array.isArray(r.permesso) ? r.permesso : [r.permesso]
    return !p.length || p.some(puo)
  })

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
      {visibili.map((r) => {
        const numero = <Numero valore={r.valore} etichetta={r.etichetta} tono={r.urgente ? 'urgente' : 'chiaro'} icona={<r.Icona className="size-5" aria-hidden />} />
        return r.a ? <Link key={r.etichetta} to={r.a} className="hover:opacity-90">{numero}</Link> : <div key={r.etichetta}>{numero}</div>
      })}
    </div>
  )
}
