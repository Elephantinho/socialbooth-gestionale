import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEconomiaPeriodo } from '@/modules/costi/api'
import { contiEvento, contiPer, contiPerRegione, totaleConti } from '@/modules/costi/logic/perRegione'
import { COLORE_COSTI, COLORE_RICAVI, GraficoAndamento } from '@/modules/costi/components/GraficoAndamento'
import { chiaveMese } from '@/shared/lib/periodi'
import { Classifiche } from './Classifiche'
import { dataBreve, euro, nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Numero } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

const periodi = [
  { id: 'mese', etichetta: 'Questo mese', mesi: () => 1 },
  { id: 'trimestre', etichetta: 'Ultimi 3 mesi', mesi: () => 3 },
  { id: 'anno', etichetta: "Quest'anno", mesi: () => new Date().getMonth() + 1 },
  { id: '12', etichetta: 'Ultimi 12 mesi', mesi: () => 12 },
] as const

const percentuale = (margine: number, ricavi: number) => (ricavi > 0 ? `${Math.round((margine / ricavi) * 100)}%` : '—')

/** Com'è andata: ricavi, costi e margini del periodo, per mese, regione, operatore e cliente */
export function Passato() {
  const [periodo, setPeriodo] = useState<(typeof periodi)[number]['id']>('mese')
  const mesi = periodi.find((p) => p.id === periodo)!.mesi()
  const { data, isPending, error } = useEconomiaPeriodo(mesi)
  const [aperta, setAperta] = useState<string>()

  const righe = useMemo(() => contiPerRegione(data ?? []), [data])
  const totale = totaleConti(righe)
  const perMese = useMemo(() => {
    const m = contiPer(data ?? [], (e) => chiaveMese(e.allestimento_il))
    const oggi = new Date()
    return Array.from({ length: mesi }, (_, i) => {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - (mesi - 1) + i, 1)
      const c = m.get(d.toLocaleDateString('sv-SE').slice(0, 7))
      return {
        mese: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
        ricavi: Math.round(c?.ricavi ?? 0), costi: Math.round(c?.costiTotali ?? 0), margine: Math.round(c?.margine ?? 0),
      }
    })
  }, [data, mesi])
  const grafico = righe.map((r) => ({ regione: r.regione, ricavi: Math.round(r.ricavi), costi: Math.round(r.costiTotali) }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex rounded-md bg-superficie border border-bordo p-1 w-fit flex-wrap" role="tablist">
        {periodi.map((p) => (
          <button key={p.id} role="tab" aria-selected={periodo === p.id} onClick={() => setPeriodo(p.id)}
            className={cn('h-9 px-4 rounded-[5px] text-sm font-semibold cursor-pointer', periodo === p.id ? 'bg-inchiostro text-white' : 'text-tenue')}>
            {p.etichetta}
          </button>
        ))}
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !righe.length ? (
        <Card><Vuoto titolo="Nessun evento in questo periodo" /></Card>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
            <Numero valore={euro(Math.round(totale.ricavi))} etichetta="ricavi" tono="accento" />
            <Numero valore={euro(Math.round(totale.compensi))} etichetta="compensi operatori" />
            <Numero valore={euro(Math.round(totale.altriCosti))} etichetta="altri costi" />
            <Numero valore={euro(Math.round(totale.margine))} etichetta={`margine, ${percentuale(totale.margine, totale.ricavi)}`} tono={totale.margine < 0 ? 'urgente' : 'scuro'} />
          </div>

          {mesi > 1 && (
            <Card className="p-5 flex flex-col gap-3">
              <TitoloSezione>Mese per mese</TitoloSezione>
              <GraficoAndamento dati={perMese} />
            </Card>
          )}

          <Card className="p-5 flex flex-col gap-3">
            <TitoloSezione>Ricavi e costi per regione</TitoloSezione>
            <div style={{ height: Math.max(220, grafico.length * 56) }} role="img" aria-label="Ricavi e costi per regione">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grafico} layout="vertical" barGap={2} barCategoryGap="24%" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#E3E1DB" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#5E5F66', fontSize: 12 }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k €` : `${v} €`)} />
                  <YAxis type="category" dataKey="regione" width={120} tickLine={false} axisLine={false} tick={{ fill: '#15161A', fontSize: 13, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: 'rgba(21,22,26,0.05)' }} formatter={(v) => euro(Number(v))}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E3E1DB', fontWeight: 600 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 700 }} />
                  <Bar dataKey="ricavi" name="Ricavi" fill={COLORE_RICAVI} radius={[0, 4, 4, 0]} maxBarSize={22} />
                  <Bar dataKey="costi" name="Costi" fill={COLORE_COSTI} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-bordo">
              <TitoloSezione>Dettaglio</TitoloSezione>
              <p className="text-sm text-tenue mt-1">Clicca una regione per vedere i suoi eventi. Eventi chiusi con i valori finali, gli altri con quelli previsti.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-tenue bg-sfondo">
                    {['Regione', 'Eventi', 'Ricavi', 'Compensi', 'Altri costi', 'Costi totali', 'Margine', '%'].map((c, i) => (
                      <th key={c} className={cn('px-4 py-3 font-semibold whitespace-nowrap', i > 0 && 'text-right')}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => (
                    <Fragment key={r.regione}>
                      <tr className="border-t border-bordo hover:bg-sfondo/60 cursor-pointer" onClick={() => setAperta((a) => (a === r.regione ? undefined : r.regione))}
                        aria-expanded={aperta === r.regione}>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5"><ChevronDown className={cn('size-4 transition', aperta === r.regione && 'rotate-180')} aria-hidden />{r.regione}</span>
                        </td>
                        <td className="px-4 py-3 text-right">{r.eventi}</td>
                        <td className="px-4 py-3 text-right font-semibold">{euro(Math.round(r.ricavi))}</td>
                        <td className="px-4 py-3 text-right">{euro(Math.round(r.compensi))}</td>
                        <td className="px-4 py-3 text-right">{euro(Math.round(r.altriCosti))}</td>
                        <td className="px-4 py-3 text-right font-semibold">{euro(Math.round(r.costiTotali))}</td>
                        <td className={cn('px-4 py-3 text-right font-semibold', r.margine < 0 ? 'text-urgente-testo' : 'text-accento')}>{euro(Math.round(r.margine))}</td>
                        <td className="px-4 py-3 text-right text-tenue">{percentuale(r.margine, r.ricavi)}</td>
                      </tr>
                      {aperta === r.regione && (data ?? []).filter((e) => e.regione === r.regione).map((e) => {
                        const c = contiEvento(e)
                        return (
                          <tr key={e.id} className="bg-sfondo/50 border-t border-bordo/60 text-[13px]">
                            <td className="pl-10 pr-4 py-2">
                              <Link to={`/gestione/eventi/${e.id}`} className="font-semibold hover:underline">{dataBreve(e.allestimento_il)}, {e.citta}</Link>
                              <span className="block text-xs text-tenue">{e.tipo_booth?.nome ?? 'Evento'}{e.operatore ? `, ${nomeCompleto(e.operatore)}` : ''}{e.cliente ? `, ${e.cliente.nome}` : ''}</span>
                            </td>
                            <td />
                            <td className="px-4 py-2 text-right">{c.ricavi ? euro(c.ricavi) : <span className="text-tenue">manca</span>}</td>
                            <td className="px-4 py-2 text-right">{euro(c.compensi)}</td>
                            <td className="px-4 py-2 text-right">{euro(c.altriCosti)}</td>
                            <td className="px-4 py-2 text-right">{euro(c.costiTotali)}</td>
                            <td className={cn('px-4 py-2 text-right font-semibold', c.margine < 0 ? 'text-urgente-testo' : '')}>{euro(c.margine)}</td>
                            <td />
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                  <tr className="border-t-2 border-inchiostro bg-inchiostro text-white font-semibold">
                    <td className="px-4 py-3">Totale</td>
                    <td className="px-4 py-3 text-right">{totale.eventi}</td>
                    <td className="px-4 py-3 text-right">{euro(Math.round(totale.ricavi))}</td>
                    <td className="px-4 py-3 text-right">{euro(Math.round(totale.compensi))}</td>
                    <td className="px-4 py-3 text-right">{euro(Math.round(totale.altriCosti))}</td>
                    <td className="px-4 py-3 text-right">{euro(Math.round(totale.costiTotali))}</td>
                    <td className={cn('px-4 py-3 text-right', totale.margine < 0 ? 'text-[#FF9C7A]' : 'text-accento-chiaro')}>{euro(Math.round(totale.margine))}</td>
                    <td className="px-4 py-3 text-right">{percentuale(totale.margine, totale.ricavi)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Classifiche eventi={data ?? []} />
        </>
      )}
    </div>
  )
}
