import { useMemo } from 'react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { usePuo } from '@/modules/auth/permessi'
import { useEventiGestione } from '@/modules/eventi/api'
import { AvvisiCarta } from '@/modules/carta/components/Carta'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { Adesso } from './Adesso'
import { ContiDelMese } from './ContiDelMese'
import { DaFare } from './DaFare'
import { MappaEventi } from './MappaEventi'
import { ProssimiGiorni } from './ProssimiGiorni'
import { ZoneScoperte } from './ZoneScoperte'

/**
 * Prima pagina dell'ufficio, dall'urgente al riepilogo:
 * 1. cosa decidere  2. carta da mandare  3. chi lavora oggi  4. mappa  5. conti (solo chi vede i soldi)
 */
export function Panoramica() {
  const profilo = useProfilo()
  const soldi = usePuo()('soldi')
  const eventi = useEventiGestione()

  const tutti = useMemo(() => (eventi.data ?? []).filter((e) => e.stato !== 'annullato'), [eventi.data])
  const futuri = useMemo(() => tutti.filter((e) => new Date(e.smontaggio_il) >= new Date()), [tutti])

  if (eventi.isPending) return <Caricamento />
  if (eventi.error) return <Errore errore={eventi.error} />

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="flex flex-col gap-6">
      <Intestazione
        sopra={oggi.replace(/^./, (c) => c.toUpperCase())}
        titolo={`Ciao, ${profilo.nome || 'benvenuto'}`}
        descrizione={soldi ? 'Cosa assegnare, cosa approvare, dove state lavorando e come vanno i conti.' : 'Cosa assegnare, chi sta lavorando e dove.'}
      />
      <DaFare futuri={futuri} />
      <AvvisiCarta />
      <Adesso eventi={tutti} />
      <ZoneScoperte futuri={futuri} />
      <MappaEventi futuri={futuri} tutti={tutti} />
      {soldi
        ? <ContiDelMese affianco={<ProssimiGiorni futuri={futuri} className="flex-[1_1_300px]" />} />
        : <ProssimiGiorni futuri={futuri} />}
    </div>
  )
}
