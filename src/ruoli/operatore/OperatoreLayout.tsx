import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, Clock, Home, MessagesSquare, User } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Caricamento } from '@/shared/ui/Stati'
import { useTempoReale } from '@/modules/eventi/api'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { PresenzaProvider } from '@/modules/squadra/presenza'
import { useNonLetti } from '@/modules/squadra/api'

// Guscio dell'app telefono: contenuto + barra in basso.
const voci = [
  { a: '/operatore', etichetta: 'Home', Icona: Home },
  { a: '/operatore/calendario', etichetta: 'Calendario', Icona: CalendarDays },
  { a: '/operatore/squadra', etichetta: 'Chat', Icona: MessagesSquare },
  { a: '/operatore/ore', etichetta: 'Ore', Icona: Clock },
  { a: '/operatore/profilo', etichetta: 'Profilo', Icona: User },
]

export function OperatoreLayout() {
  const profilo = useProfilo()
  const posizione = useLocation()
  useTempoReale()
  const inScheda = posizione.pathname.includes('/eventi/')

  return (
    <PresenzaProvider utenteId={profilo.id}>
      <div className="min-h-dvh max-w-md mx-auto flex flex-col bg-sfondo">
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<Caricamento />}>
            <Outlet />
          </Suspense>
        </main>
        {!inScheda && <BarraInBasso />}
      </div>
    </PresenzaProvider>
  )
}

function BarraInBasso() {
  const nonLetti = useNonLetti().data?.reduce((s, c) => s + Number(c.non_letti), 0) ?? 0
  return (
    <nav className="sticky bottom-0 bg-superficie border-t border-bordo grid grid-cols-5 pt-1.5 pb-sicura" aria-label="Navigazione principale">
      {voci.map(({ a, etichetta, Icona }) => (
        <NavLink key={a} to={a} end={a === '/operatore'}
          className={({ isActive }) => cn('relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold', isActive ? 'text-accento-scuro' : 'text-tenue')}>
          <Icona className="size-[22px]" aria-hidden />
          {etichetta}
          {a.endsWith('squadra') && nonLetti > 0 && (
            <span className="absolute top-0.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-urgente text-white text-[10px] font-semibold flex items-center justify-center">{nonLetti > 9 ? '9+' : nonLetti}</span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
