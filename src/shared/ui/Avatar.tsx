import { cn } from '@/shared/lib/cn'
import { iniziali } from '@/shared/lib/formato'

// Colori per gli avatar senza foto: scelti dal nome, sempre gli stessi per la stessa persona
const tinte = [
  'bg-[#FFF3CC] text-[#6B4F00]',
  'bg-[#EDE9E3] text-[#5A4A35]',
  'bg-[#E4EFE8] text-[#1F5A38]',
  'bg-[#F4E6EA] text-[#7A2E45]',
  'bg-[#E9EAEE] text-[#3B414B]',
  'bg-[#FFF0D2] text-[#6B4A00]',
]

const taglie = {
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-xl',
  xl: 'size-24 text-3xl',
}

export function Avatar({ nome, foto, taglia = 'md', className }: {
  nome: string
  foto?: string | null
  taglia?: keyof typeof taglie
  className?: string
}) {
  const tinta = tinte[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % tinte.length]
  return foto ? (
    <img src={foto} alt="" className={cn('rounded-full object-cover shrink-0 bg-sfondo', taglie[taglia], className)} />
  ) : (
    <div aria-hidden className={cn('rounded-full font-semibold flex items-center justify-center shrink-0 font-display', taglie[taglia], tinta, className)}>
      {iniziali(nome)}
    </div>
  )
}
