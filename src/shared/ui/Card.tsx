import { cn } from '@/shared/lib/cn'

type Props = React.HTMLAttributes<HTMLDivElement> & { tono?: 'chiaro' | 'scuro' | 'avviso' | 'accento' }

// Foglio bianco con bordo sottile; gli avvisi hanno una barra a sinistra invece del riempimento pieno.
const toni = {
  chiaro: 'bg-superficie border border-bordo',
  scuro: 'bg-inchiostro text-white',
  avviso: 'bg-avviso text-avviso-testo border-l-4 border-avviso-icona',
  accento: 'bg-accento-tenue text-accento-scuro',
}

export function Card({ tono = 'chiaro', className, ...resto }: Props) {
  return <div className={cn('rounded-[10px]', toni[tono], className)} {...resto} />
}

export function TitoloSezione({ className, ...resto }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[17px] font-semibold', className)} {...resto} />
}
