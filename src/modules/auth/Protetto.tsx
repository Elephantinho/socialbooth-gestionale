import { Navigate } from 'react-router-dom'
import { Hourglass } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Caricamento } from '@/shared/ui/Stati'
import { Pulsante } from '@/shared/ui/Pulsante'
import type { Enum } from '@/shared/types/database'

/** Mostra la pagina solo se l'utente è loggato, attivo e ha uno dei ruoli indicati. */
export function Protetto({ ruoli, children }: { ruoli: Enum<'ruolo'>[]; children: React.ReactNode }) {
  const { sessione, profilo, pronto, esci } = useAuth()

  if (!pronto) return <Caricamento className="min-h-dvh items-center" />
  if (!sessione || !profilo) return <Navigate to="/accedi" replace />

  if (!profilo.attivo) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="max-w-sm flex flex-col gap-4 text-center items-center">
          <div className="size-14 rounded-[10px] bg-avviso text-avviso-titolo flex items-center justify-center"><Hourglass className="size-7" aria-hidden /></div>
          <h1 className="font-display text-2xl font-semibold">Account in attesa di approvazione</h1>
          <p className="text-tenue">Ciao {profilo.nome.split(' ')[0]}, un amministratore deve attivare il tuo account. Riprova più tardi.</p>
          <Pulsante variante="secondario" onClick={esci}>Esci</Pulsante>
        </div>
      </div>
    )
  }

  if (!ruoli.includes(profilo.ruolo)) return <Navigate to={homePerRuolo(profilo.ruolo)} replace />
  return <>{children}</>
}

export function homePerRuolo(ruolo: Enum<'ruolo'>) {
  return ruolo === 'operatore' ? '/operatore' : '/gestione/panoramica'
}
