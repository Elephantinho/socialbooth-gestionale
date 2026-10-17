import { cn } from '@/shared/lib/cn'

type Props = React.HTMLAttributes<HTMLDivElement> & { tono?: 'chiaro' | 'scuro' | 'avviso' | 'urgente' | 'accento' }

// Foglio bianco con bordo leggero; "scuro" ora è il riquadro in evidenza (tinta azzurra chiara).
// Gli avvisi hanno una barra a sinistra invece del riempimento pieno.
const toni = {
  chiaro: 'bg-superficie border border-bordo shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
  scuro: 'bg-evidenza border border-evidenza-bordo text-inchiostro',
  avviso: 'bg-avviso text-avviso-testo border-l-4 border-avviso-icona',
  urgente: 'bg-urgente-tenue text-inchiostro border-l-4 border-urgente',
  accento: 'bg-accento-tenue text-accento-scuro',
}

export function Card({ tono = 'chiaro', className, ...resto }: Props) {
  return <div className={cn('rounded-xl', toni[tono], className)} {...resto} />
}

export function TitoloSezione({ className, ...resto }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[17px] font-semibold', className)} {...resto} />
}
