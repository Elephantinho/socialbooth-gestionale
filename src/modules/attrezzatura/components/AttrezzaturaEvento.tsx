import { useState } from 'react'
import { Package, Pencil } from 'lucide-react'
import { useArticoli, useAttrezzaturaEvento, useImpostaAttrezzatura } from '../api'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/** Attrezzatura da portare all'evento, scelta dall'inventario del magazzino. */
export function AttrezzaturaEvento({ eventoId, magazzinoId, modificabile }: { eventoId: string; magazzinoId: string | null; modificabile: boolean }) {
  const assegnata = useAttrezzaturaEvento(eventoId)
  const [modifica, setModifica] = useState(false)

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center gap-2">
        <TitoloSezione className="text-[15px] flex items-center gap-2"><Package className="size-4" aria-hidden /> Attrezzatura</TitoloSezione>
        {modificabile && magazzinoId && !modifica && (
          <button onClick={() => setModifica(true)} className="text-sm font-bold text-accento inline-flex items-center gap-1 cursor-pointer">
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
        <ul className="flex flex-col gap-1.5">
          {assegnata.data.map((a) => (
            <li key={a.articolo_id} className="flex justify-between text-sm">
              <span className="font-semibold">{a.articolo?.nome}{a.articolo?.codice && <span className="text-tenue font-medium"> · {a.articolo.codice}</span>}</span>
              <span className="font-bold">×{a.quantita}</span>
            </li>
          ))}
        </ul>
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
  if (!disponibili.length) return <p className="text-sm text-tenue">L'inventario di questo magazzino è vuoto: aggiungi gli articoli in Magazzini.</p>

  return (
    <div className="flex flex-col gap-2">
      {disponibili.map((a) => {
        const q = scelte[a.id] ?? 0
        return (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-accento" aria-label={a.nome} checked={q > 0}
              onChange={(ev) => setScelte((s) => ({ ...s, [a.id]: ev.target.checked ? 1 : 0 }))} />
            <span className="flex-1 min-w-0 truncate font-semibold">{a.nome} <span className="text-tenue font-medium">· {a.categoria}</span></span>
            {q > 0 && (
              <input type="number" min={1} max={a.quantita} value={q} aria-label={`Quantità ${a.nome}`}
                onChange={(ev) => setScelte((s) => ({ ...s, [a.id]: Math.max(1, Math.min(a.quantita, Number(ev.target.value) || 1)) }))}
                className="w-16 h-9 rounded-lg border border-bordo-forte px-2" />
            )}
            <span className="text-xs text-tenue w-12 text-right">di {a.quantita}</span>
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
