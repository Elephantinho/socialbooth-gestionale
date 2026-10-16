import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AccediPage } from '@/modules/auth/AccediPage'
import { Protetto, homePerRuolo } from '@/modules/auth/Protetto'
import { useAuth } from '@/modules/auth/AuthProvider'
import { Caricamento } from '@/shared/ui/Stati'
import { OperatoreLayout } from '@/ruoli/operatore/OperatoreLayout'
import { HomeOperatore } from '@/ruoli/operatore/HomeOperatore'
const SchedaEvento = lazy(() => import('@/ruoli/operatore/SchedaEvento').then((m) => ({ default: m.SchedaEvento })))
import { GestioneLayout } from '@/ruoli/gestione/GestioneLayout'
const ElencoEventi = lazy(() => import('@/ruoli/gestione/ElencoEventi').then((m) => ({ default: m.ElencoEventi })))
const NuovoEvento = lazy(() => import('@/ruoli/gestione/NuovoEvento').then((m) => ({ default: m.NuovoEvento })))
const DettaglioEvento = lazy(() => import('@/ruoli/gestione/DettaglioEvento').then((m) => ({ default: m.DettaglioEvento })))
const Panoramica = lazy(() => import('@/ruoli/gestione/Panoramica').then((m) => ({ default: m.Panoramica })))
const Operatori = lazy(() => import('@/ruoli/gestione/Operatori').then((m) => ({ default: m.Operatori })))
const Magazzini = lazy(() => import('@/ruoli/gestione/Magazzini').then((m) => ({ default: m.Magazzini })))
const Location = lazy(() => import('@/ruoli/gestione/Location').then((m) => ({ default: m.Location })))
const ReportOre = lazy(() => import('@/ruoli/gestione/ReportOre').then((m) => ({ default: m.ReportOre })))
const CalendarioOperatore = lazy(() => import('@/ruoli/operatore/CalendarioOperatore').then((m) => ({ default: m.CalendarioOperatore })))
const OreOperatore = lazy(() => import('@/ruoli/operatore/OreOperatore').then((m) => ({ default: m.OreOperatore })))
const ProfiloOperatore = lazy(() => import('@/ruoli/operatore/ProfiloOperatore').then((m) => ({ default: m.ProfiloOperatore })))
import { RegistratiPage } from '@/modules/auth/RegistratiPage'
const InventarioMagazzino = lazy(() => import('@/ruoli/gestione/InventarioMagazzino').then((m) => ({ default: m.InventarioMagazzino })))
const CarteAziendali = lazy(() => import('@/ruoli/gestione/CarteAziendali').then((m) => ({ default: m.CarteAziendali })))
const DettaglioOperatore = lazy(() => import('@/ruoli/gestione/DettaglioOperatore').then((m) => ({ default: m.DettaglioOperatore })))
const Attivita = lazy(() => import('@/ruoli/gestione/Attivita').then((m) => ({ default: m.Attivita })))
const Calendario = lazy(() => import('@/ruoli/gestione/Calendario').then((m) => ({ default: m.Calendario })))
const Clienti = lazy(() => import('@/ruoli/gestione/Clienti').then((m) => ({ default: m.Clienti })))
const Utenti = lazy(() => import('@/ruoli/gestione/Utenti').then((m) => ({ default: m.Utenti })))
const Previsione = lazy(() => import('@/ruoli/gestione/Previsione').then((m) => ({ default: m.Previsione })))
const Regioni = lazy(() => import('@/ruoli/gestione/Regioni').then((m) => ({ default: m.Regioni })))
const Impostazioni = lazy(() => import('@/ruoli/gestione/Impostazioni').then((m) => ({ default: m.Impostazioni })))

// Mappa delle pagine.
// /operatore/*  → app telefono (operatore)
// /gestione/*   → pannello web (project e admin; l'admin vede tutto grazie al database)
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
        <Route path="ore" element={<OreOperatore />} />
        <Route path="profilo" element={<ProfiloOperatore />} />
      </Route>

      <Route path="/gestione" element={<Protetto ruoli={['project', 'admin']}><GestioneLayout /></Protetto>}>
        <Route index element={<ElencoEventi />} />
        <Route path="eventi/nuovo" element={<NuovoEvento />} />
        <Route path="eventi/:id" element={<DettaglioEvento />} />
        <Route path="panoramica" element={<Panoramica />} />
        <Route path="operatori" element={<Operatori />} />
        <Route path="operatori/:id" element={<DettaglioOperatore />} />
        <Route path="location" element={<Location />} />
        <Route path="magazzini" element={<Magazzini />} />
        <Route path="magazzini/:id" element={<InventarioMagazzino />} />
        <Route path="carte" element={<CarteAziendali />} />
        <Route path="attivita" element={<Attivita />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="clienti" element={<Clienti />} />
        <Route path="utenti" element={<Utenti />} />
        <Route path="impostazioni" element={<Impostazioni />} />
        <Route path="regioni" element={<Regioni />} />
        <Route path="previsione" element={<Previsione />} />
        <Route path="report" element={<ReportOre />} />
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
