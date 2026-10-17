import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarDays, Home, User } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Caricamento } from '@/shared/ui/Stati'
import { useTempoReale } from '@/modules/eventi/api'

// Guscio dell'app telefono: contenuto + barra in basso.
const voci = [
  { a: '/operatore', etichetta: 'Home', Icona: Home },
  { a: '/operatore/calendario', etichetta: 'Calendario', Icona: CalendarDays },
  { a: '/operatore/profilo', etichetta: 'Profilo', Icona: User },
]

export function OperatoreLayout() {
  const posizione = useLocation()
  useTempoReale()
  const inScheda = posizione.pathname.includes('/eventi/')

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col bg-sfondo">
      <main className="flex-1 flex flex-col">
        <Suspense fallback={<Caricamento />}>
          <Outlet />
        </Suspense>
      </main>
      {!inScheda && (
        <nav className="sticky bottom-0 bg-superficie border-t border-bordo grid grid-cols-3 pt-1.5 pb-sicura" aria-label="Navigazione principale">
          {voci.map(({ a, etichetta, Icona }) => (
            <NavLink key={a} to={a} end={a === '/operatore'}
              className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold', isActive ? 'text-inchiostro' : 'text-tenue')}>
              <Icona className="size-[22px]" aria-hidden />
              {etichetta}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
