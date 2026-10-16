import { PaginaAccesso } from './PaginaAccesso'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { Campo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { useAuth } from './AuthProvider'
import { homePerRuolo } from './Protetto'
import { SceltaRegioni } from './SceltaRegioni'
import type { Enum } from '@/shared/types/database'

/** Registrazione di un nuovo operatore. L'account va poi approvato da un admin. */
export function RegistratiPage() {
  const { profilo } = useAuth()
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [regioni, setRegioni] = useState<Enum<'regione'>[]>([])
  const [errore, setErrore] = useState<string>()
  const [invio, setInvio] = useState(false)
  const [inviata, setInviata] = useState(false)

  if (profilo) return <Navigate to={homePerRuolo(profilo.ruolo)} replace />

  async function registrati(e: React.FormEvent) {
    e.preventDefault()
    if (!regioni.length) return setErrore('Scegli almeno una regione in cui lavori')
    if (password.length < 8) return setErrore('La password deve avere almeno 8 caratteri')
    setInvio(true)
    setErrore(undefined)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: nome.trim(), cognome: cognome.trim(), telefono: telefono.trim(), regioni, autoregistrato: true },
      },
    })
    setInvio(false)
    if (error) return setErrore(error.message.includes('registered') ? 'Esiste già un account con questa email' : error.message)
    if (!data.session) setInviata(true) // serve la conferma via email
  }

  if (inviata) {
    return (
      <Centro>
        <div className="size-14 rounded-[10px] bg-accento text-white flex items-center justify-center"><MailCheck className="size-7" aria-hidden /></div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Controlla la tua email</h1>
        <p className="text-tenue">Ti abbiamo mandato un link a <strong className="text-inchiostro">{email}</strong> per confermare l'account. Poi un amministratore lo attiverà.</p>
        <Link to="/accedi" className="font-semibold text-accento">Torna all'accesso</Link>
      </Centro>
    )
  }

  return (
    <Centro>
      <Link to="/accedi" className="text-sm font-semibold text-tenue inline-flex items-center gap-1"><ArrowLeft className="size-4" aria-hidden /> Accedi</Link>
      <div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight leading-tight">Diventa operatore</h1>
        <p className="text-tenue mt-2 font-medium">Indica dove lavori: gli eventi della tua zona ti arriveranno in automatico.</p>
      </div>
      <form onSubmit={registrati} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo etichetta="Nome" required autoComplete="given-name" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Campo etichetta="Cognome" required autoComplete="family-name" value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </div>
        <Campo etichetta="Telefono" type="tel" required autoComplete="tel" placeholder="+39…" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <SceltaRegioni valore={regioni} onChange={setRegioni} />
        <Campo etichetta="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo etichetta="Password (almeno 8 caratteri)" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {errore && <p role="alert" className="text-sm font-semibold text-urgente-testo">{errore}</p>}
        <Pulsante type="submit" taglia="xl" pieno caricamento={invio} className="mt-2">Registrati</Pulsante>
      </form>
    </Centro>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return <PaginaAccesso>{children}</PaginaAccesso>
}
