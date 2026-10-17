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
