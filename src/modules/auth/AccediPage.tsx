import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { Campo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { useAuth } from './AuthProvider'
import { homePerRuolo } from './Protetto'

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
    <div className="min-h-dvh flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm flex flex-col gap-8"
      >
        <div className="flex flex-col gap-4">
          <div className="size-14 rounded-2xl bg-inchiostro flex items-center justify-center">
            <Camera className="size-7 text-accento-chiaro" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-[34px] font-bold tracking-tight leading-none">Bentornato</h1>
            <p className="text-tenue mt-2 font-medium">Accedi per vedere i tuoi eventi.</p>
          </div>
        </div>

        <form onSubmit={accedi} className="flex flex-col gap-4">
          <Campo etichetta="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Campo etichetta="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {errore && <p role="alert" className="text-sm font-semibold text-urgente-testo">{errore}</p>}
          <Pulsante type="submit" taglia="xl" pieno caricamento={invio} className="mt-2">Accedi</Pulsante>
        </form>

        <p className="text-xs text-tenue text-center">Non hai un account? Chiedi all'amministratore di crearlo.</p>
      </motion.div>
    </div>
  )
}
