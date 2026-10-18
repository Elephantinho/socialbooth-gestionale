// "Entra come": prepara l'accesso dell'admin principale come un altro utente.
// POST /entra-come { utente_id } con il token dell'admin → { token_hash }
// L'app usa token_hash con verifyOtp e da quel momento è l'altro utente, con i suoi permessi.
// Non manda nessuna email. Ogni accesso finisce nella tabella accessi_come.
// La chiave service role la fornisce Supabase alla funzione: non sta nel codice.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const errore = (status: number, messaggio: string) => Response.json({ errore: messaggio }, { status, headers: cors })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return errore(405, 'Metodo non valido')

  // Chi lo chiede: il token deve essere valido e appartenere a un admin principale attivo
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return errore(401, 'Accesso richiesto')
  const { data: chi, error: erroreToken } = await db.auth.getUser(token)
  if (erroreToken || !chi.user) return errore(401, 'Accesso scaduto: rientra')
  const adminId = chi.user.id
  const { data: principale } = await db.from('admin_principali')
    .select('utente_id, profilo:profili!inner(ruolo, attivo)').eq('utente_id', adminId).maybeSingle()
  const profilo = principale?.profilo as unknown as { ruolo: string; attivo: boolean } | undefined
  if (!profilo || profilo.ruolo !== 'admin' || !profilo.attivo) return errore(403, "Solo l'admin principale può entrare come un altro utente")

  // Chi diventare
  const corpo = await req.json().catch(() => null) as { utente_id?: string } | null
  const utenteId = corpo?.utente_id
  if (!utenteId || !/^[0-9a-f-]{36}$/i.test(utenteId)) return errore(400, 'Utente non valido')
  if (utenteId === adminId) return errore(400, 'Sei già tu')
  const { data: altro, error: erroreUtente } = await db.auth.admin.getUserById(utenteId)
  if (erroreUtente || !altro.user?.email) return errore(404, 'Utente non trovato')

  // Un link di accesso usa e getta (non viene spedito): l'app lo usa subito
  const { data: link, error: erroreLink } = await db.auth.admin.generateLink({ type: 'magiclink', email: altro.user.email })
  if (erroreLink || !link.properties?.hashed_token) return errore(500, 'Non sono riuscito a preparare l\'accesso')

  const { error: erroreRegistro } = await db.from('accessi_come').insert({ admin_id: adminId, utente_id: utenteId })
  if (erroreRegistro) return errore(500, 'Non sono riuscito a registrare l\'accesso')

  return Response.json({ token_hash: link.properties.hashed_token }, { headers: cors })
})
