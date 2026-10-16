import { BRAND } from '@/shared/brand'
import { cn } from '@/shared/lib/cn'

/**
 * Logo Socialbooth. Usa il file ufficiale se impostato in brand.ts,
 * altrimenti la scritta "socialbooth" con il segno dello scatto.
 */
export function Logo({ chiaro, taglia = 'md', sottotitolo, className }: {
  chiaro?: boolean          // su fondo scuro
  taglia?: 'sm' | 'md' | 'lg'
  sottotitolo?: string
  className?: string
}) {
  const t = { sm: 'text-[17px]', md: 'text-xl', lg: 'text-[28px]' }[taglia]
  const segno = { sm: 'size-7', md: 'size-8', lg: 'size-11' }[taglia]
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {BRAND.logo ? (
        <img src={BRAND.logo} alt={BRAND.nome} className={cn(taglia === 'lg' ? 'h-11' : 'h-8', 'w-auto')} />
      ) : (
        <>
          <Segno className={segno} />
          <span className="flex flex-col leading-none">
            <span className={cn('font-display font-bold tracking-[-0.02em]', t, chiaro ? 'text-white' : 'text-inchiostro')} aria-label={BRAND.nome}>
              socialbooth
            </span>
            {sottotitolo && <span className={cn('text-[12px] font-medium mt-0.5', chiaro ? 'text-su-scuro-tenue' : 'text-tenue')}>{sottotitolo}</span>}
          </span>
        </>
      )}
    </div>
  )
}

/** Il segno: un otturatore stilizzato dentro un quadrato morbido */
export function Segno({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-marchio" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="white" strokeWidth="2.6" />
      <circle cx="16" cy="16" r="3" fill="white" />
      <circle cx="24.5" cy="7.5" r="2" fill="white" />
    </svg>
  )
}
