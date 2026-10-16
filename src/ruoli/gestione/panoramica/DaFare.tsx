import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { usePuo, type Permesso } from '@/modules/auth/permessi'
import { useRichieste } from '@/modules/richieste/api'
import { perMe } from '@/modules/richieste/components/ListaRichieste'
import { useOreDaApprovare } from '@/modules/eventi/api'
import { useOperatori } from '@/modules/anagrafiche/api'
import { euro } from '@/shared/lib/formato'
import { Card } from '@/shared/ui/Card'
import type { EventoLista } from './tipi'

type Voce = {
  permesso?: Permesso
  quanti: number
  testo: string
  a: string
}

/**
 * Cosa aspetta una decisione, una riga per cosa.
 * Compaiono solo le voci che hanno qualcosa dentro e che spettano al ruolo:
 * se non c'è niente, una riga sola "Niente da fare".
 */
export function DaFare({ futuri, tutti }: { futuri: EventoLista[]; tutti: EventoLista[] }) {
  const puo = usePuo()
  const io = useProfilo()
  const ore = useOreDaApprovare({ enabled: puo('ore.approva') })
  const operatori = useOperatori()
  const richieste = useRichieste()

  const richiestePerMe = (richieste.data ?? []).filter((r) => (r.stato === 'aperta' || r.stato === 'in_corso') && perMe(r, io)).length
  const daAssegnare = futuri.filter((e) => e.stato === 'da_assegnare').length
  const meseDaApprovare = (ore.data ?? []).map((o) => o.evento!.allestimento_il.slice(0, 7)).sort()[0]
  const nuoviOperatori = (operatori.data ?? []).filter((o) => !o.attivo).length
  const coperte = new Set((operatori.data ?? []).filter((o) => o.attivo).flatMap((o) => o.zone.map((z) => z.regione as string)))
  const scoperte = operatori.data ? [...new Set(futuri.map((e) => e.regione))].filter((r) => !coperte.has(r)) : []
  const completati = tutti.filter((e) => e.stato === 'completato')
  const daFatturare = completati.filter((e) => !e.fattura_numero).length
  const nonPagati = completati.filter((e) => e.fattura_importo != null && !e.fattura_pagata)
  const daIncassare = nonPagati.reduce((s, e) => s + Number(e.fattura_importo), 0)

  const voci: Voce[] = [
    { quanti: richiestePerMe, testo: richiestePerMe === 1 ? 'richiesta per te' : 'richieste per te', a: '/gestione/richieste' },
    { permesso: 'eventi.assegna', quanti: daAssegnare, testo: daAssegnare === 1 ? 'evento senza operatore' : 'eventi senza operatore', a: '/gestione?filtro=assegnare' },
    { permesso: 'operatori.gestisci', quanti: nuoviOperatori, testo: nuoviOperatori === 1 ? 'nuovo operatore da attivare' : 'nuovi operatori da attivare', a: '/gestione/operatori' },
    { permesso: 'operatori.gestisci', quanti: scoperte.length, testo: `${scoperte.length === 1 ? 'regione' : 'regioni'} con eventi e nessun operatore (${scoperte.join(', ')})`, a: '/gestione/operatori' },
    { permesso: 'ore.approva', quanti: ore.data?.length ?? 0, testo: 'chiusure da approvare (ore e spese)', a: meseDaApprovare ? `/gestione/report?mese=${meseDaApprovare}` : '/gestione/report' },
    { permesso: 'fatture', quanti: daFatturare, testo: daFatturare === 1 ? 'evento da fatturare' : 'eventi da fatturare', a: '/gestione/archivio?filtro=fatturare' },
    { permesso: 'fatture', quanti: nonPagati.length, testo: `fatture da incassare (${euro(Math.round(daIncassare))})`, a: '/gestione/archivio?filtro=incassare' },
  ]
  const attive = voci.filter((v) => v.quanti > 0 && (!v.permesso || puo(v.permesso)))

  if (!attive.length) {
    return (
      <Card className="p-4 flex items-center gap-3">
        <CheckCircle2 className="size-5 text-ok shrink-0" aria-hidden />
        <p className="font-semibold">Niente da fare adesso</p>
      </Card>
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      <h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-tenue">Da fare</h2>
      <ul className="divide-y divide-bordo">
        {attive.map((v) => (
          <li key={v.a + v.testo}>
            <Link to={v.a} className="flex items-center gap-3 px-4 py-3 hover:bg-sfondo">
              <span className="min-w-8 h-8 px-2 rounded-lg bg-urgente-tenue text-urgente-testo font-semibold flex items-center justify-center tabular-nums">{v.quanti}</span>
              <span className="flex-1 min-w-0">{v.testo}</span>
              <ChevronRight className="size-4 text-tenue shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
