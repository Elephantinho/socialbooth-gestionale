import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Intestazione delle pagine del pannello: titolo, descrizione breve, azioni a destra. */
export function Intestazione({ titolo, descrizione, indietro, azioni, extra }: {
  titolo: React.ReactNode
  /** non più mostrato: le pagine si riconoscono dal titolo e dal menu */
  sopra?: string
  descrizione?: React.ReactNode
  indietro?: { a: string; testo: string }
  azioni?: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap gap-4 justify-between items-end">
      <div className="min-w-0">
        {indietro && (
          <Link to={indietro.a} className="text-sm font-medium text-tenue inline-flex items-center gap-1 hover:text-inchiostro mb-1">
            <ArrowLeft className="size-4" aria-hidden /> {indietro.testo}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[30px] md:text-[34px] font-semibold leading-tight">{titolo}</h1>
          {extra}
        </div>
        {descrizione && <p className="text-tenue mt-1.5 max-w-[68ch]">{descrizione}</p>}
      </div>
      {azioni && <div className="flex gap-2 flex-wrap">{azioni}</div>}
    </header>
  )
}

/**
 * Un numero con la sua etichetta. Niente riquadri colorati: bordo sottile,
 * e una barra a sinistra quando il numero chiede attenzione.
 */
export function Numero({ valore, etichetta, tono = 'chiaro', icona }: {
  valore: React.ReactNode
  etichetta: string
  tono?: 'chiaro' | 'scuro' | 'accento' | 'urgente'
  icona?: React.ReactNode
}) {
  const barra = { chiaro: 'border-l-bordo', scuro: 'border-l-inchiostro', accento: 'border-l-accento', urgente: 'border-l-urgente' }[tono]
  const colore = { chiaro: '', scuro: '', accento: 'text-accento-scuro', urgente: 'text-urgente-testo' }[tono]
  return (
    <div className={`h-full rounded-[10px] bg-superficie border border-bordo border-l-4 ${barra} px-4 py-3.5 flex items-start gap-3`}>
      <div className="min-w-0 flex-1">
        <p className={`text-[26px] font-semibold leading-tight truncate tabular-nums ${colore}`}>{valore}</p>
        <p className="text-sm text-tenue mt-0.5">{etichetta}</p>
      </div>
      {icona && <div className="text-tenue mt-1.5">{icona}</div>}
    </div>
  )
}
