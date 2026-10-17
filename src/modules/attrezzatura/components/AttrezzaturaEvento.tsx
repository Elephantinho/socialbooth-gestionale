import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useArticoli, useAttrezzaturaEvento, useImpostaAttrezzatura, useSegnaAttrezzatura } from '../api'
import { ETICHETTE_STATO, statoAttrezzatura } from '../logic/stato'
import { ora, dataBreve } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/**
 * Attrezzatura da portare all'evento, scelta dall'inventario del magazzino.
 * Esce dal magazzino da sola quando l'operatore registra "Parto dal magazzino"
 * e rientra con "Rientrato"; qui si può segnare anche a mano.
 */
export function AttrezzaturaEvento({ eventoId, magazzinoId, modificabile }: { eventoId: string; magazzinoId: string | null; modificabile: boolean }) {
  const assegnata = useAttrezzaturaEvento(eventoId)
  const segna = useSegnaAttrezzatura()
  const [modifica, setModifica] = useState(false)
  const stato = statoAttrezzatura(assegnata.data ?? [])

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center gap-2">
        <TitoloSezione className="text-[15px] flex items-center gap-2">
          Attrezzatura
          {stato !== 'vuota' && <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', ETICHETTE_STATO[stato].stile)}>{ETICHETTE_STATO[stato].testo}</span>}
        </TitoloSezione>
        {modificabile && magazzinoId && !modifica && (
          <button onClick={() => setModifica(true)} className="text-sm font-semibold text-accento inline-flex items-center gap-1 cursor-pointer">
            <Pencil className="size-3.5" aria-hidden /> Scegli
          </button>
        )}
      </div>
      {!magazzinoId ? (
        <p className="text-sm text-tenue">Scegli prima un magazzino di partenza per l'evento.</p>
      ) : modifica ? (
        <Scelta eventoId={eventoId} magazzinoId={magazzinoId} attuale={assegnata.data ?? []} onFatto={() => setModifica(false)} />
      ) : assegnata.isPending ? <Caricamento className="py-4" /> : !assegnata.data?.length ? (
        <p className="text-sm text-tenue">Nessuna attrezzatura assegnata: l'operatore vedrà una checklist base.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {assegnata.data.map((a) => (
              <li key={a.articolo_id} className="flex justify-between gap-2 text-sm">
                <span className="font-semibold min-w-0">
                  {a.articolo?.nome}{a.articolo?.codice && <span className="text-tenue font-medium">, {a.articolo.codice}</span>}
                  <span className="block text-xs text-tenue font-medium">
                    {a.rientrato_il ? `Rientrata ${dataBreve(a.rientrato_il)} ${ora(a.rientrato_il)}`
                      : a.prelevato_il ? `Uscita ${dataBreve(a.prelevato_il)} ${ora(a.prelevato_il)}${a.articolo?.categoria === 'Consumabili' ? ', consumabile' : ''}`
                      : 'In magazzino'}
                  </span>
                </span>
                <span className="font-semibold">×{a.quantita}</span>
              </li>
            ))}
          </ul>
          {(stato === 'in_magazzino' || stato === 'parziale' || stato === 'fuori') && (
            <div className="flex flex-wrap gap-2 pt-1">
              {stato !== 'fuori' && (
                <Pulsante variante="secondario" caricamento={segna.isPending && segna.variables?.azione === 'prelievo'}
                  onClick={() => segna.mutate({ eventoId, azione: 'prelievo' })}>Segna uscita</Pulsante>
              )}
              {stato !== 'in_magazzino' && (
                <Pulsante variante="secondario" caricamento={segna.isPending && segna.variables?.azione === 'rientro'}
                  onClick={() => segna.mutate({ eventoId, azione: 'rientro' })}>Segna rientro</Pulsante>
              )}
            </div>
          )}
          {segna.error && <Errore errore={segna.error} />}
        </>
      )}
    </Card>
  )
}

function Scelta({ eventoId, magazzinoId, attuale, onFatto }: {
  eventoId: string; magazzinoId: string; attuale: { articolo_id: string; quantita: number }[]; onFatto: () => void
}) {
  const articoli = useArticoli(magazzinoId)
  const imposta = useImpostaAttrezzatura()
  const [scelte, setScelte] = useState<Record<string, number>>(() => Object.fromEntries(attuale.map((a) => [a.articolo_id, a.quantita])))

  if (articoli.isPending) return <Caricamento className="py-4" />
  if (articoli.error) return <Errore errore={articoli.error} />
  const disponibili = articoli.data.filter((a) => a.stato === 'disponibile')
  // pezzi liberi adesso: quelli non fuori per altri eventi (più quelli già scelti qui)
  const liberi = (a: (typeof disponibili)[number]) => Math.max(0, a.quantita - a.in_uso) + (attuale.find((x) => x.articolo_id === a.id)?.quantita ?? 0)
  if (!disponibili.length) return <p className="text-sm text-tenue">L'inventario di questo magazzino è vuoto: aggiungi gli articoli in Magazzini.</p>

  return (
    <div className="flex flex-col gap-2">
      {disponibili.map((a) => {
        const q = scelte[a.id] ?? 0
        return (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-accento" aria-label={a.nome} checked={q > 0}
              onChange={(ev) => setScelte((s) => ({ ...s, [a.id]: ev.target.checked ? 1 : 0 }))} />
            <span className="flex-1 min-w-0 truncate font-semibold">{a.nome} <span className="text-tenue font-medium">{a.categoria}</span></span>
            {q > 0 && (
              <input type="number" min={1} max={a.quantita} value={q} aria-label={`Quantità ${a.nome}`}
                onChange={(ev) => setScelte((s) => ({ ...s, [a.id]: Math.max(1, Math.min(a.quantita, Number(ev.target.value) || 1)) }))}
                className="w-16 h-9 rounded-lg border border-bordo-forte px-2" />
            )}
            <span className={cn('text-xs w-20 text-right', q > liberi(a) ? 'text-urgente-testo font-semibold' : 'text-tenue')}
              title={a.in_uso ? `${a.in_uso} fuori per altri eventi` : undefined}>
              {liberi(a)} liberi di {a.quantita}
            </span>
          </div>
        )
      })}
      {imposta.error && <Errore errore={imposta.error} />}
      <div className="flex gap-2 mt-2">
        <Pulsante caricamento={imposta.isPending} onClick={() => imposta.mutate({
          eventoId, righe: Object.entries(scelte).filter(([, q]) => q > 0).map(([articolo_id, quantita]) => ({ articolo_id, quantita })),
        }, { onSuccess: onFatto })}>Salva</Pulsante>
        <Pulsante variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </div>
  )
}
