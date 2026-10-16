import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useAttivita, useCambiaStatoAttivita } from '@/modules/attivita/api'
import { NuovaAttivita, SchedaAttivita } from '@/modules/attivita/components/SchedaAttivita'
import { cn } from '@/shared/lib/cn'
import type { Enum } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const colonne: { stato: Enum<'stato_attivita'>; titolo: string; punto: string }[] = [
  { stato: 'da_fare', titolo: 'Da fare', punto: 'bg-tenue' },
  { stato: 'in_corso', titolo: 'In corso', punto: 'bg-avviso-icona' },
  { stato: 'fatto', titolo: 'Fatto', punto: 'bg-accento' },
]

/** Bacheca delle attività a colonne: si trascinano le schede da una colonna all'altra */
export function Attivita() {
  const profilo = useProfilo()
  const [soloMie, setSoloMie] = useState(false)
  const { data, isPending, error } = useAttivita(soloMie ? { assegnatoA: profilo.id } : undefined)
  const cambia = useCambiaStatoAttivita()
  const [nuova, setNuova] = useState(false)
  const [sopra, setSopra] = useState<string>()

  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra="Gestione" titolo="Attività"
        descrizione="Le cose da fare del team, anche legate agli eventi. Trascina le schede tra le colonne."
        azioni={!nuova && <Pulsante taglia="lg" icona={<Plus className="size-[18px]" aria-hidden />} onClick={() => setNuova(true)}>Nuova attività</Pulsante>} />

      <div className="flex rounded-xl bg-superficie border border-bordo p-1 w-fit" role="tablist">
        {[false, true].map((m) => (
          <button key={String(m)} role="tab" aria-selected={soloMie === m} onClick={() => setSoloMie(m)}
            className={cn('h-9 px-4 rounded-[9px] text-sm font-bold cursor-pointer', soloMie === m ? 'bg-inchiostro text-white' : 'text-tenue')}>
            {m ? 'Solo mie' : 'Tutte'}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {nuova && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-5 max-w-2xl"><NuovaAttivita onFatto={() => setNuova(false)} /></Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start">
          {colonne.map((c) => {
            const lista = data.filter((a) => a.stato === c.stato)
            return (
              <section key={c.stato}
                onDragOver={(e) => { e.preventDefault(); setSopra(c.stato) }}
                onDragLeave={() => setSopra(undefined)}
                onDrop={(e) => {
                  e.preventDefault()
                  setSopra(undefined)
                  const id = e.dataTransfer.getData('text/attivita')
                  if (id) cambia.mutate({ id, stato: c.stato })
                }}
                className={cn('rounded-[20px] bg-[#ECEAE4] p-3 flex flex-col gap-2.5 min-h-40 transition', sopra === c.stato && 'ring-2 ring-accento bg-accento-tenue/50')}>
                <h2 className="flex items-center gap-2 px-1.5 pt-1 text-sm font-bold">
                  <span className={cn('size-2.5 rounded-full', c.punto)} aria-hidden /> {c.titolo}
                  <span className="text-tenue font-semibold">{lista.length}</span>
                </h2>
                {lista.length === 0 && <p className="text-xs text-tenue px-1.5 py-3">Trascina qui un'attività</p>}
                {lista.map((a) => (
                  <motion.div key={a.id} layout>
                    <SchedaAttivita a={a} trascinabile />
                  </motion.div>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
