// Manda una notifica ai telefoni (web push) di un utente.
// - GET  /invia-push/chiave → chiave pubblica per iscriversi (la prima volta crea le chiavi)
// - POST /invia-push        → chiamata dal database a ogni notifica nuova (con il segreto nell'intestazione)
// Le chiavi stanno nella tabella "segreti", mai nel codice.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }

async function segreto(chiave: string) {
  const { data } = await db.from('segreti').select('valore').eq('chiave', chiave).maybeSingle()
  return data?.valore as string | undefined
}

async function chiavi() {
  let pubblica = await segreto('vapid_pubblica')
  let privata = await segreto('vapid_privata')
  if (!pubblica || !privata) {
    const nuove = webpush.generateVAPIDKeys()
    await db.from('segreti').upsert([
      { chiave: 'vapid_pubblica', valore: nuove.publicKey },
      { chiave: 'vapid_privata', valore: nuove.privateKey },
    ], { onConflict: 'chiave', ignoreDuplicates: true })
    pubblica = await segreto('vapid_pubblica')
    privata = await segreto('vapid_privata')
  }
  return { pubblica: pubblica!, privata: privata! }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = new URL(req.url)

  if (req.method === 'GET' && url.pathname.endsWith('/chiave')) {
    const { pubblica } = await chiavi()
    return Response.json({ chiave: pubblica }, { headers: cors })
  }

  if (req.method !== 'POST') return new Response('Metodo non valido', { status: 405, headers: cors })
  const atteso = await segreto('push_trigger')
  if (!atteso || req.headers.get('x-segreto') !== atteso) return new Response('Non autorizzato', { status: 401 })

  const n = await req.json() as { utente_id: string; titolo: string; testo: string | null; link: string | null; id: string }
  const { pubblica, privata } = await chiavi()
  webpush.setVapidDetails('https://socialbooth.it', pubblica, privata)

  const { data: dispositivi } = await db.from('dispositivi_push').select('id, endpoint, p256dh, auth').eq('utente_id', n.utente_id)
  const messaggio = JSON.stringify({ titolo: n.titolo, testo: n.testo ?? '', link: n.link ?? '/', id: n.id })
  let inviati = 0
  for (const d of dispositivi ?? []) {
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, messaggio, { TTL: 60 * 60 * 24 })
      inviati++
    } catch (e) {
      const stato = (e as { statusCode?: number }).statusCode
      // Iscrizione scaduta o revocata: la togliamo
      if (stato === 404 || stato === 410) await db.from('dispositivi_push').delete().eq('id', d.id)
      else console.error('push non inviata', stato, (e as Error).message)
    }
  }
  return Response.json({ inviati })
})
