import { cn } from '@/shared/lib/cn'
import { iniziali } from '@/shared/lib/formato'

// Colori per gli avatar senza foto: scelti dal nome, sempre gli stessi per la stessa persona
const tinte = [
  'bg-[#DCEFEC] text-[#0A524B]',
  'bg-[#FBE6D9] text-[#8A3B0B]',
  'bg-[#E4E6FA] text-[#33388A]',
  'bg-[#FDF3D8] text-[#5A3E00]',
  'bg-[#F3E1EE] text-[#7A2A62]',
  'bg-[#E2EEF8] text-[#1F4E79]',
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
    <div aria-hidden className={cn('rounded-full font-bold flex items-center justify-center shrink-0 font-display', taglie[taglia], tinta, className)}>
      {iniziali(nome)}
    </div>
  )
}
