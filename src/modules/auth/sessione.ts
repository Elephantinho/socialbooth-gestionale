// La sessione dell'utente loggato, condivisa da <AuthProvider> a tutta l'app.
import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Riga } from '@/shared/types/database'

export type Profilo = Riga<'profili'>

type StatoAuth = {
  sessione: Session | null
  profilo: Profilo | null
  pronto: boolean          // false finché non sappiamo se l'utente è loggato
  esci: () => Promise<void>
  ricaricaProfilo: () => Promise<void>
}

export const AuthContext = createContext<StatoAuth | null>(null)

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
