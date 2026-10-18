import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { AuthContext, type Profilo } from './sessione'

/** Esce dall'account (la sessione salvata viene cancellata) */
const esci = async () => { await supabase.auth.signOut() }

/** Legge il profilo (con il ruolo); se non si riesce, null */
async function leggiProfilo(id: string): Promise<Profilo | null> {
  const { data } = await supabase.from('profili').select('*').eq('id', id).single()
  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessione, setSessione] = useState<Session | null>(null)
  // false finché non abbiamo letto la sessione salvata: prima non si sa se l'utente è loggato
  const [sessioneLetta, setSessioneLetta] = useState(false)
  // Il profilo caricato, insieme all'utente a cui appartiene
  const [caricato, setCaricato] = useState<{ id: string; profilo: Profilo | null } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessione(data.session)
      setSessioneLetta(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessione(s)
      setSessioneLetta(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const id = sessione?.user.id
  // Carica il profilo quando cambia l'utente (se il caricamento fallisce, si risulta non loggati invece di restare in attesa)
  useEffect(() => {
    if (!id) return
    let annullato = false
    leggiProfilo(id).then((profilo) => { if (!annullato) setCaricato({ id, profilo }) }, () => { if (!annullato) setCaricato({ id, profilo: null }) })
    return () => { annullato = true }
  }, [id])

  const profilo = id && caricato?.id === id ? caricato.profilo : null
  const pronto = sessioneLetta && (!id || caricato?.id === id)
  const ricaricaProfilo = async () => {
    if (!id) return
    const nuovo = await leggiProfilo(id)
    if (nuovo) setCaricato({ id, profilo: nuovo })
  }

  return <AuthContext.Provider value={{ sessione, profilo, pronto, esci, ricaricaProfilo }}>{children}</AuthContext.Provider>
}
