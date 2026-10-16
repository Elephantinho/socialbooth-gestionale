import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { RUOLI, etichettaRuolo, type Ruolo } from '@/modules/auth/permessi'
import { useCambiaRuolo, useUtenti } from '@/modules/anagrafiche/api'
import { dataBreve, nomeCompleto } from '@/shared/lib/formato'
import { Avatar } from '@/shared/ui/Avatar'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/** Utenti e ruoli: solo l'admin può cambiarli */
export function Utenti() {
  const io = useProfilo()
  const { data, isPending, error } = useUtenti()
  const cambia = useCambiaRuolo()

  const scegli = (u: { id: string; nome: string; cognome: string }, ruolo: Ruolo) => {
    if (confirm(`Rendere ${nomeCompleto(u)} ${etichettaRuolo(ruolo)}?`)) cambia.mutate({ id: u.id, ruolo, attivo: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra="Amministrazione" titolo="Utenti e ruoli"
        descrizione="Chiunque si registra dall'app nasce operatore. Per dare un altro ruolo, fagli registrare un account e poi cambialo qui." />

      {/* Cosa può fare ogni ruolo */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {RUOLI.map((r) => (
          <Card key={r.id} className="p-4 flex flex-col">
            <p className="font-bold inline-flex items-center gap-2"><ShieldCheck className="size-4 text-accento" aria-hidden />{r.etichetta}</p>
            <p className="text-sm text-tenue mt-1 flex-1">{r.descrizione}</p>
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
              <label className="flex items-center gap-2 text-sm font-semibold">
                <span className="sr-only">Ruolo di {nomeCompleto(u)}</span>
                <select value={u.ruolo} disabled={u.id === io.id || cambia.isPending}
                  onChange={(e) => scegli(u, e.target.value as Ruolo)}
                  className="h-10 rounded-xl border border-bordo-forte bg-superficie px-3 font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                  {RUOLI.map((r) => <option key={r.id} value={r.id}>{r.etichetta}</option>)}
                </select>
              </label>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
