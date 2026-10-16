import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useCambiaRuolo, useUtenti } from '@/modules/anagrafiche/api'
import { dataBreve, nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import type { Enum } from '@/shared/types/database'
import { Avatar } from '@/shared/ui/Avatar'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const ruoli: { id: Enum<'ruolo'>; etichetta: string; descrizione: string }[] = [
  { id: 'admin', etichetta: 'Admin', descrizione: 'Titolare: vede e modifica tutto' },
  { id: 'project', etichetta: 'Project', descrizione: 'Crea e gestisce i propri eventi' },
  { id: 'operatore', etichetta: 'Operatore', descrizione: 'Riceve gli eventi dall\'app' },
]

/** Utenti e ruoli: solo l'admin può cambiarli */
export function Utenti() {
  const io = useProfilo()
  const { data, isPending, error } = useUtenti()
  const cambia = useCambiaRuolo()
  const admin = io.ruolo === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra="Amministrazione" titolo="Utenti e ruoli"
        descrizione={<>Chiunque si registra dall'app nasce operatore. Per creare un <strong className="text-inchiostro">project</strong> o un altro <strong className="text-inchiostro">admin</strong>, fagli registrare un account e poi cambia qui il ruolo.</>} />

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {ruoli.map((r) => (
          <Card key={r.id} className="p-4">
            <p className="font-bold inline-flex items-center gap-2"><ShieldCheck className="size-4 text-accento" aria-hidden />{r.etichetta}</p>
            <p className="text-sm text-tenue mt-1">{r.descrizione}</p>
            <p className="font-display text-2xl font-bold mt-2">{(data ?? []).filter((u) => u.ruolo === r.id).length}</p>
          </Card>
        ))}
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <Card className="divide-y divide-bordo">
          {cambia.error && <div className="p-4"><Errore errore={cambia.error} /></div>}
          {data.map((u) => (
            <div key={u.id} className="p-4 flex flex-wrap items-center gap-3">
              <Avatar nome={nomeCompleto(u)} foto={u.foto} />
              <div className="flex-[1_1_200px] min-w-0">
                {u.ruolo === 'operatore'
                  ? <Link to={`/gestione/operatori/${u.id}`} className="font-bold hover:underline">{nomeCompleto(u)}</Link>
                  : <p className="font-bold">{nomeCompleto(u)}{u.id === io.id && <span className="text-tenue font-medium"> (tu)</span>}</p>}
                <p className="text-xs text-tenue">Registrato il {dataBreve(u.creato_il)}{!u.attivo && ' · in attesa di approvazione'}</p>
              </div>
              <div className="flex rounded-xl bg-sfondo p-1" role="group" aria-label={`Ruolo di ${nomeCompleto(u)}`}>
                {ruoli.map((r) => (
                  <button key={r.id} disabled={!admin || u.id === io.id || cambia.isPending} aria-pressed={u.ruolo === r.id}
                    onClick={() => confirm(`Rendere ${nomeCompleto(u)} ${r.etichetta}?`) && cambia.mutate({ id: u.id, ruolo: r.id, attivo: true })}
                    className={cn('h-9 px-3 rounded-[9px] text-xs font-bold transition disabled:cursor-not-allowed',
                      u.ruolo === r.id ? 'bg-inchiostro text-white' : 'text-tenue enabled:hover:text-inchiostro enabled:cursor-pointer')}>
                    {r.etichetta}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
