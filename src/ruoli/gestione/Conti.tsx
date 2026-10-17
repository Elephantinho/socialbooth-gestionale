import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useContiMese, useEventiVicini, usePagamentiDaControllare, useSistemaPagamento } from '@/modules/conti/api'
import { VOCI, bilancio, etichettaVoce, euro, type Voce } from '@/modules/conti/conti'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

const meseDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const sposta = (m: string, n: number) => { const [a, x] = m.split('-').map(Number); return meseDi(new Date(a, x - 1 + n, 1)) }
const nomeMese = (m: string) => { const t = new Date(`${m}-15T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1) }

type Dati = NonNullable<ReturnType<typeof useContiMese>['data']>
type Riga = { e: Dati[number]; conti: { prezzo: number | null; fattura_numero: string | null; fattura_importo: number | null; incassata: boolean } | null } & ReturnType<typeof bilancio>
type Vista = 'eventi' | 'operatori' | 'voci' | 'pagamenti'

/** Ricavi, costi e margini del mese, letti per evento, per operatore e per voce di spesa. */
export function Conti() {
  const { ruolo } = useProfilo()
  const amministra = ruolo === 'admin' || ruolo === 'amministrazione'
  const [parametri, setParametri] = useSearchParams()
  const mese = parametri.get('mese') ?? meseDi(new Date())
  const vista = (parametri.get('vista') as Vista) ?? 'eventi'
  const imposta = (k: string, v: string) => { const p = new URLSearchParams(parametri); p.set(k, v); setParametri(p, { replace: true }) }
  const { data, isPending, error } = useContiMese(mese)
  const daControllare = usePagamentiDaControllare()
  const nControllare = amministra ? daControllare.data?.length ?? 0 : 0

  const righe: Riga[] = (data ?? []).map((e) => {
    const conti = Array.isArray(e.conti) ? e.conti[0] ?? null : e.conti
    return { e, conti, ...bilancio(conti, e.spese ?? []) }
  })
  const ricavi = righe.reduce((t, r) => t + (r.ricavo ?? 0), 0)
  const costi = righe.reduce((t, r) => t + r.costi, 0)
  const margine = ricavi - costi
  const senzaPrezzo = righe.filter((r) => r.ricavo == null).length
  const daFatturare = righe.filter((r) => r.e.stato === 'completato' && !r.conti?.fattura_numero)
  const daIncassare = righe.filter((r) => r.conti?.fattura_numero && !r.conti.incassata)
  const incassato = righe.filter((r) => r.conti?.incassata).reduce((t, r) => t + (r.ricavo ?? 0), 0)

  const viste: { id: Vista; testo: string; n?: number }[] = [
    { id: 'eventi', testo: 'Per evento' },
    { id: 'operatori', testo: 'Per operatore' },
    { id: 'voci', testo: 'Dove vanno i soldi' },
    ...(amministra ? [{ id: 'pagamenti' as const, testo: 'Pagamenti da controllare', n: nControllare }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo={ruolo === 'project' ? 'I miei conti' : 'Conti'} />

      <div className="flex items-center gap-1.5 -mt-2">
        <button onClick={() => imposta('mese', sposta(mese, -1))} aria-label="Mese prima" className="size-10 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p className="text-lg font-semibold min-w-44 text-center">{nomeMese(mese)}</p>
        <button onClick={() => imposta('mese', sposta(mese, 1))} aria-label="Mese dopo" className="size-10 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <>
          {/* Le quattro cifre del mese */}
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
            <Riquadro etichetta="Ricavi" valore={euro(ricavi)} nota={senzaPrezzo ? `${senzaPrezzo} eventi senza prezzo` : `${righe.length} eventi`} rossa={senzaPrezzo > 0} />
            <Riquadro etichetta="Costi" valore={euro(costi)} nota={ricavi ? `${Math.round((costi / ricavi) * 100)}% dei ricavi` : undefined} />
            <Riquadro etichetta="Margine" valore={euro(margine)} nota={ricavi ? `resta il ${Math.round((margine / ricavi) * 100)}%` : undefined} tono={margine >= 0 ? 'ok' : 'male'} />
            <Riquadro etichetta="Incassato" valore={euro(incassato)}
              nota={daFatturare.length ? `${daFatturare.length} conclusi da fatturare` : daIncassare.length ? `${euro(daIncassare.reduce((t, r) => t + (r.ricavo ?? 0), 0))} da incassare` : 'Tutto incassato'}
              rossa={daFatturare.length > 0} />
          </div>
          <BarraMese ricavi={ricavi} costi={costi} incassato={incassato} />

          <div className="flex gap-1 border-b border-bordo overflow-x-auto" role="tablist">
            {viste.map((v) => (
              <button key={v.id} role="tab" aria-selected={vista === v.id} onClick={() => imposta('vista', v.id)}
                className={cn('h-11 px-4 -mb-px border-b-2 text-sm font-semibold whitespace-nowrap cursor-pointer flex items-center gap-2',
                  vista === v.id ? 'border-inchiostro text-inchiostro' : 'border-transparent text-tenue hover:text-inchiostro')}>
                {v.testo}
                {v.n ? <span className="text-xs bg-urgente text-white rounded-full px-1.5 min-w-5 text-center">{v.n}</span> : null}
              </button>
            ))}
          </div>

          {vista === 'pagamenti' && amministra ? <Pagamenti />
            : righe.length === 0 ? <Card><Vuoto titolo="Nessun evento in questo mese" /></Card>
            : vista === 'operatori' ? <PerOperatore righe={righe} />
            : vista === 'voci' ? <PerVoce righe={righe} />
            : <PerEvento righe={righe} conProject={ruolo !== 'project'} />}
        </>
      )}
    </div>
  )
}

function Riquadro({ etichetta, valore, nota, tono, rossa }: { etichetta: string; valore: string; nota?: string; tono?: 'ok' | 'male'; rossa?: boolean }) {
  return (
    <Card className={cn('p-5', tono === 'ok' && 'bg-ok-tenue border-ok/20', tono === 'male' && 'bg-urgente-tenue border-urgente/20')}>
      <p className="text-sm font-semibold text-tenue">{etichetta}</p>
      <p className={cn('text-[28px] font-semibold tabular-nums leading-tight mt-1', tono === 'ok' && 'text-ok', tono === 'male' && 'text-urgente-testo')}>{valore}</p>
      {nota && <p className={cn('text-sm mt-1', rossa ? 'text-urgente-testo font-semibold' : 'text-tenue')}>{nota}</p>}
    </Card>
  )
}

/** Una barra sola: quanto dei ricavi se ne va in costi, quanto resta, quanto è già in cassa */
function BarraMese({ ricavi, costi, incassato }: { ricavi: number; costi: number; incassato: number }) {
  if (!ricavi) return null
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / ricavi) * 100))}%`
  return (
    <div className="flex flex-col gap-1.5 -mt-2">
      <div className="h-3 rounded-full bg-ok/25 overflow-hidden flex" role="img" aria-label={`Costi ${euro(costi)} su ricavi ${euro(ricavi)}`}>
        <span className="bg-urgente/70 h-full" style={{ width: pct(costi) }} />
        <span className="bg-ok h-full" style={{ width: pct(Math.max(0, ricavi - costi)) }} />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-tenue">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-urgente/70" />Costi</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ok" />Margine</span>
        <span>Incassato {Math.round((incassato / ricavi) * 100)}% dei ricavi</span>
      </div>
    </div>
  )
}

/* ---------- Per evento ---------- */
function PerEvento({ righe, conProject }: { righe: Riga[]; conProject: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[15px] min-w-[760px]">
          <thead className="bg-sfondo text-xs text-tenue">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-3 py-3 font-semibold">Evento</th>
              {conProject && <th className="px-3 py-3 font-semibold">Project</th>}
              <th className="px-3 py-3 font-semibold text-right">Ricavo</th>
              <th className="px-3 py-3 font-semibold text-right">Costi</th>
              <th className="px-3 py-3 font-semibold text-right">Margine</th>
              <th className="px-4 py-3 font-semibold text-right">Fattura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {righe.map(({ e, conti, ricavo, costi, margine, percentuale }) => (
              <tr key={e.id} className="hover:bg-sfondo/60">
                <td className="px-4 py-3 whitespace-nowrap text-tenue">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })}</td>
                <td className="px-3 py-3 max-w-72">
                  <Link to={`/gestione/eventi/${e.id}`} className="font-semibold hover:underline block truncate">{nomeEvento(e)}</Link>
                  <span className="text-sm text-tenue">{e.citta}{e.operatore ? `, ${nomeCompleto(e.operatore)}` : ''}</span>
                </td>
                {conProject && <td className="px-3 py-3 text-tenue whitespace-nowrap">{e.project ? nomeCompleto(e.project) : '—'}</td>}
                <td className={cn('px-3 py-3 text-right tabular-nums', ricavo == null && 'text-urgente-testo font-semibold')}>{ricavo == null ? 'manca' : euro(ricavo)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{euro(costi)}</td>
                <td className={cn('px-3 py-3 text-right tabular-nums font-semibold', margine != null && (margine >= 0 ? 'text-ok' : 'text-urgente-testo'))}>
                  {euro(margine)}{percentuale != null && <span className="block text-xs font-medium text-tenue">{percentuale}%</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap"><StatoFattura stato={e.stato} conti={conti} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function StatoFattura({ stato, conti }: { stato: string; conti: Riga['conti'] }) {
  const p = 'text-xs font-semibold rounded-full px-2.5 py-1'
  if (conti?.incassata) return <span className={cn(p, 'bg-ok-tenue text-ok')}>Incassata</span>
  if (conti?.fattura_numero) return <span className={cn(p, 'bg-avviso text-avviso-testo')}>N. {conti.fattura_numero}, da incassare</span>
  if (stato === 'completato') return <span className={cn(p, 'bg-urgente-tenue text-urgente-testo')}>Da fatturare</span>
  return <span className="text-xs text-tenue">evento da fare</span>
}

/* ---------- Per operatore ---------- */
function PerOperatore({ righe }: { righe: Riga[] }) {
  type Op = { nome: string; eventi: number; carta: number; tasca: number }
  const ops = new Map<string, Op>()
  const prendi = (id: string, nome: string) => ops.get(id) ?? ops.set(id, { nome, eventi: 0, carta: 0, tasca: 0 }).get(id)!
  for (const { e } of righe) {
    if (!e.operatore) continue
    const o = prendi(e.operatore.id, nomeCompleto(e.operatore))
    o.eventi += 1
    for (const s of e.spese ?? []) {
      if (s.operatore_id !== e.operatore.id) continue
      if (s.pagata_con === 'carta_aziendale') o.carta += Number(s.importo)
      if (s.pagata_con === 'operatore') o.tasca += Number(s.importo)
    }
  }
  const elenco = [...ops.entries()].sort((a, b) => (b[1].carta + b[1].tasca) - (a[1].carta + a[1].tasca))
  if (!elenco.length) return <Card><Vuoto titolo="Nessun operatore ha lavorato in questo mese" /></Card>
  const daRimborsare = elenco.reduce((t, [, o]) => t + o.tasca, 0)

  return (
    <div className="flex flex-col gap-3">
      {daRimborsare > 0 && (
        <p className="rounded-lg border-l-4 border-avviso-icona bg-avviso px-4 py-3 text-[15px]">
          <span className="font-semibold text-avviso-titolo">{euro(daRimborsare)} da rimborsare</span>
          <span className="text-avviso-testo">: spese pagate di tasca dagli operatori.</span>
        </p>
      )}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] min-w-[620px]">
            <thead className="bg-sfondo text-xs text-tenue">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Operatore</th>
                <th className="px-3 py-3 font-semibold text-right">Eventi</th>
                <th className="px-3 py-3 font-semibold text-right">Con la carta aziendale</th>
                <th className="px-3 py-3 font-semibold text-right">Di tasca (da rimborsare)</th>
                <th className="px-4 py-3 font-semibold text-right">Spese in media a evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordo">
              {elenco.map(([id, o]) => (
                <tr key={id} className="hover:bg-sfondo/60">
                  <td className="px-4 py-3 font-semibold">{o.nome}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{o.eventi}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{euro(o.carta)}</td>
                  <td className={cn('px-3 py-3 text-right tabular-nums', o.tasca > 0 && 'font-semibold text-avviso-testo')}>{euro(o.tasca)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-tenue">{euro((o.carta + o.tasca) / o.eventi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-sm text-tenue">I compensi (ore lavorate per tariffa) si aggiungeranno qui quando arriveranno le ore del mese.</p>
    </div>
  )
}

/* ---------- Dove vanno i soldi ---------- */
function PerVoce({ righe }: { righe: Riga[] }) {
  const tot = new Map<Voce, number>()
  for (const { e } of righe) for (const s of e.spese ?? []) tot.set(s.voce, (tot.get(s.voce) ?? 0) + Number(s.importo))
  const totale = [...tot.values()].reduce((a, b) => a + b, 0)
  if (!totale) return <Card><Vuoto titolo="Nessuna spesa in questo mese" /></Card>
  const voci = VOCI.map((v) => ({ ...v, n: tot.get(v.id) ?? 0 })).filter((v) => v.n > 0).sort((a, b) => b.n - a.n)
  const max = voci[0].n

  return (
    <Card className="p-5 md:p-6 flex flex-col gap-4">
      <p className="text-[15px] text-tenue">Spese del mese divise per voce: <span className="font-semibold text-inchiostro">{euro(totale)}</span> in tutto.</p>
      <ul className="flex flex-col gap-3">
        {voci.map((v) => (
          <li key={v.id} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
            <span className="text-[15px] font-semibold">{etichettaVoce(v.id)}</span>
            <span className="h-3 rounded-full bg-sfondo overflow-hidden"><span className="block h-full rounded-full bg-inchiostro/80" style={{ width: `${(v.n / max) * 100}%` }} /></span>
            <span className="text-[15px] tabular-nums text-right w-40">{euro(v.n)} <span className="text-tenue text-sm">{Math.round((v.n / totale) * 100)}%</span></span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ---------- Pagamenti arrivati dalla banca da sistemare ---------- */
function Pagamenti() {
  const { data, isPending, error } = usePagamentiDaControllare()
  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />
  if (!data.length) return (
    <Card className="p-6 flex items-start gap-3">
      <CreditCard className="size-6 text-ok shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Niente da controllare</p>
        <p className="text-sm text-tenue mt-1">I pagamenti delle carte aziendali si abbinano da soli all'operatore e all'evento. Qui finiscono solo quelli dubbi.</p>
      </div>
    </Card>
  )
  return (
    <Card className="overflow-visible">
      <ul className="divide-y divide-bordo">
        {data.map((p) => <Pagamento key={p.id} p={p} />)}
      </ul>
    </Card>
  )
}

function Pagamento({ p }: { p: NonNullable<ReturnType<typeof usePagamentiDaControllare>['data']>[number] }) {
  const [evento, setEvento] = useState('')
  const vicini = useEventiVicini(p.pagato_il, p.operatore?.id ?? null)
  const sistema = useSistemaPagamento()
  return (
    <li className="px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex-1 min-w-56">
        <p className="font-semibold">{p.esercente ?? 'Pagamento'} <span className="tabular-nums">{euro(p.importo)}</span></p>
        <p className="text-sm text-tenue">
          {new Date(p.pagato_il).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {p.carta_ultime ? `, carta ••${p.carta_ultime}` : ''}{p.operatore ? `, ${nomeCompleto(p.operatore)}` : ''}
        </p>
        {p.motivo && <p className="text-sm font-semibold text-avviso-testo mt-0.5">{p.motivo}</p>}
      </div>
      {p.importo > 0 && (
        <select value={evento} onChange={(e) => setEvento(e.target.value)} aria-label="Evento"
          className="h-10 rounded-lg border border-bordo-forte bg-superficie px-3 text-sm max-w-72">
          <option value="">Scegli l'evento…</option>
          {(vicini.data ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {new Date(e.allestimento_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}, {nomeEvento(e)}, {e.citta}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        {p.importo > 0 && <Pulsante disabled={!evento} caricamento={sistema.isPending && !!sistema.variables?.eventoId} onClick={() => sistema.mutate({ id: p.id, eventoId: evento })}>Abbina</Pulsante>}
        <Pulsante variante="secondario" caricamento={sistema.isPending && !sistema.variables?.eventoId} onClick={() => sistema.mutate({ id: p.id })}>Non è di un evento</Pulsante>
      </div>
      {sistema.error && <div className="basis-full"><Errore errore={sistema.error} /></div>}
    </li>
  )
}
