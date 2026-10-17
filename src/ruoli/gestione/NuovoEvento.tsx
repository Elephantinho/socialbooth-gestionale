import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useCreaEvento, useEventoGestione } from '@/modules/eventi/api'
import { Caricamento } from '@/shared/ui/Stati'
import { ModuloEvento } from '@/modules/eventi/components/ModuloEvento'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { Pulsante } from '@/shared/ui/Pulsante'

export function NuovoEvento() {
  const profilo = useProfilo()
  const naviga = useNavigate()
  const creaEvento = useCreaEvento()
  const [creato, setCreato] = useState<{ id: string; automatico: boolean }>()
  const [chiave, setChiave] = useState(0) // per svuotare il modulo
  const [parametri] = useSearchParams()
  const daCopiare = parametri.get('da')
  const modello = useEventoGestione(daCopiare ?? '')

  if (creato) {
    return (
      <EventoCreato {...creato}
        onAltro={() => { setCreato(undefined); setChiave((k) => k + 1) }}
        onApri={() => naviga(`/gestione/eventi/${creato.id}`)} />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/gestione" className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro">
          <ArrowLeft className="size-4" aria-hidden /> Eventi
        </Link>
        <h1 className="font-display text-[26px] font-semibold leading-tight mt-1">{daCopiare ? 'Duplica evento' : 'Nuovo evento'}</h1>
        {daCopiare && <p className="text-tenue mt-1">Stessi dati dell'evento originale: scegli la nuova data.</p>}
      </div>
      {daCopiare && modello.isPending ? <Caricamento /> : <ModuloEvento
        key={chiave}
        modello={daCopiare ? modello.data : undefined}
        testoPulsante="Crea e assegna"
        onSalva={async (dati) => {
          const r = await creaEvento.mutateAsync({ ...dati, project_id: profilo.id, stato: 'da_assegnare' })
          setCreato({ id: r.id, automatico: !!r.operatore_id })
        }}
      />}
    </div>
  )
}

function EventoCreato({ id, automatico, onAltro, onApri }: { id: string; automatico: boolean; onAltro: () => void; onApri: () => void }) {
  return (
    <div className="max-w-xl flex flex-col gap-5 py-2">
      <div>
        <h1 className="font-display text-[26px] font-semibold leading-tight">Evento creato</h1>
        <p className="text-tenue mt-2">
          {automatico
            ? "Proposto all'unico operatore libero in zona. Lo trova tra le proposte da accettare."
            : "Scegli a chi proporlo."}
        </p>
      </div>
      {!automatico && <AssegnaOperatore eventoId={id} onFatto={onApri} />}
      <div className="flex gap-2 flex-wrap">
        <Pulsante variante="secondario" onClick={onAltro}>Crea un altro evento</Pulsante>
        <Pulsante variante="scuro" onClick={onApri}>Apri l'evento</Pulsante>
      </div>
    </div>
  )
}
