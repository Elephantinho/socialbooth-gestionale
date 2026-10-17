import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useContiMese } from '@/modules/conti/api'
import { bilancio, euro } from '@/modules/conti/conti'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

const meseDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const sposta = (m: string, n: number) => { const [a, x] = m.split('-').map(Number); return meseDi(new Date(a, x - 1 + n, 1)) }
const nomeMese = (m: string) => { const t = new Date(`${m}-15T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1) }

/** Ricavi, costi e margini del mese. Il project vede solo i suoi eventi (lo decide il database). */
export function Conti() {
  const { ruolo } = useProfilo()
  const [mese, setMese] = useState(() => meseDi(new Date()))
  const { data, isPending, error } = useContiMese(mese)

  const righe = (data ?? []).map((e) => {
    const conti = Array.isArray(e.conti) ? e.conti[0] ?? null : e.conti
    return { e, conti, ...bilancio(conti, e.spese ?? []) }
  })
  const tot = righe.reduce((t, r) => ({
    ricavi: t.ricavi + (r.ricavo ?? 0),
    costi: t.costi + r.costi,
    senzaRicavo: t.senzaRicavo + (r.ricavo == null ? 1 : 0),
  }), { ricavi: 0, costi: 0, senzaRicavo: 0 })
  const margine = tot.ricavi - tot.costi
  // Fatture: eventi conclusi senza fattura, e fatture non ancora incassate
  const daFatturare = righe.filter((r) => r.e.stato === 'completato' && !r.conti?.fattura_numero)
  const daIncassare = righe.filter((r) => r.conti?.fattura_numero && !r.conti.incassata)

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo={ruolo === 'project' ? 'I miei conti' : 'Conti'} />

      <div className="flex items-center gap-1.5 -mt-2">
        <button onClick={() => setMese((m) => sposta(m, -1))} aria-label="Mese prima" className="size-9 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
          <ChevronLeft className="size-[18px]" aria-hidden />
        </button>
        <p className="font-semibold min-w-40 text-center">{nomeMese(mese)}</p>
        <button onClick={() => setMese((m) => sposta(m, 1))} aria-label="Mese dopo" className="size-9 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
          <ChevronRight className="size-[18px]" aria-hidden />
        </button>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : righe.length === 0 ? (
        <Card><Vuoto titolo="Nessun evento in questo mese" /></Card>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
            <Riquadro etichetta="Ricavi" valore={euro(tot.ricavi)} nota={tot.senzaRicavo ? `${tot.senzaRicavo} eventi senza prezzo` : `${righe.length} eventi`} notaRossa={tot.senzaRicavo > 0} />
            <Riquadro etichetta="Costi" valore={euro(tot.costi)} />
            <Riquadro etichetta="Margine" valore={euro(margine)} nota={tot.ricavi ? `${Math.round((margine / tot.ricavi) * 100)}% dei ricavi` : undefined} tono={margine >= 0 ? 'ok' : 'male'} />
            <Riquadro etichetta="Da incassare" valore={euro(daIncassare.reduce((t, r) => t + (r.ricavo ?? 0), 0))}
              nota={daFatturare.length ? `${daFatturare.length} conclusi da fatturare` : `${daIncassare.length} fatture aperte`} notaRossa={daFatturare.length > 0} />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-sfondo text-xs text-tenue">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-semibold">Data</th>
                    <th className="px-3 py-2.5 font-semibold">Evento</th>
                    {ruolo !== 'project' && <th className="px-3 py-2.5 font-semibold">Project</th>}
                    <th className="px-3 py-2.5 font-semibold text-right">Ricavo</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Costi</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Margine</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Fattura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bordo">
                  {righe.map(({ e, conti, ricavo, costi, margine: m }) => (
                    <tr key={e.id} className="hover:bg-sfondo/60">
                      <td className="px-4 py-2.5 whitespace-nowrap text-tenue">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })}</td>
                      <td className="px-3 py-2.5 max-w-64">
                        <Link to={`/gestione/eventi/${e.id}`} className="font-semibold hover:underline block truncate">{nomeEvento(e)}</Link>
                        <span className="text-xs text-tenue">{e.citta}</span>
                      </td>
                      {ruolo !== 'project' && <td className="px-3 py-2.5 text-tenue whitespace-nowrap">{e.project ? nomeCompleto(e.project) : '—'}</td>}
                      <td className={cn('px-3 py-2.5 text-right tabular-nums', ricavo == null && 'text-urgente-testo font-semibold')}>{ricavo == null ? 'manca' : euro(ricavo)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{euro(costi)}</td>
                      <td className={cn('px-3 py-2.5 text-right tabular-nums font-semibold', m != null && (m >= 0 ? 'text-ok' : 'text-urgente-testo'))}>{euro(m)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap"><StatoFattura stato={e.stato} conti={conti} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Riquadro({ etichetta, valore, nota, tono, notaRossa }: { etichetta: string; valore: string; nota?: string; tono?: 'ok' | 'male'; notaRossa?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-tenue">{etichetta}</p>
      <p className={cn('text-2xl font-semibold tabular-nums mt-1', tono === 'ok' && 'text-ok', tono === 'male' && 'text-urgente-testo')}>{valore}</p>
      {nota && <p className={cn('text-xs mt-0.5', notaRossa ? 'text-urgente-testo font-semibold' : 'text-tenue')}>{nota}</p>}
    </Card>
  )
}

function StatoFattura({ stato, conti }: { stato: string; conti: { fattura_numero: string | null; incassata: boolean } | null }) {
  const p = 'text-xs font-semibold rounded-full px-2.5 py-1'
  if (conti?.incassata) return <span className={cn(p, 'bg-ok-tenue text-ok')}>Incassata</span>
  if (conti?.fattura_numero) return <span className={cn(p, 'bg-avviso text-avviso-testo')}>N. {conti.fattura_numero}, da incassare</span>
  if (stato === 'completato') return <span className={cn(p, 'bg-urgente-tenue text-urgente-testo')}>Da fatturare</span>
  return <span className="text-xs text-tenue">—</span>
}
