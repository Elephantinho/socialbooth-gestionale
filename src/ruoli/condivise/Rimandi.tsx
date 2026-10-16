import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthProvider'
import { Caricamento } from '@/shared/ui/Stati'

// Link usati nelle notifiche (/richieste/:id, /squadra?con=…): portano alla pagina giusta per il ruolo.
function base(ruolo?: string) { return ruolo === 'operatore' ? '/operatore' : '/gestione' }

export function RimandoRichiesta() {
  const { profilo, pronto } = useAuth()
  const { id } = useParams()
  if (!pronto) return <Caricamento className="min-h-dvh items-center" />
  return <Navigate to={profilo ? `${base(profilo.ruolo)}/richieste?id=${id}` : '/accedi'} replace />
}

export function RimandoSquadra() {
  const { profilo, pronto } = useAuth()
  const { search } = useLocation()
  if (!pronto) return <Caricamento className="min-h-dvh items-center" />
  return <Navigate to={profilo ? `${base(profilo.ruolo)}/squadra${search}` : '/accedi'} replace />
}
