import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useProfilo } from '@/modules/auth/sessione'
import { usePuo } from '@/modules/auth/permessi'
import { useCreaEvento } from '@/modules/eventi/api'
import { useSalvaConti } from '@/modules/conti/api'
import { useUtenti } from '@/modules/anagrafiche/api'
import { nomeCompleto } from '@/shared/lib/formato'
import { ModuloEvento } from '@/modules/eventi/components/ModuloEvento'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { Pulsante } from '@/shared/ui/Pulsante'

export function NuovoEvento() {
  const profilo = useProfilo()
  const puo = usePuo()
  const naviga = useNavigate()
  const creaEvento = useCreaEvento()
  const salvaConti = useSalvaConti()
  const [creato, setCreato] = useState<{ id: string }>()
  const [chiave, setChiave] = useState(0) // per svuotare il modulo
  // L'admin crea eventi per conto di un project; il project li crea per sé
  const admin = profilo.ruolo === 'admin'
  const utenti = useUtenti()
  const projects = (utenti.data ?? []).filter((u) => u.ruolo === 'project' && u.attivo)
  const [projectId, setProjectId] = useState('')

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
        <h1 className="font-display text-[26px] font-semibold leading-tight mt-1">Nuovo evento</h1>
      </div>
      {admin && (
        <label className="flex flex-col gap-1.5 max-w-sm -mb-2">
          <span className="text-[13px] font-semibold text-tenue">Project di riferimento</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="h-12 rounded-lg border border-bordo-forte bg-superficie px-3 text-[15px] font-medium">
            <option value="">Io ({nomeCompleto(profilo)})</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{nomeCompleto(p)}</option>)}
          </select>
        </label>
      )}
      <ModuloEvento
        key={chiave}
        testoPulsante="Crea e assegna"
        conPrezzo
        conCliente={puo('clienti')}
        onSalva={async (dati, prezzo) => {
          const r = await creaEvento.mutateAsync({ ...dati, project_id: (admin && projectId) || profilo.id, stato: 'da_assegnare' })
          await salvaConti.mutateAsync({ eventoId: r.id, modifiche: { prezzo } })
          setCreato({ id: r.id })
        }}
      />
    </div>
  )
}

function EventoCreato({ id, onAltro, onApri }: { id: string; onAltro: () => void; onApri: () => void }) {
  return (
    <div className="max-w-xl flex flex-col gap-5 py-2">
      <div>
        <h1 className="font-display text-[26px] font-semibold leading-tight">Evento creato</h1>
        <p className="text-tenue mt-2">Scegli a chi proporlo.</p>
      </div>
      <AssegnaOperatore eventoId={id} onFatto={onApri} />
      <div className="flex gap-2 flex-wrap">
        <Pulsante variante="secondario" onClick={onAltro}>Crea un altro evento</Pulsante>
        <Pulsante variante="scuro" onClick={onApri}>Apri l'evento</Pulsante>
      </div>
    </div>
  )
}
