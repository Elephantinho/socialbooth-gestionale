// "Entra come": l'admin principale usa l'app come un altro utente, con i suoi permessi veri.
// - entraCome(utente): mette da parte la sessione dell'admin, entra come l'altro e ricarica l'app
// - tornaAdmin(): esce solo da questo dispositivo e rimette la sessione dell'admin
// La sessione dell'admin resta solo in questo browser. Ogni accesso è registrato nel database.
import { useQuery } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase, ok } from '@/shared/lib/supabase'

const CHIAVE = 'socialbooth-admin-da-parte'

type DaParte = { access_token: string; refresh_token: string; adminId: string; nome: string }

function leggi(): DaParte | null {
  try {
    const testo = localStorage.getItem(CHIAVE)
    return testo ? (JSON.parse(testo) as DaParte) : null
  } catch {
    return null
  }
}

function scrivi(valore: DaParte | null) {
  try {
    if (valore) localStorage.setItem(CHIAVE, JSON.stringify(valore))
    else localStorage.removeItem(CHIAVE)
  } catch {
    // senza memoria del browser non si può tornare indietro: entraCome lo controlla prima
  }
}

/** Se in questo browser l'admin è entrato come qualcun altro: chi è l'admin e come si chiama chi sta guardando */
export function entratoCome(utenteAttuale: string | undefined): DaParte | null {
  const daParte = leggi()
  return daParte && utenteAttuale && daParte.adminId !== utenteAttuale ? daParte : null
}

/** Vero se chi è loggato è un admin principale (lo decide il database) */
export function useSonoPrincipale() {
  return useQuery({
    queryKey: ['sono-principale'],
    queryFn: async () => ok(await supabase.rpc('sono_principale')),
    staleTime: Infinity,
  })
}

async function messaggioErrore(errore: unknown): Promise<string> {
  if (errore instanceof FunctionsHttpError) {
    const corpo = await errore.context.json().catch(() => null) as { errore?: string } | null
    if (corpo?.errore) return corpo.errore
  }
  return errore instanceof Error ? errore.message : 'Non sono riuscito a entrare'
}

export async function entraCome(utente: { id: string; nome: string }) {
  const { data } = await supabase.auth.getSession()
  const sessione = data.session
  if (!sessione) throw new Error('Accesso scaduto: rientra')

  // Prima di tutto la sessione dell'admin deve essere al sicuro, o non si torna indietro
  scrivi({ access_token: sessione.access_token, refresh_token: sessione.refresh_token, adminId: sessione.user.id, nome: utente.nome })
  if (leggi()?.adminId !== sessione.user.id) throw new Error('Il browser non permette di salvare la sessione: prova senza navigazione privata')

  const risposta = await supabase.functions.invoke<{ token_hash: string }>('entra-come', { body: { utente_id: utente.id } })
  if (risposta.error || !risposta.data) {
    scrivi(null)
    throw new Error(await messaggioErrore(risposta.error))
  }
  const { error } = await supabase.auth.verifyOtp({ token_hash: risposta.data.token_hash, type: 'magiclink' })
  if (error) {
    scrivi(null)
    throw new Error(error.message)
  }
  // Ricarica da zero: niente dati dell'admin rimasti in memoria
  window.location.assign('/')
}

export async function tornaAdmin() {
  const daParte = leggi()
  // Esce solo da questo browser: l'altro utente resta collegato sui suoi dispositivi
  await supabase.auth.signOut({ scope: 'local' })
  scrivi(null)
  if (daParte) {
    const { error } = await supabase.auth.setSession({ access_token: daParte.access_token, refresh_token: daParte.refresh_token })
    window.location.assign(error ? '/accedi' : '/gestione/utenti')
  } else {
    window.location.assign('/accedi')
  }
}
