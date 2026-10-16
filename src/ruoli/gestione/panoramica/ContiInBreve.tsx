import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useEconomiaPeriodo } from '@/modules/costi/api'
import { contiEvento, totaleConti } from '@/modules/costi/logic/perRegione'
import { euro } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'

/** Quattro numeri del mese e un link all'Andamento: i dettagli stanno lì */
export function ContiInBreve({ miei }: { miei?: boolean }) {
  const { data } = useEconomiaPeriodo(1)
  const c = totaleConti((data ?? []).map(contiEvento))
  const numeri = [
    { etichetta: 'eventi', valore: String(c.eventi) },
    { etichetta: 'ricavi', valore: euro(Math.round(c.ricavi)) },
    { etichetta: 'costi', valore: euro(Math.round(c.costiTotali)) },
    { etichetta: 'margine', valore: euro(Math.round(c.margine)), forte: true },
  ]
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <TitoloSezione>{miei ? 'I tuoi conti del mese' : 'Conti del mese'}</TitoloSezione>
        <Link to="/gestione/andamento" className="text-sm font-bold text-accento inline-flex items-center gap-1">Andamento <ArrowRight className="size-4" aria-hidden /></Link>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {numeri.map((n) => (
          <div key={n.etichetta}>
            <dt className="text-xs font-bold text-tenue uppercase tracking-wider">{n.etichetta}</dt>
            <dd className={`font-display text-2xl font-bold mt-1 ${n.forte ? (c.margine < 0 ? 'text-urgente-testo' : 'text-accento') : ''}`}>{n.valore}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
