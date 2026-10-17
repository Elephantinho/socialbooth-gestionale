import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AccediPage } from '@/modules/auth/AccediPage'
import { RegistratiPage } from '@/modules/auth/RegistratiPage'
import { Protetto, homePerRuolo } from '@/modules/auth/Protetto'
import { RichiedePermesso as Solo, RUOLI_GESTIONE } from '@/modules/auth/permessi'
import { useAuth } from '@/modules/auth/AuthProvider'
import { Caricamento } from '@/shared/ui/Stati'
import { OperatoreLayout } from '@/ruoli/operatore/OperatoreLayout'
import { HomeOperatore } from '@/ruoli/operatore/HomeOperatore'
import { GestioneLayout } from '@/ruoli/gestione/GestioneLayout'

const SchedaEvento = lazy(() => import('@/ruoli/operatore/SchedaEvento').then((m) => ({ default: m.SchedaEvento })))
const CalendarioOperatore = lazy(() => import('@/ruoli/operatore/CalendarioOperatore').then((m) => ({ default: m.CalendarioOperatore })))
const ProfiloOperatore = lazy(() => import('@/ruoli/operatore/ProfiloOperatore').then((m) => ({ default: m.ProfiloOperatore })))
const ElencoEventi = lazy(() => import('@/ruoli/gestione/ElencoEventi').then((m) => ({ default: m.ElencoEventi })))
const NuovoEvento = lazy(() => import('@/ruoli/gestione/NuovoEvento').then((m) => ({ default: m.NuovoEvento })))
const DettaglioEvento = lazy(() => import('@/ruoli/gestione/DettaglioEvento').then((m) => ({ default: m.DettaglioEvento })))
const Calendario = lazy(() => import('@/ruoli/gestione/Calendario').then((m) => ({ default: m.Calendario })))
const Operatori = lazy(() => import('@/ruoli/gestione/Operatori').then((m) => ({ default: m.Operatori })))
const DettaglioOperatore = lazy(() => import('@/ruoli/gestione/DettaglioOperatore').then((m) => ({ default: m.DettaglioOperatore })))
const Utenti = lazy(() => import('@/ruoli/gestione/Utenti').then((m) => ({ default: m.Utenti })))
const Carte = lazy(() => import('@/ruoli/gestione/Carte').then((m) => ({ default: m.Carte })))
const Conti = lazy(() => import('@/ruoli/gestione/Conti').then((m) => ({ default: m.Conti })))

// /operatore/* → app sul telefono, /gestione/* → pannello web
export function App() {
  return (
    <Suspense fallback={<Caricamento className="min-h-dvh items-center" />}>
      <Routes>
        <Route path="/accedi" element={<AccediPage />} />
        <Route path="/registrati" element={<RegistratiPage />} />

        <Route path="/operatore" element={<Protetto ruoli={['operatore']}><OperatoreLayout /></Protetto>}>
          <Route index element={<HomeOperatore />} />
          <Route path="eventi/:id" element={<SchedaEvento />} />
          <Route path="calendario" element={<CalendarioOperatore />} />
          <Route path="profilo" element={<ProfiloOperatore />} />
          <Route path="*" element={<Navigate to="/operatore" replace />} />
        </Route>

        <Route path="/gestione" element={<Protetto ruoli={RUOLI_GESTIONE}><GestioneLayout /></Protetto>}>
          <Route index element={<ElencoEventi />} />
          <Route path="eventi/nuovo" element={<Solo permesso="eventi.crea"><NuovoEvento /></Solo>} />
          <Route path="eventi/:id" element={<DettaglioEvento />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="operatori" element={<Solo permesso="operatori.vedi"><Operatori /></Solo>} />
          <Route path="operatori/:id" element={<Solo permesso="operatori.vedi"><DettaglioOperatore /></Solo>} />
          <Route path="carte" element={<Solo permesso="carte"><Carte /></Solo>} />
          <Route path="conti" element={<Solo permesso="soldi"><Conti /></Solo>} />
          <Route path="utenti" element={<Solo permesso="utenti"><Utenti /></Solo>} />
          <Route path="*" element={<Navigate to="/gestione" replace />} />
        </Route>

        <Route path="*" element={<Inizio />} />
      </Routes>
    </Suspense>
  )
}

function Inizio() {
  const { profilo, pronto } = useAuth()
  if (!pronto) return <Caricamento className="min-h-dvh items-center" />
  return <Navigate to={profilo ? homePerRuolo(profilo.ruolo) : '/accedi'} replace />
}
