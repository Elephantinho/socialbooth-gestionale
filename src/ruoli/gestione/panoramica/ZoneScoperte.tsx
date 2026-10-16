import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useOperatori } from '@/modules/anagrafiche/api'
import { Card } from '@/shared/ui/Card'
import type { EventoLista } from './tipi'

/** Regioni con eventi in arrivo ma senza operatori attivi */
export function ZoneScoperte({ futuri }: { futuri: EventoLista[] }) {
  const operatori = useOperatori()
  const coperte = new Set((operatori.data ?? []).filter((o) => o.attivo).flatMap((o) => o.zone.map((z) => z.regione as string)))
  const scoperte = [...new Set(futuri.map((e) => e.regione))].filter((r) => !coperte.has(r))
  if (!operatori.data || !scoperte.length) return null
  return (
    <Card tono="avviso" className="p-4 flex gap-3">
      <AlertTriangle className="size-5 text-avviso-titolo shrink-0" aria-hidden />
      <p className="text-sm">
        <strong className="text-avviso-titolo">Zone scoperte:</strong> ci sono eventi in {scoperte.join(', ')} ma nessun operatore attivo.{' '}
        <Link to="/gestione/operatori" className="font-semibold underline">Vai agli operatori</Link>
      </p>
    </Card>
  )
}
