import { AttivaNotifiche } from '@/modules/comunicazione/components/AttivaNotifiche'
import { useMemo } from 'react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { usePuo } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { AvvisiCarta } from '@/modules/carta/components/Carta'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { Adesso } from './Adesso'
import { ContiInBreve } from './ContiInBreve'
import { DaFare } from './DaFare'
import { ProssimiGiorni } from './ProssimiGiorni'
import { ZoneScoperte } from './ZoneScoperte'

const sottotitolo = {
  admin: 'Cosa decidere, chi sta lavorando, dove e come vanno i conti.',
  project: 'I tuoi eventi: cosa assegnare, cosa approvare e come vanno.',
  gestore_operatori: 'La squadra: chi approvare, cosa assegnare, chi lavora oggi e chi ha bisogno di carta.',
  amministrazione: 'I conti: chiusure da approvare, fatture, incassi e margini.',
  operatore: '',
} as const

/**
 * Prima pagina dell'ufficio: solo quello che serve oggi, dall'urgente al riepilogo.
 * Cosa decidere → carta da mandare → chi lavora oggi → prossimi giorni → conti in breve.
 * Ogni sezione compare solo a chi serve; grafici e classifiche stanno in Andamento, la mappa in Eventi.
 */
export function Panoramica() {
  const profilo = useProfilo()
  const puo = usePuo()
  const eventi = useEventiGestione()

  const tutti = useMemo(() => (eventi.data ?? []).filter((e) => e.stato !== 'annullato'), [eventi.data])
  const futuri = useMemo(() => tutti.filter((e) => new Date(e.smontaggio_il) >= new Date()), [tutti])

  if (eventi.isPending) return <Caricamento />
  if (eventi.error) return <Errore errore={eventi.error} />

  const squadra = puo('eventi.assegna')
  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra={oggi.replace(/^./, (c) => c.toUpperCase())} titolo={`Ciao, ${profilo.nome || 'benvenuto'}`} descrizione={sottotitolo[profilo.ruolo]} />
      <DaFare futuri={futuri} tutti={tutti} />
      <AttivaNotifiche />
      {puo('carta.ricarica') && <AvvisiCarta />}
      {squadra && <Adesso eventi={tutti} />}
      {puo('operatori.gestisci') && <ZoneScoperte futuri={futuri} />}
      <ProssimiGiorni futuri={futuri} />
      {puo('soldi') && <ContiInBreve miei={!puo('eventi.tutti')} />}
    </div>
  )
}
