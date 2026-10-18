import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, CalendarDays, LayoutDashboard, CalendarRange, CreditCard, LogOut, Menu, ShieldCheck, Users, Wallet, X } from 'lucide-react'
import { useAuth, useProfilo } from '@/modules/auth/sessione'
import { etichettaRuolo, usePuo, type Permesso } from '@/modules/auth/permessi'
import { useTempoReale } from '@/modules/eventi/api'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Caricamento } from '@/shared/ui/Stati'
import { Avatar } from '@/shared/ui/Avatar'
import { Logo } from '@/shared/ui/Logo'
import { Campanella } from '@/modules/comunicazione/components/Campanella'

// Pannello web dell'ufficio (admin, project, gestore operatori, amministrazione).
type Voce = { a: string; etichetta: string; Icona: typeof Users; permesso?: Permesso }

// Il menu è uno solo: ogni ruolo vede solo le voci per cui ha il permesso (vedi permessi.tsx)
const gruppi: { titolo: string; voci: Voce[] }[] = [
  {
    titolo: 'Lavoro',
    voci: [
      { a: '/gestione/panoramica', etichetta: 'Panoramica', Icona: LayoutDashboard },
      { a: '/gestione', etichetta: 'Eventi', Icona: CalendarDays, permesso: 'eventi.elenco' },
      { a: '/gestione/calendario', etichetta: 'Calendario', Icona: CalendarRange, permesso: 'eventi.elenco' },
      { a: '/gestione/operatori', etichetta: 'Operatori', Icona: Users, permesso: 'operatori.vedi' },
      { a: '/gestione/clienti', etichetta: 'Clienti', Icona: Building2, permesso: 'clienti' },
      { a: '/gestione/conti', etichetta: 'Conti', Icona: Wallet, permesso: 'soldi' },
      { a: '/gestione/carte', etichetta: 'Carte', Icona: CreditCard, permesso: 'carte' },
    ],
  },
  {
    titolo: 'Sistema',
    voci: [
      { a: '/gestione/utenti', etichetta: 'Utenti e ruoli', Icona: ShieldCheck, permesso: 'utenti' },
    ],
  },
]

export function GestioneLayout() {
  const posizione = useLocation()
  const { ruolo } = useProfilo()
  useTempoReale()
  // Il menu del telefono resta aperto solo sulla pagina in cui lo si è aperto: cambiando pagina si chiude da solo
  const [apertoSu, setApertoSu] = useState<string | null>(null)
  const menuAperto = apertoSu === posizione.pathname
  const setMenuAperto = (aperto: boolean) => setApertoSu(aperto ? posizione.pathname : null)

  return (
    <>
      <div className="min-h-dvh lg:flex">
        {/* Barra superiore su telefono e tablet */}
        <div className="lg:hidden sticky top-0 z-30 bg-menu text-white px-4 h-14 flex items-center justify-between">
          <Logo chiaro taglia="sm" sottotitolo={etichettaRuolo(ruolo)} />
          <div className="flex items-center gap-2">
            <Campanella scura />
            <button onClick={() => setMenuAperto(true)} aria-label="Apri menu" className="size-10 rounded-lg bg-menu-2 flex items-center justify-center cursor-pointer">
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Menu laterale fisso su computer */}
        <aside className="hidden lg:flex w-[248px] shrink-0 sticky top-0 h-dvh">
          <MenuLaterale />
        </aside>

        {/* Menu a scomparsa su telefono */}
        <AnimatePresence>
          {menuAperto && (
            <motion.div className="lg:hidden fixed inset-0 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuAperto(false)}>
              <motion.aside className="h-full w-[280px] max-w-[85vw]" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ duration: 0.18, ease: 'easeOut' }} onClick={(e) => e.stopPropagation()}>
                <MenuLaterale onChiudi={() => setMenuAperto(false)} />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-8">
          <div className="mx-auto max-w-[1160px]">
            <Suspense fallback={<Caricamento />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  )
}

function MenuLaterale({ onChiudi }: { onChiudi?: () => void }) {
  const profilo = useProfilo()
  const { esci } = useAuth()
  const puo = usePuo()

  // Ogni ruolo vede solo le voci che gli servono; i gruppi vuoti spariscono
  const visibili = gruppi
    .map((g) => ({ ...g, voci: g.voci.filter((v) => !v.permesso || puo(v.permesso)) }))
    .filter((g) => g.voci.length)
  return (
    <div className="h-full w-full bg-menu text-white p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between px-2 pt-1">
        <Logo chiaro taglia="sm" sottotitolo={etichettaRuolo(profilo.ruolo)} />
        {!onChiudi && <Campanella nelMenu />}
        {onChiudi && (
          <button onClick={onChiudi} aria-label="Chiudi menu" className="size-9 rounded-lg bg-menu-2 flex items-center justify-center cursor-pointer">
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-5" aria-label="Sezioni">
        {visibili.map((g) => (
          <div key={g.titolo} className="flex flex-col">
            <p className="px-2 mb-1 text-[12px] font-medium text-menu-tenue">{g.titolo}</p>
            {g.voci.map(({ a, etichetta, Icona }) => (
              <NavLink key={a} to={a} end={a === '/gestione'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 h-9 px-2 rounded-lg text-[14px] border-l-[3px]',
                  isActive ? 'border-accento-chiaro bg-menu-3 text-white font-semibold rounded-l-none' : 'border-transparent text-menu-testo hover:bg-menu-2 hover:text-white',
                )}>
                <Icona className="size-[17px] shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="flex-1 truncate">{etichetta}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-menu-3 pt-4 px-1">
        <Avatar nome={nomeCompleto(profilo)} foto={profilo.foto} taglia="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{nomeCompleto(profilo)}</p>
          <p className="text-xs text-menu-tenue">{etichettaRuolo(profilo.ruolo)}</p>
        </div>
        <button onClick={esci} aria-label="Esci" className="size-9 rounded-lg hover:bg-menu-2 flex items-center justify-center cursor-pointer text-menu-testo">
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
