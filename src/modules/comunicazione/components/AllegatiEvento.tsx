import { useState } from 'react'
import { Camera, FileText, Image as Immagine, Paperclip, Trash2, Upload } from 'lucide-react'
import { apriFile, useAllegati, useCaricaAllegato, useEliminaAllegato } from '../api'
import { nomeCompleto } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const dimensione = (b: number | null) => (b == null ? '' : b < 1_000_000 ? `${Math.round(b / 1000)} KB` : `${(b / 1_000_000).toFixed(1).replace('.', ',')} MB`)

/** Brief, grafiche, planimetrie e foto dell'evento. L'operatore può aggiungere la foto del set. */
export function AllegatiEvento({ eventoId, fotoSet }: { eventoId: string; fotoSet?: boolean }) {
  const { data, isPending } = useAllegati(eventoId)
  const carica = useCaricaAllegato()
  const elimina = useEliminaAllegato()
  const [errore, setErrore] = useState<unknown>()

  const scegli = (files: FileList | null, nome?: string, cartella?: string) => {
    setErrore(undefined)
    for (const file of Array.from(files ?? [])) {
      carica.mutate({ eventoId, file, nome: nome ? `${nome} · ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : undefined, cartella }, { onError: setErrore })
    }
  }

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <TitoloSezione className="text-[15px] flex items-center gap-2"><Paperclip className="size-4" aria-hidden /> Documenti e foto</TitoloSezione>
        <div className="flex gap-1.5">
          {fotoSet && (
            <label className="h-9 px-3 rounded-lg bg-inchiostro text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
              <Camera className="size-3.5" aria-hidden /> Foto del set
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => scegli(e.target.files, 'Foto del set', 'foto')} />
            </label>
          )}
          <label className="h-9 px-3 rounded-lg border border-bordo-forte text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-sfondo">
            <Upload className="size-3.5" aria-hidden /> Carica
            <input type="file" multiple className="sr-only" onChange={(e) => scegli(e.target.files)} />
          </label>
        </div>
      </div>
      {carica.isPending && <p className="text-sm text-tenue" role="status">Caricamento…</p>}
      {errore != null && <Errore errore={errore} />}
      {isPending ? <Caricamento className="py-4" /> : !data?.length ? (
        <p className="text-sm text-tenue">Nessun file. Carica brief, grafiche, planimetrie o foto.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {data.map((a) => {
            const immagine = a.tipo?.startsWith('image/')
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-bordo p-2.5">
                <span className="size-9 rounded-lg bg-sfondo flex items-center justify-center shrink-0">
                  {immagine ? <Immagine className="size-4 text-accento" aria-hidden /> : <FileText className="size-4 text-tenue" aria-hidden />}
                </span>
                <button onClick={() => apriFile(a.percorso).catch(setErrore)} className="flex-1 min-w-0 text-left cursor-pointer">
                  <span className="block text-sm font-bold truncate hover:underline">{a.nome}</span>
                  <span className="block text-xs text-tenue">{[nomeCompleto(a.autore), dimensione(a.dimensione)].filter(Boolean).join(' · ')}</span>
                </button>
                <button aria-label={`Elimina ${a.nome}`} onClick={() => confirm(`Eliminare ${a.nome}?`) && elimina.mutate({ id: a.id, percorso: a.percorso, eventoId })}
                  className="size-9 rounded-lg flex items-center justify-center text-tenue hover:bg-sfondo cursor-pointer">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
