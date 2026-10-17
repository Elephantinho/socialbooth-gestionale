import { useState } from 'react'
import { Plus, Receipt, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import type { EventoDettaglio } from '@/modules/eventi/types'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Errore } from '@/shared/ui/Stati'
import { useSpese, useTogliSpesa } from './api'
import { etichettaVoce, euro } from './conti'
import { NuovaSpesa } from './CostiRicavi'

const GIORNO = 86_400_000

/** Per l'operatore: le spese che ha fatto per l'evento (carta aziendale o di tasca sua), con lo scontrino. */
export function SpeseOperatore({ e }: { e: EventoDettaglio }) {
  const profilo = useProfilo()
  const spese = useSpese(e.id)
  const togli = useTogliSpesa()
  const [nuova, setNuova] = useState(false)

  // Dal giorno prima a due giorni dopo l'evento
  const adesso = Date.now()
  const aperte = ['confermato', 'in_corso', 'completato'].includes(e.stato)
    && adesso >= new Date(e.allestimento_il).getTime() - GIORNO
    && adesso <= new Date(e.smontaggio_il).getTime() + 2 * GIORNO
  if (!aperte) return null
  const mie = spese.data ?? []
  const totale = mie.reduce((t, s) => t + Number(s.importo), 0)

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <TitoloSezione className="text-[15px]">Spese</TitoloSezione>
        {mie.length > 0 && <span className="text-sm font-semibold tabular-nums">{euro(totale)}</span>}
      </div>
      {mie.length > 0 && (
        <ul className="divide-y divide-bordo">
          {mie.map((s) => (
            <li key={s.id} className="py-2 flex items-center gap-3 text-sm">
              {s.scontrino ? <Receipt className="size-4 text-ok shrink-0" aria-label="Con scontrino" /> : <Receipt className="size-4 text-tenue/50 shrink-0" aria-label="Senza scontrino" />}
              <span className="flex-1 min-w-0 truncate">{etichettaVoce(s.voce)}{s.descrizione ? `, ${s.descrizione}` : ''}</span>
              <span className="font-semibold tabular-nums">{euro(s.importo)}</span>
              {adesso - new Date(s.creato_il).getTime() < GIORNO && (
                <button onClick={() => { if (confirm('Togliere questa spesa?')) togli.mutate(s.id) }} aria-label="Togli la spesa"
                  className="size-8 rounded-full text-tenue flex items-center justify-center">
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {togli.error && <Errore errore={togli.error} />}
      {nuova ? (
        <NuovaSpesa eventoId={e.id} operatoreId={profilo.id} daOperatore onFatto={() => setNuova(false)} />
      ) : (
        <button onClick={() => setNuova(true)}
          className="h-12 rounded-lg border border-bordo-forte font-semibold text-[15px] flex items-center justify-center gap-2">
          <Plus className="size-5" aria-hidden /> Segna una spesa
        </button>
      )}
      {mie.length === 0 && !nuova && <p className="text-xs text-tenue -mt-1">Benzina, noleggio, parcheggio, caffè… con la foto dello scontrino.</p>}
    </Card>
  )
}
