import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Intestazione uguale per tutte le pagine del pannello: titolo, descrizione e azioni a destra. */
export function Intestazione({ titolo, sopra, descrizione, indietro, azioni, extra }: {
  titolo: React.ReactNode
  sopra?: string
  descrizione?: React.ReactNode
  indietro?: { a: string; testo: string }
  azioni?: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap gap-4 justify-between items-end">
      <div className="min-w-0">
        {indietro ? (
          <Link to={indietro.a} className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro transition">
            <ArrowLeft className="size-4" aria-hidden /> {indietro.testo}
          </Link>
        ) : sopra ? (
          <p className="text-sm font-semibold text-tenue">{sopra}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="font-display text-[34px] md:text-4xl font-bold tracking-tight leading-tight">{titolo}</h1>
          {extra}
        </div>
        {descrizione && <p className="text-tenue mt-2 max-w-2xl">{descrizione}</p>}
      </div>
      {azioni && <div className="flex gap-2 flex-wrap">{azioni}</div>}
    </header>
  )
}

/** Riquadro con un numero grande e un'etichetta */
export function Numero({ valore, etichetta, tono = 'chiaro', icona }: {
  valore: React.ReactNode
  etichetta: string
  tono?: 'chiaro' | 'scuro' | 'accento' | 'urgente'
  icona?: React.ReactNode
}) {
  const stili = {
    chiaro: 'bg-superficie border border-bordo',
    scuro: 'bg-inchiostro text-white',
    accento: 'bg-accento-tenue text-accento-scuro',
    urgente: 'bg-urgente-tenue text-urgente-testo',
  }
  return (
    <div className={`rounded-[20px] p-4 md:p-5 flex flex-col gap-1 h-full ${stili[tono]}`}>
      {icona && <div className="opacity-70 mb-1">{icona}</div>}
      <p className="font-display text-[26px] md:text-3xl font-bold leading-tight truncate">{valore}</p>
      <p className={`text-sm font-semibold ${tono === 'chiaro' ? 'text-tenue' : tono === 'scuro' ? 'text-su-scuro-tenue' : 'opacity-80'}`}>{etichetta}</p>
    </div>
  )
}
