import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Clock, Home, User } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Caricamento } from '@/shared/ui/Stati'
import { useTempoReale } from '@/modules/eventi/api'

// Guscio dell'app telefono: contenuto + barra in basso.
const voci = [
  { a: '/operatore', etichetta: 'Home', Icona: Home, pronta: true },
  { a: '/operatore/calendario', etichetta: 'Calendario', Icona: CalendarDays, pronta: true },
  { a: '/operatore/ore', etichetta: 'Ore', Icona: Clock, pronta: true },
  { a: '/operatore/profilo', etichetta: 'Profilo', Icona: User, pronta: true },
]

export function OperatoreLayout() {
  const posizione = useLocation()
  useTempoReale()
  const inScheda = posizione.pathname.includes('/eventi/')

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col bg-sfondo">
      <AnimatePresence mode="wait">
        <motion.main
          key={posizione.pathname}
          initial={{ opacity: 0, x: inScheda ? 24 : 0, y: inScheda ? 0 : 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex-1 flex flex-col"
        >
          <Suspense fallback={<Caricamento />}>
            <Outlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>

      {!inScheda && (
        <nav className="sticky bottom-0 bg-superficie border-t border-bordo grid grid-cols-4 pt-2 pb-sicura" aria-label="Navigazione principale">
          {voci.map(({ a, etichetta, Icona, pronta }) =>
            pronta ? (
              <NavLink
                key={a}
                to={a}
                end
                className={({ isActive }) => cn(
                  'flex flex-col items-center gap-1 py-1.5 text-[11px] font-bold',
                  isActive ? 'text-accento' : 'text-tenue',
                )}
              >
                <Icona className="size-[22px]" aria-hidden />
                {etichetta}
              </NavLink>
            ) : (
              <span key={a} aria-disabled className="flex flex-col items-center gap-1 py-1.5 text-[11px] font-semibold text-tenue/50">
                <Icona className="size-[22px]" aria-hidden />
                {etichetta}
              </span>
            ),
          )}
        </nav>
      )}
    </div>
  )
}
