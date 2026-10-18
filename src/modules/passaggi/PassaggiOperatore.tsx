import type { EventoDettaglio } from '@/modules/eventi/types'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'
import { Andamento } from './Andamento'
import { useAnnullaPassaggio, usePassaggi, useSegnaPassaggio } from './api'
import { prossimoPassaggio } from './passaggi'
import { useAdesso } from '@/shared/lib/tempo'

const DIECI_MINUTI = 10 * 60_000

/** Per l'operatore: i passaggi dell'evento e il pulsante per segnare il prossimo. Si apre dal giorno prima. */
export function PassaggiOperatore({ e }: { e: EventoDettaglio }) {
  const passaggi = usePassaggi(e.id)
  const segna = useSegnaPassaggio()
  const annulla = useAnnullaPassaggio()
  const adesso = useAdesso()

  if (!['confermato', 'in_corso', 'completato'].includes(e.stato)) return null
  const aperto = adesso >= new Date(e.allestimento_il).getTime() - 24 * 3_600_000
  if (!aperto) return null

  const prossimo = e.stato === 'completato' ? null : prossimoPassaggio(e.ultimo_passaggio)
  const ultimo = passaggi.data?.at(-1)
  const annullabile = e.stato !== 'completato' || ultimo?.passaggio === 'check_out'
  const puoAnnullare = annullabile && ultimo && adesso - new Date(ultimo.fatto_il).getTime() < DIECI_MINUTI

  return (
    <Card className="p-4 flex flex-col gap-4">
      <TitoloSezione className="text-[15px]">{e.stato === 'completato' ? 'Evento concluso' : 'Andamento'}</TitoloSezione>
      <Andamento eventoId={e.id} compatto />
      {(segna.error || annulla.error) && <Errore errore={segna.error ?? annulla.error} />}
      {prossimo && (
        <Pulsante taglia="lg" className="w-full h-14 text-base" caricamento={segna.isPending}
          onClick={() => segna.mutate({ eventoId: e.id, passaggio: prossimo.id })}>
          {prossimo.azione}
        </Pulsante>
      )}
      {puoAnnullare && (
        <button onClick={() => annulla.mutate(e.id)} disabled={annulla.isPending}
          className="text-sm font-semibold text-tenue underline underline-offset-2 self-center cursor-pointer disabled:opacity-50">
          Ho sbagliato, annulla l'ultimo
        </button>
      )}
    </Card>
  )
}
