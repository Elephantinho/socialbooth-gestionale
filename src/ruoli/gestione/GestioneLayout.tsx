import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Building2, CalendarDays, Camera, CreditCard, LayoutGrid, LogOut, MapPin, Menu, Users, X } from 'lucide-react'
import { useAuth, useProfilo } from '@/modules/auth/AuthProvider'
import { useTempoReale } from '@/modules/eventi/api'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Campanella } from '@/modules/comunicazione/components/Campanella'

// Pannello web per project e admin.
const gruppi = [
  {
    titolo: 'Lavoro',
    voci: [
      { a: '/gestione/panoramica', etichetta: 'Panoramica', Icona: LayoutGrid },
      { a: '/gestione', etichetta: 'Eventi', Icona: CalendarDays },
      { a: '/gestione/operatori', etichetta: 'Operatori', Icona: Users },
    ],
  },
  {
    titolo: 'Risorse',
    voci: [
      { a: '/gestione/magazzini', etichetta: 'Magazzini', Icona: Building2 },
      { a: '/gestione/location', etichetta: 'Location', Icona: MapPin },
    ],
  },
  {
    titolo: 'Amministrazione',
    voci: [
      { a: '/gestione/report', etichetta: 'Costi e compensi', Icona: BarChart3 },
      { a: '/gestione/carte', etichetta: 'Carte aziendali', Icona: CreditCard },
    ],
  },
]

export function GestioneLayout() {
  const [menuAperto, setMenuAperto] = useState(false)
  const posizione = useLocation()
  useTempoReale()

  // Chiude il menu del telefono quando si cambia pagina
  useEffect(() => { setMenuAperto(false) }, [posizione.pathname])

  return (
    <div className="min-h-dvh lg:flex">
      {/* Barra superiore su telefono e tablet */}
      <div className="lg:hidden sticky top-0 z-30 bg-inchiostro text-white px-4 h-16 flex items-center justify-between">
        <Marchio />
        <div className="flex items-center gap-2">
        <Campanella scura />
        <button onClick={() => setMenuAperto(true)} aria-label="Apri menu" className="size-11 rounded-xl bg-scuro-2 flex items-center justify-center cursor-pointer">
          <Menu className="size-5" aria-hidden />
        </button>
        </div>
      </div>

      {/* Menu laterale fisso su computer */}
      <aside className="hidden lg:flex w-[260px] shrink-0 sticky top-0 h-dvh">
        <MenuLaterale />
      </aside>

      {/* Menu a scomparsa su telefono */}
      <AnimatePresence>
        {menuAperto && (
          <motion.div className="lg:hidden fixed inset-0 z-40 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMenuAperto(false)}>
            <motion.aside className="h-full w-[280px] max-w-[85vw]" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }} onClick={(e) => e.stopPropagation()}>
              <MenuLaterale onChiudi={() => setMenuAperto(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 px-4 py-7 md:px-10 md:py-10">
        <div className="max-w-[1160px] mx-auto">
          <div className="hidden lg:flex justify-end -mt-4 mb-3 relative z-20"><Campanella /></div>
          <motion.div key={posizione.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  )
}

function Marchio() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-9 rounded-[10px] bg-accento flex items-center justify-center">
        <Camera className="size-[18px]" aria-hidden />
      </div>
      <span className="font-display font-bold text-lg">Social Booth</span>
    </div>
  )
}

function MenuLaterale({ onChiudi }: { onChiudi?: () => void }) {
  const profilo = useProfilo()
  const { esci } = useAuth()
  return (
    <div className="h-full w-full bg-inchiostro text-white p-5 flex flex-col gap-7 overflow-y-auto">
      <div className="flex items-center justify-between px-1">
        <Marchio />
        {onChiudi && (
          <button onClick={onChiudi} aria-label="Chiudi menu" className="size-10 rounded-xl bg-scuro-2 flex items-center justify-center cursor-pointer">
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-6" aria-label="Sezioni">
        {gruppi.map((g) => (
          <div key={g.titolo} className="flex flex-col gap-1">
            <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-[#8B8C94]">{g.titolo}</p>
            {g.voci.map(({ a, etichetta, Icona }) => (
              <NavLink key={a} to={a} end={a === '/gestione'}
                className={({ isActive }) => cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition',
                  isActive ? 'bg-scuro-3 text-white' : 'text-[#C9CAD1] hover:bg-scuro-2 hover:text-white',
                )}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-accento-chiaro" aria-hidden />}
                    <Icona className={cn('size-[18px]', isActive && 'text-accento-chiaro')} aria-hidden /> {etichetta}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-scuro-2 p-3">
        <Avatar nome={nomeCompleto(profilo)} foto={profilo.foto} taglia="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{nomeCompleto(profilo)}</p>
          <p className="text-xs text-su-scuro-tenue capitalize">{profilo.ruolo}</p>
        </div>
        <button onClick={esci} aria-label="Esci" className="size-9 rounded-lg hover:bg-scuro-3 flex items-center justify-center cursor-pointer">
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
