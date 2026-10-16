import { useState } from 'react'
import { ListChecks, Plus } from 'lucide-react'
import { useAttivita } from '../api'
import { NuovaAttivita, SchedaAttivita } from './SchedaAttivita'
import { Card, TitoloSezione } from '@/shared/ui/Card'

/** Attività legate a un evento (nel dettaglio evento) */
export function AttivitaEvento({ eventoId }: { eventoId: string }) {
  const { data } = useAttivita({ eventoId })
  const [nuova, setNuova] = useState(false)
  const aperte = (data ?? []).filter((a) => a.stato !== 'fatto').length

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <TitoloSezione className="text-[15px] flex items-center gap-2"><ListChecks className="size-4" aria-hidden /> Attività {data?.length ? <span className="text-tenue font-semibold">· {aperte} aperte</span> : null}</TitoloSezione>
        {!nuova && (
          <button onClick={() => setNuova(true)} className="text-sm font-bold text-accento inline-flex items-center gap-1 cursor-pointer">
            <Plus className="size-4" aria-hidden /> Aggiungi
          </button>
        )}
      </div>
      {nuova && <NuovaAttivita eventoId={eventoId} onFatto={() => setNuova(false)} />}
      {!data?.length && !nuova && <p className="text-sm text-tenue">Es. stampare le grafiche, confermare il furgone, chiamare il referente.</p>}
      {data?.map((a) => <SchedaAttivita key={a.id} a={a} compatta />)}
    </Card>
  )
}
