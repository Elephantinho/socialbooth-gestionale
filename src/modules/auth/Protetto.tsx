import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Caricamento } from '@/shared/ui/Stati'
import type { Enum } from '@/shared/types/database'

/** Mostra la pagina solo se l'utente è loggato e ha uno dei ruoli indicati. */
export function Protetto({ ruoli, children }: { ruoli: Enum<'ruolo'>[]; children: React.ReactNode }) {
  const { sessione, profilo, pronto } = useAuth()

  if (!pronto) return <Caricamento className="min-h-dvh items-center" />
  if (!sessione || !profilo) return <Navigate to="/accedi" replace />
  if (!ruoli.includes(profilo.ruolo)) return <Navigate to={homePerRuolo(profilo.ruolo)} replace />
  return <>{children}</>
}

export function homePerRuolo(ruolo: Enum<'ruolo'>) {
  return ruolo === 'operatore' ? '/operatore' : '/gestione'
}
