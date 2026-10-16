import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Inbox, MessagesSquare, Archive, BarChart3, Briefcase, Building2, CalendarDays, CalendarRange, CreditCard, LayoutGrid, LogOut, MapPin, Menu, Settings, ShieldCheck, TrendingUp, Users, X } from 'lucide-react'
import { useAuth, useProfilo } from '@/modules/auth/AuthProvider'
import { etichettaRuolo, usePuo, type Permesso } from '@/modules/auth/permessi'
import { useTempoReale } from '@/modules/eventi/api'
import { PresenzaProvider } from '@/modules/squadra/presenza'
import { useNonLetti } from '@/modules/squadra/api'
import { useRichieste } from '@/modules/richieste/api'
import { perMe } from '@/modules/richieste/components/ListaRichieste'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Caricamento } from '@/shared/ui/Stati'
import { Avatar } from '@/shared/ui/Avatar'
import { Logo } from '@/shared/ui/Logo'
import { Campanella } from '@/modules/comunicazione/components/Campanella'

// Pannello web dell'ufficio (admin, project, gestore operatori, amministrazione).
type Voce = { a: string; etichetta: string; Icona: typeof Settings; permesso?: Permesso }

// Il menu è uno solo: ogni ruolo vede solo le voci per cui ha il permesso (vedi permessi.tsx)
const gruppi: { titolo: string; voci: Voce[] }[] = [
  {
    titolo: 'Lavoro',
    voci: [
      { a: '/gestione/panoramica', etichetta: 'Panoramica', Icona: LayoutGrid },
      { a: '/gestione', etichetta: 'Eventi', Icona: CalendarDays },
      { a: '/gestione/calendario', etichetta: 'Calendario', Icona: CalendarRange },
      { a: '/gestione/richieste', etichetta: 'Richieste', Icona: Inbox },
      { a: '/gestione/squadra', etichetta: 'Chat squadra', Icona: MessagesSquare },
    ],
  },
  {
    titolo: 'Squadra',
    voci: [
      { a: '/gestione/operatori', etichetta: 'Operatori', Icona: Users, permesso: 'operatori.vedi' },
      { a: '/gestione/magazzini', etichetta: 'Magazzini', Icona: Building2, permesso: 'magazzini' },
    ],
  },
  {
    titolo: 'Conti',
    voci: [
      { a: '/gestione/report', etichetta: 'Costi e compensi', Icona: BarChart3, permesso: 'ore.approva' },
      { a: '/gestione/andamento', etichetta: 'Andamento', Icona: TrendingUp, permesso: 'soldi' },
      { a: '/gestione/carte', etichetta: 'Carte aziendali', Icona: CreditCard, permesso: 'carte' },
    ],
  },
  {
    titolo: 'Archivio',
    voci: [
      { a: '/gestione/archivio', etichetta: 'Eventi passati', Icona: Archive },
      { a: '/gestione/clienti', etichetta: 'Clienti', Icona: Briefcase, permesso: 'clienti' },
      { a: '/gestione/location', etichetta: 'Location', Icona: MapPin, permesso: 'location' },
    ],
  },
  {
    titolo: 'Sistema',
    voci: [
      { a: '/gestione/utenti', etichetta: 'Utenti e ruoli', Icona: ShieldCheck, permesso: 'utenti' },
      { a: '/gestione/impostazioni', etichetta: 'Impostazioni', Icona: Settings, permesso: 'impostazioni' },
    ],
  },
]

export function GestioneLayout() {
  const profilo = useProfilo()
  const [menuAperto, setMenuAperto] = useState(false)
  const posizione = useLocation()
  useTempoReale()

  // Chiude il menu del telefono quando si cambia pagina
  useEffect(() => { setMenuAperto(false) }, [posizione.pathname])
  const chat = posizione.pathname.startsWith('/gestione/squadra')

  return (
    <PresenzaProvider utenteId={profilo.id}>
      <div className="min-h-dvh lg:flex">
        {/* Barra superiore su telefono e tablet */}
        <div className="lg:hidden sticky top-0 z-30 bg-superficie border-b border-bordo px-4 h-14 flex items-center justify-between">
          <Logo taglia="sm" />
          <div className="flex items-center gap-2">
            <Campanella />
            <button onClick={() => setMenuAperto(true)} aria-label="Apri menu" className="size-10 rounded-lg border border-bordo-forte flex items-center justify-center cursor-pointer">
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Menu laterale fisso su computer */}
        <aside className="hidden lg:flex w-[248px] shrink-0 sticky top-0 h-dvh border-r border-bordo">
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

        <main className={cn('flex-1 min-w-0', chat ? 'px-4 py-4 md:px-6' : 'px-4 py-6 md:px-10 md:py-8')}>
          <div className={cn('mx-auto', chat ? 'max-w-[1300px]' : 'max-w-[1160px]')}>
            <div className="hidden lg:flex justify-end mb-2 relative z-20"><Campanella /></div>
            <Suspense fallback={<Caricamento />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </PresenzaProvider>
  )
}

function MenuLaterale({ onChiudi }: { onChiudi?: () => void }) {
  const profilo = useProfilo()
  const { esci } = useAuth()
  const puo = usePuo()
  const nonLetti = useNonLetti().data?.reduce((s, c) => s + Number(c.non_letti), 0) ?? 0
  const daFare = (useRichieste().data ?? []).filter((r) => (r.stato === 'aperta' || r.stato === 'in_corso') && perMe(r, profilo)).length
  const contatori: Record<string, number> = { '/gestione/squadra': nonLetti, '/gestione/richieste': daFare }

  // Ogni ruolo vede solo le voci che gli servono; i gruppi vuoti spariscono
  const visibili = gruppi
    .map((g) => ({ ...g, voci: g.voci.filter((v) => !v.permesso || puo(v.permesso)) }))
    .filter((g) => g.voci.length)
  return (
    <div className="h-full w-full bg-superficie p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between px-2 pt-1">
        <Logo taglia="sm" sottotitolo="Gestionale" />
        {onChiudi && (
          <button onClick={onChiudi} aria-label="Chiudi menu" className="size-9 rounded-lg border border-bordo-forte flex items-center justify-center cursor-pointer">
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-5" aria-label="Sezioni">
        {visibili.map((g) => (
          <div key={g.titolo} className="flex flex-col">
            <p className="px-2 mb-1 text-[12px] font-medium text-tenue">{g.titolo}</p>
            {g.voci.map(({ a, etichetta, Icona }) => (
              <NavLink key={a} to={a} end={a === '/gestione'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 h-9 px-2 rounded-lg text-[14px] border-l-[3px]',
                  isActive ? 'border-accento bg-accento-tenue text-accento-scuro font-semibold rounded-l-none' : 'border-transparent text-inchiostro hover:bg-sfondo',
                )}>
                <Icona className="size-[17px] shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="flex-1 truncate">{etichetta}</span>
                {contatori[a] > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-urgente text-white text-[11px] font-semibold flex items-center justify-center">{contatori[a]}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-bordo pt-4 px-1">
        <Avatar nome={nomeCompleto(profilo)} foto={profilo.foto} taglia="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{nomeCompleto(profilo)}</p>
          <p className="text-xs text-tenue">{etichettaRuolo(profilo.ruolo)}</p>
        </div>
        <button onClick={esci} aria-label="Esci" className="size-9 rounded-lg hover:bg-sfondo flex items-center justify-center cursor-pointer text-tenue">
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
