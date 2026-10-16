// Notifiche sul telefono (web push). Funziona su Android (Chrome) anche senza installare nulla,
// su iPhone dopo "Aggiungi a Home". Il server le manda da solo a ogni notifica nuova.
import { useCallback, useEffect, useState } from 'react'
import { supabase, ok } from '@/shared/lib/supabase'

export type StatoPush = 'caricamento' | 'non_supportato' | 'da_installare' | 'bloccate' | 'da_attivare' | 'attive'

const supportato = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const iPhoneNonInstallato = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches

export function registraServiceWorker() {
  if (supportato() && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').catch(() => {})
}

function chiaveInByte(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...b].map((c) => c.charCodeAt(0)))
}

async function iscrizioneAttuale() {
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

/** Stato delle notifiche su questo dispositivo, con attiva/disattiva */
export function useNotifichePush() {
  const [stato, setStato] = useState<StatoPush>('caricamento')
  const [errore, setErrore] = useState<string>()

  const aggiorna = useCallback(async () => {
    if (!supportato()) return setStato(iPhoneNonInstallato() ? 'da_installare' : 'non_supportato')
    if (Notification.permission === 'denied') return setStato('bloccate')
    setStato((await iscrizioneAttuale()) && Notification.permission === 'granted' ? 'attive' : 'da_attivare')
  }, [])

  useEffect(() => { aggiorna() }, [aggiorna])

  const attiva = useCallback(async () => {
    setErrore(undefined)
    try {
      if ((await Notification.requestPermission()) !== 'granted') return aggiorna()
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const chiave = ok(await supabase.rpc('chiave_push')) as string | null
      if (!chiave) throw new Error('Notifiche non ancora pronte sul server: riprova tra un minuto')
      const iscrizione = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveInByte(chiave) })
      const j = iscrizione.toJSON()
      ok(await supabase.from('dispositivi_push').upsert({
        endpoint: iscrizione.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth,
        descrizione: navigator.userAgent.slice(0, 120),
      }, { onConflict: 'endpoint' }))
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non sono riuscito ad attivare le notifiche')
    }
    aggiorna()
  }, [aggiorna])

  const disattiva = useCallback(async () => {
    const iscrizione = await iscrizioneAttuale()
    if (iscrizione) {
      await supabase.from('dispositivi_push').delete().eq('endpoint', iscrizione.endpoint)
      await iscrizione.unsubscribe()
    }
    aggiorna()
  }, [aggiorna])

  return { stato, errore, attiva, disattiva }
}
