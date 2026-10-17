import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { Campo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { useAuth } from './AuthProvider'
import { homePerRuolo } from './Protetto'
import { PaginaAccesso } from './PaginaAccesso'

export function AccediPage() {
  const { profilo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string>()
  const [invio, setInvio] = useState(false)

  if (profilo) return <Navigate to={homePerRuolo(profilo.ruolo)} replace />

  async function accedi(e: React.FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(undefined)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setErrore('Email o password non corrette')
    setInvio(false)
  }

  return (
    <PaginaAccesso>
      <h1 className="font-display text-[26px] font-semibold leading-tight">Accedi</h1>

      <form onSubmit={accedi} className="flex flex-col gap-4">
        <Campo etichetta="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo etichetta="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {errore && <p role="alert" className="text-sm font-semibold text-urgente-testo">{errore}</p>}
        <Pulsante type="submit" taglia="xl" pieno caricamento={invio} className="mt-2">Accedi</Pulsante>
      </form>

      <p className="text-sm text-tenue text-center">
        Sei un operatore e non hai un account? <Link to="/registrati" className="font-semibold text-accento-scuro">Registrati</Link>
      </p>
    </PaginaAccesso>
  )
}
