import { AttivaNotifiche } from '@/modules/comunicazione/components/AttivaNotifiche'
import { useMemo } from 'react'
import { usePuo } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { AvvisiCarta } from '@/modules/carta/components/Carta'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { Adesso } from './Adesso'
import { DaFare } from './DaFare'
import { ProssimiGiorni } from './ProssimiGiorni'

/**
 * Prima pagina dell'ufficio, volutamente corta:
 * 1. cosa aspetta te (solo le voci con qualcosa dentro)
 * 2. carta da mandare (solo se qualcuno è in rosso)
 * 3. chi lavora oggi (solo se c'è qualcuno)
 * 4. i prossimi giorni
 * Numeri, grafici e margini stanno in Andamento.
 */
export function Panoramica() {
  const puo = usePuo()
  const eventi = useEventiGestione()

  const tutti = useMemo(() => (eventi.data ?? []).filter((e) => e.stato !== 'annullato'), [eventi.data])
  const futuri = useMemo(() => tutti.filter((e) => new Date(e.smontaggio_il) >= new Date()), [tutti])

  if (eventi.isPending) return <Caricamento />
  if (eventi.error) return <Errore errore={eventi.error} />

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <Intestazione titolo="Panoramica" />
      <DaFare futuri={futuri} tutti={tutti} />
      {puo('carta.ricarica') && <AvvisiCarta />}
      <AttivaNotifiche />
      {puo('eventi.assegna') && <Adesso eventi={tutti} />}
      <ProssimiGiorni futuri={futuri} />
    </div>
  )
}
