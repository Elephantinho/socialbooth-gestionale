import { usePuo } from '@/modules/auth/permessi'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Printer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEconomiaFutura } from '@/modules/costi/api'
import { previsioneEvento, previsionePer, totalePrevisione } from '@/modules/costi/logic/previsione'
import { COLORE_COSTI, COLORE_RICAVI } from '@/modules/costi/components/GraficoAndamento'
import { useScorteVisibili } from '@/modules/carta/api'
import { confezioniPer } from '@/modules/carta/logic/scorta'
import { chiaveMese, etichettaMese } from '@/shared/lib/periodi'
import { dataBreve, euro, nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Numero } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

const periodi = [
  { mesi: 1, etichetta: 'Fino a fine mese' },
  { mesi: 3, etichetta: 'Prossimi 3 mesi' },
  { mesi: 6, etichetta: 'Prossimi 6 mesi' },
  { mesi: 12, etichetta: 'Prossimi 12 mesi' },
] as const

const percentuale = (margine: number, ricavi: number) => (ricavi > 0 ? `${Math.round((margine / ricavi) * 100)}%` : '—')
const tondo = (n: number) => euro(Math.round(n))

/** Cosa arriva: costi e ricavi previsti degli eventi già inseriti */
export function Futuro() {
  const [mesi, setMesi] = useState<number>(3)
  const [vista, setVista] = useState<'mese' | 'regione' | 'evento'>('mese')
  const { data, isPending, error } = useEconomiaFutura(mesi)
  const carta = useScorteVisibili()
  const puo = usePuo()

  const parametri = data && { tariffaMedia: data.tariffaMedia, costoStampa: data.costoStampa, mediaStampe: data.mediaStampe }
  const perMese = useMemo(() => (data && parametri ? previsionePer(data.eventi, parametri, (e) => chiaveMese(e.allestimento_il)) : []), [data])
  const perRegione = useMemo(() => (data && parametri
    ? previsionePer(data.eventi, parametri, (e) => e.regione).sort((a, b) => b.costiTotali - a.costiTotali) : []), [data])
  const totale = totalePrevisione(perMese)

  const stampeNecessarie = Math.round(totale.stampe)
  const stampeInGiro = (carta.data ?? []).reduce((s, o) => s + o.disponibili, 0)
  const mancanti = Math.max(0, stampeNecessarie - stampeInGiro)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex rounded-xl bg-superficie border border-bordo p-1 w-fit flex-wrap" role="tablist">
        {periodi.map((p) => (
          <button key={p.mesi} role="tab" aria-selected={mesi === p.mesi} onClick={() => setMesi(p.mesi)}
            className={cn('h-9 px-4 rounded-[9px] text-sm font-bold cursor-pointer', mesi === p.mesi ? 'bg-inchiostro text-white' : 'text-tenue')}>
            {p.etichetta}
          </button>
        ))}
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !data.eventi.length ? (
        <Card><Vuoto titolo="Nessun evento in programma" testo="Appena inserite un evento, qui vedete quanto costerà." /></Card>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            <Numero valore={totale.eventi} etichetta="eventi in programma" />
            <Numero valore={tondo(totale.ricavi)} etichetta="ricavi previsti" tono="accento" />
            <Numero valore={tondo(totale.compensi)} etichetta="compensi operatori" />
            <Numero valore={tondo(totale.carta)} etichetta="carta" />
            <Numero valore={tondo(totale.altriCosti - totale.carta)} etichetta="altri costi" />
            <Numero valore={tondo(totale.margine)} etichetta={`margine · ${percentuale(totale.margine, totale.ricavi)}`} tono={totale.margine < 0 ? 'urgente' : 'scuro'} />
          </div>

          {(totale.senzaPrezzo > 0 || totale.senzaOperatore > 0 || !data.costoStampa) && (
            <Card tono="avviso" className="p-4 flex gap-3 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-avviso-icona" aria-hidden />
              <ul className="flex flex-col gap-1 font-semibold">
                {totale.senzaPrezzo > 0 && <li>{totale.senzaPrezzo} eventi senza prezzo cliente: i ricavi sono sottostimati.</li>}
                {totale.senzaOperatore > 0 && (
                  <li>{totale.senzaOperatore} eventi senza operatore: compenso stimato con la tariffa media{data.tariffaMedia ? ` (${euro(data.tariffaMedia)}/h)` : ''}.</li>
                )}
                {!data.costoStampa && <li>Costo della confezione di carta non impostato: {puo('impostazioni') ? <Link to="/gestione/impostazioni" className="underline">impostalo qui</Link> : "chiedi all'admin di impostarlo"}.</li>}
              </ul>
            </Card>
          )}

          <Card className={cn('p-5 flex flex-wrap items-center gap-4', mancanti > 0 && 'border-2 border-[#E03E3E]')}>
            <Printer className={cn('size-6', mancanti > 0 ? 'text-[#C62828]' : 'text-accento')} aria-hidden />
            <div className="flex-1 min-w-56">
              <p className="font-bold">
                {data.mediaStampe ? `Servono circa ${stampeNecessarie.toLocaleString('it-IT')} stampe` : 'Ancora nessuna media di stampe per evento'}
                {data.mediaStampe ? ` (${data.mediaStampe} a evento)` : ''}
              </p>
              <p className="text-sm text-tenue">
                Gli operatori ne hanno {stampeInGiro.toLocaleString('it-IT')} in totale.
                {mancanti > 0 && carta.parametri && ((n) => ` Da comprare: ${n} confezion${n === 1 ? 'e' : 'i'}.`)(confezioniPer(mancanti, carta.parametri.perConfezione))}
              </p>
            </div>
            {puo('carta.ricarica') && <Link to="/gestione/panoramica" className="text-sm font-bold text-accento hover:underline">Carta per operatore →</Link>}
          </Card>

          <Card className="p-5 flex flex-col gap-3">
            <TitoloSezione>Ricavi e costi previsti per mese</TitoloSezione>
            <div className="h-64" role="img" aria-label="Ricavi e costi previsti per mese">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perMese.map((m) => ({ mese: etichettaMese(m.chiave), ricavi: Math.round(m.ricavi), costi: Math.round(m.costiTotali) }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#E3E1DB" />
                  <XAxis dataKey="mese" tickLine={false} axisLine={false} tick={{ fill: '#5E5F66', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: '#5E5F66', fontSize: 12 }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k €` : `${v} €`)} />
                  <Tooltip cursor={{ fill: 'rgba(21,22,26,0.05)' }} formatter={(v) => euro(Number(v))}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E3E1DB', fontWeight: 600 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 700 }} />
                  <Bar dataKey="ricavi" name="Ricavi previsti" fill={COLORE_RICAVI} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="costi" name="Costi previsti" fill={COLORE_COSTI} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-bordo flex flex-wrap items-center justify-between gap-3">
              <TitoloSezione>Dettaglio</TitoloSezione>
              <div className="flex rounded-xl bg-sfondo p-1" role="tablist">
                {(['mese', 'regione', 'evento'] as const).map((k) => (
                  <button key={k} role="tab" aria-selected={vista === k} onClick={() => setVista(k)}
                    className={cn('h-8 px-3 rounded-[9px] text-xs font-bold cursor-pointer', vista === k ? 'bg-inchiostro text-white' : 'text-tenue')}>
                    Per {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-tenue bg-sfondo">
                    {[vista === 'mese' ? 'Mese' : vista === 'regione' ? 'Regione' : 'Evento', 'Eventi', 'Ricavi', 'Compensi', 'Carta', 'Altri costi', 'Costi totali', 'Margine']
                      .map((c, i) => <th key={c} className={cn('px-4 py-3 font-bold whitespace-nowrap', i > 0 && 'text-right')}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {vista === 'evento'
                    ? data.eventi.map((e) => {
                      const c = previsioneEvento(e, parametri!)
                      return (
                        <tr key={e.id} className="border-t border-bordo">
                          <td className="px-4 py-2.5">
                            <Link to={`/gestione/eventi/${e.id}`} className="font-semibold hover:underline whitespace-nowrap">{dataBreve(e.allestimento_il)} · {e.citta}</Link>
                            <span className="block text-xs text-tenue">{e.regione}{e.operatore ? ` · ${nomeCompleto(e.operatore)}` : ' · senza operatore'}</span>
                          </td>
                          <td />
                          <Celle c={c} />
                        </tr>
                      )
                    })
                    : (vista === 'mese' ? perMese : perRegione).map((r) => (
                      <tr key={r.chiave} className="border-t border-bordo">
                        <td className="px-4 py-3 font-bold whitespace-nowrap capitalize">{vista === 'mese' ? etichettaMese(r.chiave) : r.chiave}</td>
                        <td className="px-4 py-3 text-right">{r.eventi}</td>
                        <Celle c={r} />
                      </tr>
                    ))}
                  <tr className="border-t-2 border-inchiostro bg-inchiostro text-white font-bold">
                    <td className="px-4 py-3">Totale</td>
                    <td className="px-4 py-3 text-right">{totale.eventi}</td>
                    <Celle c={totale} scuro />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Celle({ c, scuro }: { c: ReturnType<typeof totalePrevisione>; scuro?: boolean }) {
  return (
    <>
      <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">{c.ricavi ? tondo(c.ricavi) : <span className={scuro ? '' : 'text-tenue'}>—</span>}</td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">{tondo(c.compensi)}</td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">{tondo(c.carta)}</td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">{tondo(c.altriCosti - c.carta)}</td>
      <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">{tondo(c.costiTotali)}</td>
      <td className={cn('px-4 py-2.5 text-right font-bold whitespace-nowrap',
        c.margine < 0 ? (scuro ? 'text-[#FF9C7A]' : 'text-urgente-testo') : scuro ? 'text-accento-chiaro' : 'text-accento')}>{tondo(c.margine)}</td>
    </>
  )
}
