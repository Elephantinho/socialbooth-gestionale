import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import type { Riga } from '@/shared/types/database'

type Profilo = Riga<'profili'>

type StatoAuth = {
  sessione: Session | null
  profilo: Profilo | null
  pronto: boolean          // false finché non sappiamo se l'utente è loggato
  esci: () => Promise<void>
  ricaricaProfilo: () => Promise<void>
}

const AuthContext = createContext<StatoAuth | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [profilo, setProfilo] = useState<Profilo | null>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Carica il profilo (con il ruolo) quando cambia l'utente
  useEffect(() => {
    let annullato = false
    const id = sessione?.user.id
    if (!id) {
      setProfilo(null)
      setPronto(true)
      return
    }
    setPronto(false)
    supabase.from('profili').select('*').eq('id', id).single().then(({ data }) => {
      if (annullato) return
      setProfilo(data)
      setPronto(true)
    })
    return () => { annullato = true }
  }, [sessione?.user.id])

  const esci = async () => { await supabase.auth.signOut() }
  const ricaricaProfilo = async () => {
    if (!sessione?.user.id) return
    const { data } = await supabase.from('profili').select('*').eq('id', sessione.user.id).single()
    if (data) setProfilo(data)
  }

  return <AuthContext.Provider value={{ sessione, profilo, pronto, esci, ricaricaProfilo }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>')
  return ctx
}

/** Profilo dell'utente loggato: da usare solo nelle pagine protette. */
export function useProfilo() {
  const { profilo } = useAuth()
  if (!profilo) throw new Error('Nessun utente loggato')
  return profilo
}
