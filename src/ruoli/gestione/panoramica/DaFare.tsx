import { Link } from 'react-router-dom'
import { CalendarCheck, FileText, Hourglass, ListChecks, Printer, UserCheck, UserX, Wallet } from 'lucide-react'
import { usePuo, type Permesso } from '@/modules/auth/permessi'
import { useReportOre } from '@/modules/eventi/api'
import { useAttivita } from '@/modules/attivita/api'
import { useOperatori } from '@/modules/anagrafiche/api'
import { useScorteVisibili } from '@/modules/carta/api'
import { euro, meseCorrente, perCampoData } from '@/shared/lib/formato'
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
  const attivita = useAttivita()
  const operatori = useOperatori()
  const carta = useScorteVisibili()

  const daAssegnare = futuri.filter((e) => e.stato === 'da_assegnare').length
  const inAttesa = futuri.filter((e) => e.stato === 'proposto').length
  const daApprovare = (ore.data ?? []).filter((r) => r.stato === 'inviato').length
  const nuoviOperatori = (operatori.data ?? []).filter((o) => !o.attivo).length
  const cartaRossa = (carta.data ?? []).filter((o) => o.livello !== 'ok').length
  const completati = tutti.filter((e) => e.stato === 'completato')
  const daFatturare = completati.filter((e) => !e.fattura_numero).length
  const daIncassare = completati.filter((e) => e.fattura_importo != null && !e.fattura_pagata).reduce((s, e) => s + Number(e.fattura_importo), 0)
  const aperte = (attivita.data ?? []).filter((a) => a.stato !== 'fatto')
  const oggi = perCampoData(new Date().toISOString())
  const scadute = aperte.filter((a) => a.scadenza && a.scadenza < oggi).length

  const riquadri: Riquadro[] = [
    { permesso: 'eventi.assegna', a: '/gestione?filtro=assegnare', valore: daAssegnare, etichetta: 'eventi da assegnare', urgente: daAssegnare > 0, Icona: UserX },
    { permesso: 'eventi.assegna', a: '/gestione?filtro=attesa', valore: inAttesa, etichetta: 'in attesa di risposta', urgente: false, Icona: Hourglass },
    { permesso: 'operatori.gestisci', a: '/gestione/operatori', valore: nuoviOperatori, etichetta: 'operatori da approvare', urgente: nuoviOperatori > 0, Icona: UserCheck },
    { permesso: 'carta.ricarica', valore: cartaRossa, etichetta: 'operatori senza carta', urgente: cartaRossa > 0, Icona: Printer },
    { permesso: 'ore.approva', a: '/gestione/report', valore: daApprovare, etichetta: 'chiusure da approvare', urgente: daApprovare > 0, Icona: CalendarCheck },
    { permesso: 'fatture', a: '/gestione?filtro=fatturare', valore: daFatturare, etichetta: 'eventi da fatturare', urgente: daFatturare > 0, Icona: FileText },
    { permesso: 'fatture', a: '/gestione?filtro=incassare', valore: euro(Math.round(daIncassare)), etichetta: 'da incassare', urgente: false, Icona: Wallet },
    { permesso: [], a: '/gestione/attivita', valore: aperte.length, etichetta: scadute ? `attività aperte · ${scadute} scadute` : 'attività aperte', urgente: scadute > 0, Icona: ListChecks },
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
