import { BellRing, Check } from 'lucide-react'
import { useNotifichePush } from '../push'
import { Pulsante } from '@/shared/ui/Pulsante'
import { cn } from '@/shared/lib/cn'

const testi = {
  da_attivare: { titolo: 'Ricevi le notifiche sul telefono', testo: 'Nuovi incarichi, cambi di orario e carta in arrivo, anche ad app chiusa.' },
  da_installare: { titolo: 'Aggiungi l\'app alla schermata Home', testo: 'Su iPhone: tocca Condividi → Aggiungi a Home, poi apri l\'app da lì per attivare le notifiche.' },
  bloccate: { titolo: 'Notifiche bloccate', testo: 'Le hai bloccate per questo sito: riattivale dalle impostazioni del browser (lucchetto accanto all\'indirizzo).' },
} as const

/**
 * Invito ad attivare le notifiche.
 * "invito": riquadro in evidenza, sparisce quando sono attive. "impostazione": riga sempre visibile con attiva/disattiva.
 */
export function AttivaNotifiche({ modo = 'invito', className }: { modo?: 'invito' | 'impostazione'; className?: string }) {
  const { stato, errore, attiva, disattiva } = useNotifichePush()
  if (stato === 'caricamento' || stato === 'non_supportato') return null
  // Nella home si invita solo chi può ancora attivarle; il resto si vede in profilo e nella campanella
  if (modo === 'invito' && (stato === 'attive' || stato === 'bloccate')) return null

  if (stato === 'attive') {
    return (
      <div className={cn('rounded-[10px] bg-accento-tenue text-accento-scuro p-4 flex items-center gap-3', className)}>
        <Check className="size-5 shrink-0" aria-hidden />
        <p className="flex-1 text-sm font-semibold">Notifiche attive su questo dispositivo</p>
        <button onClick={disattiva} className="text-sm font-semibold underline cursor-pointer">Disattiva</button>
      </div>
    )
  }

  const t = testi[stato]
  return (
    <div className={cn('rounded-[10px] p-4 flex flex-col gap-3', stato === 'bloccate' ? 'bg-avviso text-avviso-testo' : 'bg-inchiostro text-white', className)}>
      <div className="flex gap-3">
        <BellRing className="size-5 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="font-semibold">{t.titolo}</p>
          <p className="text-sm opacity-85">{t.testo}</p>
        </div>
      </div>
      {stato === 'da_attivare' && <Pulsante variante="chiaro" onClick={attiva}>Attiva notifiche</Pulsante>}
      {errore && <p className="text-sm font-semibold">{errore}</p>}
    </div>
  )
}
