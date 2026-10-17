import { Link } from 'react-router-dom'
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
      <Intestazione titolo="Utenti e ruoli" />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-bordo">
            {RUOLI.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="text-left font-semibold px-4 py-2.5 w-44 align-top">{r.etichetta}</th>
                <td className="px-4 py-2.5 text-tenue">{r.descrizione}</td>
                <td className="px-4 py-2.5 text-right font-semibold w-16">{(data ?? []).filter((u) => u.ruolo === r.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <Card className="divide-y divide-bordo">
          {cambia.error && <div className="p-4"><Errore errore={cambia.error} /></div>}
          {data.map((u) => (
            <div key={u.id} className="p-4 flex flex-wrap items-center gap-3">
              <Avatar nome={nomeCompleto(u)} foto={u.foto} />
              <div className="flex-[1_1_200px] min-w-0">
                {u.ruolo === 'operatore'
                  ? <Link to={`/gestione/operatori/${u.id}`} className="font-semibold hover:underline">{nomeCompleto(u)}</Link>
                  : <p className="font-semibold">{nomeCompleto(u)}{u.id === io.id && <span className="text-tenue font-medium"> (tu)</span>}</p>}
                <p className="text-xs text-tenue">Registrato il {dataBreve(u.creato_il)}{!u.attivo && ', in attesa di approvazione'}</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <span className="sr-only">Ruolo di {nomeCompleto(u)}</span>
                <select value={u.ruolo} disabled={u.id === io.id || cambia.isPending}
                  onChange={(e) => scegli(u, e.target.value as Ruolo)}
                  className="h-10 rounded-lg border border-bordo-forte bg-superficie px-3 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
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
