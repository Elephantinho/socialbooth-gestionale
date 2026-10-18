import { useState } from 'react'
import { Camera, Check, CreditCard, Loader2, Plus, Receipt, Wallet, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/sessione'
import type { EventoDettaglio } from '@/modules/eventi/types'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Errore } from '@/shared/ui/Stati'
import { useAdesso } from '@/shared/lib/tempo'
import { useAllegaScontrino, useSpese, useTogliSpesa } from './api'
import { etichettaVoce, euro } from './conti'
import { NuovaSpesa } from './CostiRicavi'

const GIORNO = 86_400_000

/**
 * Per l'operatore, le spese dell'evento:
 * - con la carta aziendale arrivano da sole dalla banca: lui aggiunge solo la foto dello scontrino
 * - di tasca sua le segna lui, con la foto, e vede quando gli vengono rimborsate
 */
export function SpeseOperatore({ e }: { e: EventoDettaglio }) {
  const profilo = useProfilo()
  const spese = useSpese(e.id)
  const togli = useTogliSpesa()
  const allega = useAllegaScontrino()
  const [nuova, setNuova] = useState(false)

  // Dal giorno prima a due giorni dopo l'evento
  const adesso = useAdesso()
  const aperte = ['confermato', 'in_corso', 'completato'].includes(e.stato)
    && adesso >= new Date(e.allestimento_il).getTime() - GIORNO
    && adesso <= new Date(e.smontaggio_il).getTime() + 2 * GIORNO
  if (!aperte) return null
  const mie = spese.data ?? []
  const senzaScontrino = mie.filter((s) => !s.scontrino).length

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <TitoloSezione className="text-[15px]">Spese</TitoloSezione>
        {senzaScontrino > 0 && (
          <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-urgente-tenue text-urgente-testo inline-flex items-center gap-1">
            <Receipt className="size-3.5" aria-hidden />{senzaScontrino}
          </span>
        )}
      </div>
      {mie.length > 0 && (
        <ul className="divide-y divide-bordo">
          {mie.map((s) => {
            const carta = s.pagata_con !== 'operatore'
            return (
              <li key={s.id} className="py-2.5 flex items-center gap-3 text-sm">
                {carta
                  ? <CreditCard className="size-4 text-tenue shrink-0" aria-label="Carta aziendale" />
                  : <Wallet className="size-4 text-tenue shrink-0" aria-label="Di tasca tua" />}
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{etichettaVoce(s.voce)}{s.descrizione ? `, ${s.descrizione}` : ''}</span>
                  {!carta && s.rimborsata_il && <span className="text-xs font-semibold text-ok inline-flex items-center gap-1"><Check className="size-3" aria-hidden />Rimborsata</span>}
                </span>
                <span className="font-semibold tabular-nums">{euro(s.importo)}</span>
                {s.scontrino ? (
                  <Receipt className="size-4 text-ok shrink-0" aria-label="Scontrino aggiunto" />
                ) : (
                  // Foto dello scontrino da aggiungere (soprattutto per i pagamenti con la carta arrivati dalla banca)
                  <label className="h-9 px-3 rounded-lg bg-inchiostro text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0" aria-label="Aggiungi la foto dello scontrino">
                    {allega.isPending && allega.variables?.spesaId === s.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
                    <span>Scontrino</span>
                    <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={allega.isPending}
                      onChange={(ev) => { const foto = ev.target.files?.[0]; if (foto) allega.mutate({ spesaId: s.id, eventoId: e.id, autoreId: profilo.id, foto }) }} />
                  </label>
                )}
                {!carta && s.fonte === 'app' && !s.rimborsata_il && adesso - new Date(s.creato_il).getTime() < GIORNO && (
                  <button onClick={() => { if (confirm('Togliere questa spesa?')) togli.mutate(s.id) }} aria-label="Togli la spesa"
                    className="size-8 rounded-full text-tenue flex items-center justify-center">
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {(togli.error || allega.error) && <Errore errore={togli.error ?? allega.error} />}
      {nuova ? (
        <NuovaSpesa eventoId={e.id} operatoreId={profilo.id} daOperatore onFatto={() => setNuova(false)} />
      ) : (
        <button onClick={() => setNuova(true)}
          className="h-12 rounded-lg border border-bordo-forte font-semibold text-[15px] flex items-center justify-center gap-2">
          <Plus className="size-5" aria-hidden /> Ho pagato di tasca mia
        </button>
      )}
    </Card>
  )
}
