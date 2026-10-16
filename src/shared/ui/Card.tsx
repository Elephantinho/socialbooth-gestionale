import { cn } from '@/shared/lib/cn'

type Props = React.HTMLAttributes<HTMLDivElement> & { tono?: 'chiaro' | 'scuro' | 'avviso' | 'accento' }

const toni = {
  chiaro: 'bg-superficie border border-bordo',
  scuro: 'bg-inchiostro text-white',
  avviso: 'bg-avviso text-avviso-testo',
  accento: 'bg-accento-tenue text-accento-scuro',
}

export function Card({ tono = 'chiaro', className, ...resto }: Props) {
  return <div className={cn('rounded-[20px]', toni[tono], className)} {...resto} />
}

export function TitoloSezione({ className, ...resto }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[17px] font-bold', className)} {...resto} />
}
