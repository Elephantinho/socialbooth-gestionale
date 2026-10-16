import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type Variante = 'primario' | 'secondario' | 'scuro' | 'chiaro' | 'fantasma'
type Taglia = 'md' | 'lg' | 'xl'

const varianti: Record<Variante, string> = {
  primario: 'bg-accento text-white hover:bg-accento-scuro',
  secondario: 'bg-superficie text-inchiostro border border-bordo-forte hover:border-inchiostro',
  scuro: 'bg-inchiostro text-white hover:bg-black',
  chiaro: 'bg-white text-inchiostro hover:bg-sfondo',
  fantasma: 'bg-transparent text-accento hover:bg-accento-tenue',
}

const taglie: Record<Taglia, string> = {
  md: 'h-10 px-3.5 text-sm',
  lg: 'h-12 px-4 text-[15px]',
  xl: 'h-14 px-5 text-base',
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  taglia?: Taglia
  caricamento?: boolean
  icona?: React.ReactNode
  pieno?: boolean
}

/** Pulsante dell'app: rettangolo con angoli appena smussati, senza effetti */
export function Pulsante({ variante = 'primario', taglia = 'md', caricamento, icona, pieno, className, children, disabled, ...resto }: Props) {
  return (
    <button
      disabled={disabled || caricamento}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors cursor-pointer select-none active:translate-y-px',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        varianti[variante], taglie[taglia], pieno && 'w-full', className,
      )}
      {...resto}
    >
      {caricamento ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icona}
      {children}
    </button>
  )
}
