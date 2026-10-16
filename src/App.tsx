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

// Mappa delle pagine.
// /operatore/*  → app telefono (operatore)
// /gestione/*   → pannello web (project e admin; l'admin vede tutto grazie al database)
export function App() {
  return (
    <Routes>
      <Route path="/accedi" element={<AccediPage />} />

      <Route path="/operatore" element={<Protetto ruoli={['operatore']}><OperatoreLayout /></Protetto>}>
        <Route index element={<HomeOperatore />} />
        <Route path="eventi/:id" element={<SchedaEvento />} />
      </Route>

      <Route path="/gestione" element={<Protetto ruoli={['project', 'admin']}><GestioneLayout /></Protetto>}>
        <Route index element={<ElencoEventi />} />
        <Route path="eventi/nuovo" element={<NuovoEvento />} />
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
