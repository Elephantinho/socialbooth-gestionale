import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Intestazione delle pagine del pannello: titolo e azioni a destra. */
export function Intestazione({ titolo, indietro, azioni, extra }: {
  titolo: React.ReactNode
  indietro?: { a: string; testo: string }
  azioni?: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap gap-3 justify-between items-center min-h-11">
      <div className="min-w-0">
        {indietro && (
          <Link to={indietro.a} className="text-sm font-medium text-tenue inline-flex items-center gap-1 hover:text-inchiostro mb-1">
            <ArrowLeft className="size-4" aria-hidden /> {indietro.testo}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[26px] font-semibold leading-tight">{titolo}</h1>
          {extra}
        </div>
      </div>
      {azioni && <div className="flex gap-2 flex-wrap">{azioni}</div>}
    </header>
  )
}

/** Un numero con la sua etichetta; in rosso quando chiede attenzione. */
export function Numero({ valore, etichetta, tono = 'chiaro' }: {
  valore: React.ReactNode
  etichetta: string
  tono?: 'chiaro' | 'scuro' | 'accento' | 'urgente'
}) {
  const colore = { chiaro: '', scuro: '', accento: '', urgente: 'text-urgente-testo' }[tono]
  return (
    <div className="h-full rounded-lg bg-superficie border border-bordo px-4 py-3">
      <p className={`text-[22px] font-semibold leading-tight truncate tabular-nums ${colore}`}>{valore}</p>
      <p className="text-sm text-tenue mt-0.5">{etichetta}</p>
    </div>
  )
}
