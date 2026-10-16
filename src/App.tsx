import { Navigate, Route, Routes } from 'react-router-dom'
import { AccediPage } from '@/modules/auth/AccediPage'
import { Protetto, homePerRuolo } from '@/modules/auth/Protetto'
import { useAuth } from '@/modules/auth/AuthProvider'
import { Caricamento } from '@/shared/ui/Stati'
import { OperatoreLayout } from '@/ruoli/operatore/OperatoreLayout'
import { HomeOperatore } from '@/ruoli/operatore/HomeOperatore'
import { SchedaEvento } from '@/ruoli/operatore/SchedaEvento'
import { GestioneLayout } from '@/ruoli/gestione/GestioneLayout'
import { ElencoEventi } from '@/ruoli/gestione/ElencoEventi'
import { NuovoEvento } from '@/ruoli/gestione/NuovoEvento'
import { DettaglioEvento } from '@/ruoli/gestione/DettaglioEvento'
import { Panoramica } from '@/ruoli/gestione/Panoramica'
import { Operatori } from '@/ruoli/gestione/Operatori'
import { Magazzini } from '@/ruoli/gestione/Magazzini'
import { Location } from '@/ruoli/gestione/Location'
import { ReportOre } from '@/ruoli/gestione/ReportOre'
import { CalendarioOperatore } from '@/ruoli/operatore/CalendarioOperatore'
import { OreOperatore } from '@/ruoli/operatore/OreOperatore'
import { ProfiloOperatore } from '@/ruoli/operatore/ProfiloOperatore'
import { RegistratiPage } from '@/modules/auth/RegistratiPage'
import { InventarioMagazzino } from '@/ruoli/gestione/InventarioMagazzino'
import { CarteAziendali } from '@/ruoli/gestione/CarteAziendali'
import { DettaglioOperatore } from '@/ruoli/gestione/DettaglioOperatore'
import { Attivita } from '@/ruoli/gestione/Attivita'
import { Calendario } from '@/ruoli/gestione/Calendario'
import { Clienti } from '@/ruoli/gestione/Clienti'
import { Utenti } from '@/ruoli/gestione/Utenti'
import { Impostazioni } from '@/ruoli/gestione/Impostazioni'

// Mappa delle pagine.
// /operatore/*  → app telefono (operatore)
// /gestione/*   → pannello web (project e admin; l'admin vede tutto grazie al database)
export function App() {
  return (
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
        <Route path="report" element={<ReportOre />} />
      </Route>

      <Route path="*" element={<Inizio />} />
    </Routes>
  )
}

function Inizio() {
  const { profilo, pronto } = useAuth()
  if (!pronto) return <Caricamento className="min-h-dvh items-center" />
  return <Navigate to={profilo ? homePerRuolo(profilo.ruolo) : '/accedi'} replace />
}
