import { useRef } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useAttrezzaturaEvento } from '@/modules/attrezzatura/api'
import { useCaricaFotoMontaggio, useFotoMontaggio, useMontaggio, useSalvaChecklist } from '../api'
import { cn } from '@/shared/lib/cn'
import { ora } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'

/** Voci della checklist: l'attrezzatura assegnata, altrimenti una lista base */
function useVoci(eventoId: string, wifi: boolean) {
  const assegnata = useAttrezzaturaEvento(eventoId).data ?? []
  const base = assegnata.length
    ? assegnata.map((a) => `${a.quantita > 1 ? `${a.quantita}× ` : ''}${a.articolo?.nome ?? 'Articolo'}${a.articolo?.codice ? ` (${a.articolo.codice})` : ''}`)
    : ['Booth e cavalletto', 'Stampante e carta', 'Props e fondale']
  return [...base, ...(wifi ? [] : ['Hotspot carico'])]
}

/** Per l'operatore: spunta l'attrezzatura e fotografa il set montato. Si salva sul server. */
export function ChecklistMontaggio({ eventoId, wifi }: { eventoId: string; wifi: boolean }) {
  const voci = useVoci(eventoId, wifi)
  const montaggio = useMontaggio(eventoId)
  const salva = useSalvaChecklist()
  const foto = useFotoMontaggio(eventoId)
  const carica = useCaricaFotoMontaggio()
  const input = useRef<HTMLInputElement>(null)
  const fatte = (montaggio.data?.voci_fatte ?? []).filter((v) => voci.includes(v))

  const spunta = (v: string, si: boolean) => {
    const nuove = si ? [...fatte, v] : fatte.filter((x) => x !== v)
    salva.mutate({ eventoId, fatte: nuove, totale: voci.length })
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <TitoloSezione className="text-[15px]">Montaggio</TitoloSezione>
        <span className={cn('text-xs font-semibold', fatte.length === voci.length ? 'text-accento-scuro' : 'text-tenue')}>{fatte.length}/{voci.length}</span>
      </div>
      <div className="flex flex-col">
        {voci.map((v) => (
          <label key={v} className="flex items-center gap-3 text-[15px] min-h-11 cursor-pointer">
            <input type="checkbox" className="size-[22px] accent-accento" checked={fatte.includes(v)} onChange={(ev) => spunta(v, ev.target.checked)} />
            <span className={cn(fatte.includes(v) && 'text-tenue line-through')}>{v}</span>
          </label>
        ))}
      </div>

      <div className="border-t border-bordo pt-3 flex flex-col gap-2">
        <p className="text-sm font-semibold">Foto del set montato</p>
        {!!foto.data?.length && (
          <div className="flex gap-2 overflow-x-auto">
            {foto.data.map((f) => f.url && <img key={f.id} src={f.url} alt={`Set montato alle ${ora(f.creato_il)}`} className="h-24 w-24 object-cover rounded-lg border border-bordo shrink-0" />)}
          </div>
        )}
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(ev) => { const f = ev.target.files?.[0]; if (f) carica.mutate({ eventoId, file: f }); ev.target.value = '' }} />
        <Pulsante variante={foto.data?.length ? 'secondario' : 'primario'} taglia="lg" pieno caricamento={carica.isPending}
          onClick={() => input.current?.click()}>
          {foto.data?.length ? 'Aggiungi un\'altra foto' : 'Fotografa il set'}
        </Pulsante>
        {carica.error && <p className="text-sm text-urgente-testo font-semibold">{carica.error.message}</p>}
      </div>
    </Card>
  )
}

/** Per l'ufficio: a che punto è il montaggio e le foto del set */
export function StatoMontaggio({ eventoId }: { eventoId: string }) {
  const montaggio = useMontaggio(eventoId)
  const foto = useFotoMontaggio(eventoId)
  if (montaggio.isPending || foto.isPending) return <Card className="p-5"><Loader2 className="size-5 animate-spin text-tenue" aria-hidden /></Card>
  if (!montaggio.data && !foto.data?.length) return null
  return (
    <Card className="p-5 flex flex-col gap-3">
      <TitoloSezione className="text-[15px] flex items-center gap-2">
        {montaggio.data?.completato_il ? <CheckCircle2 className="size-4 text-accento-scuro" aria-hidden /> : null}
        Montaggio
      </TitoloSezione>
      <p className="text-sm text-tenue">
        {montaggio.data?.completato_il ? `Checklist completata alle ${ora(montaggio.data.completato_il)}`
          : montaggio.data ? `${montaggio.data.voci_fatte.length} voci spuntate` : 'Checklist non ancora iniziata'}
      </p>
      {!!foto.data?.length && (
        <div className="grid grid-cols-3 gap-2">
          {foto.data.map((f) => f.url && (
            <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
              <img src={f.url} alt={`Set montato alle ${ora(f.creato_il)}`} className="aspect-square w-full object-cover rounded-lg border border-bordo" />
            </a>
          ))}
        </div>
      )}
    </Card>
  )
}
