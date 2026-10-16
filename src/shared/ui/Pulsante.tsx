import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type Variante = 'primario' | 'secondario' | 'scuro' | 'chiaro' | 'fantasma'
type Taglia = 'md' | 'lg' | 'xl'

const varianti: Record<Variante, string> = {
  primario: 'bg-accento text-white hover:bg-accento-scuro',
  secondario: 'bg-superficie text-inchiostro border border-bordo-forte hover:bg-sfondo',
  scuro: 'bg-inchiostro text-white hover:bg-black',
  chiaro: 'bg-white text-inchiostro hover:bg-sfondo',
  fantasma: 'bg-transparent text-accento hover:bg-accento-tenue',
}

const taglie: Record<Taglia, string> = {
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-[15px] rounded-[14px]',
  xl: 'h-14 px-6 text-[17px] rounded-2xl',
}

type Props = HTMLMotionProps<'button'> & {
  variante?: Variante
  taglia?: Taglia
  caricamento?: boolean
  icona?: React.ReactNode
  pieno?: boolean
}

export function Pulsante({ variante = 'primario', taglia = 'md', caricamento, icona, pieno, className, children, disabled, ...resto }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || caricamento}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition-colors cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accento',
        varianti[variante], taglie[taglia], pieno && 'w-full', className,
      )}
      {...resto}
    >
      {caricamento ? <Loader2 className="size-5 animate-spin" aria-hidden /> : icona}
      {children as React.ReactNode}
    </motion.button>
  )
}
