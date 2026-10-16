import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Building2, CalendarDays, Camera, LayoutGrid, LogOut, MapPin, Users } from 'lucide-react'
import { useAuth, useProfilo } from '@/modules/auth/AuthProvider'
import { cn } from '@/shared/lib/cn'

import { useTempoReale } from '@/modules/eventi/api'

// Pannello web per project e admin.
const voci = [
  { a: '/gestione/panoramica', etichetta: 'Panoramica', Icona: LayoutGrid, pronta: true },
  { a: '/gestione', etichetta: 'Eventi', Icona: CalendarDays, pronta: true },
  { a: '/gestione/operatori', etichetta: 'Operatori', Icona: Users, pronta: true },
  { a: '/gestione/location', etichetta: 'Location', Icona: MapPin, pronta: true },
  { a: '/gestione/magazzini', etichetta: 'Magazzini', Icona: Building2, pronta: true },
  { a: '/gestione/report', etichetta: 'Ore e compensi', Icona: BarChart3, pronta: true },
]

export function GestioneLayout() {
  const profilo = useProfilo()
  const { esci } = useAuth()
  useTempoReale()

  return (
    <div className="min-h-dvh flex flex-wrap">
      <aside className="flex-[1_1_220px] max-w-[260px] min-w-[220px] bg-inchiostro text-white p-5 flex flex-col gap-7 max-md:max-w-none max-md:flex-[1_1_100%]">
        <div className="flex items-center gap-2.5 px-2">
          <div className="size-9 rounded-[10px] bg-accento flex items-center justify-center">
            <Camera className="size-[18px]" aria-hidden />
          </div>
          <span className="font-display font-bold text-lg">Social Booth</span>
        </div>

        <nav className="flex flex-col gap-1 max-md:flex-row max-md:overflow-x-auto" aria-label="Sezioni">
          {voci.map(({ a, etichetta, Icona, pronta }) =>
            pronta ? (
              <NavLink key={a} to={a} end={a === '/gestione'}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition',
                  isActive ? 'bg-scuro-3 text-white' : 'text-[#C9CAD1] hover:bg-scuro-2',
                )}>
                <Icona className="size-[18px]" aria-hidden /> {etichetta}
              </NavLink>
            ) : (
              <span key={a} aria-disabled className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold whitespace-nowrap text-[#6E6F77]">
                <Icona className="size-[18px]" aria-hidden /> {etichetta}
              </span>
            ),
          )}
        </nav>

        <div className="mt-auto flex items-center gap-3 px-2 max-md:hidden">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{profilo.nome || 'Utente'}</p>
            <p className="text-xs text-su-scuro-tenue capitalize">{profilo.ruolo}</p>
          </div>
          <button onClick={esci} aria-label="Esci" className="size-10 rounded-full bg-scuro-2 flex items-center justify-center cursor-pointer hover:bg-scuro-3">
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </aside>

      <main className="flex-[999_1_560px] min-w-0 px-5 py-8 md:px-10">
        <div className="max-w-[1120px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
