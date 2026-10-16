import { useSearchParams } from 'react-router-dom'
import { numeroCsv, scaricaCsv } from '@/shared/lib/csv'
import { usePuo } from '@/modules/auth/permessi'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useApprovaOre, useReportOre } from '@/modules/eventi/api'
import type { RigaReport } from '@/modules/eventi/types'
import { dataBreve, durata, euro, meseCorrente } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

/** Spese anticipate dall'operatore su quell'evento: vanno rimborsate insieme al compenso */
const speseApprovabili = (r: RigaReport) =>
  (r.evento?.costi ?? [])
    .filter((c) => c.fase === 'finale' && c.pagato_con === 'operatore' && c.operatore_id === r.operatore_id && c.stato !== 'respinto')
    .reduce((t, c) => t + Number(c.importo ?? 0), 0)

export function ReportOre() {
  const [parametri] = useSearchParams()
  const [mese, setMese] = useState(parametri.get('mese') ?? meseCorrente())
  const { data, isPending, error } = useReportOre(mese)

  const righe = data ?? []
  const perOperatore = Object.values(
    righe.reduce<Record<string, { nome: string; righe: RigaReport[] }>>((acc, r) => {
      const k = r.operatore_id
      acc[k] ??= { nome: r.operatore?.nome || 'Operatore', righe: [] }
      acc[k].righe.push(r)
      return acc
    }, {}),
  ).sort((a, b) => a.nome.localeCompare(b.nome))

  const daApprovare = righe.filter((r) => r.stato === 'inviato').length
  const profilo = useProfilo()
  const approvaTutte = useApprovaOre()

  function esportaCsv() {
    scaricaCsv(`ore-${mese}.csv`,
      ['Operatore', 'Data', 'Evento', 'Città', 'Regione', 'Ore location', 'Ore viaggio', 'Ore totali', 'Tariffa', 'Compenso', 'Rimborsi', 'Stato'],
      righe.map((r) => [
        r.operatore?.nome ?? '', r.evento ? new Date(r.evento.allestimento_il).toLocaleDateString('it-IT') : '',
        r.evento?.tipo_booth?.nome ?? '', r.evento?.citta ?? '', r.evento?.regione ?? '',
        numeroCsv(r.minuti_in_location / 60), numeroCsv(r.minuti_viaggio / 60), numeroCsv((r.minuti_totali ?? 0) / 60),
        numeroCsv(r.tariffa_oraria), numeroCsv(r.compenso), numeroCsv(speseApprovabili(r)), r.stato,
      ]))
  }

  const tutti = usePuo()('eventi.tutti')
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <h1 className="font-display text-[30px] md:text-[34px] font-semibold leading-tight">Ore, costi e compensi</h1>
          <p className="text-tenue mt-2">
            {tutti ? 'Le chiusure da approvare e le ore di ogni operatore' : 'Le chiusure dei tuoi eventi'} (location + viaggio × tariffa). I conti per regione sono in Andamento.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-tenue">
            Mese
            <input type="month" value={mese} onChange={(e) => setMese(e.target.value)}
              className="h-12 rounded-lg border border-bordo-forte bg-superficie px-3 text-[15px]" />
          </label>
          <Pulsante taglia="lg" variante="secondario" icona={<Download className="size-4" aria-hidden />} onClick={esportaCsv} disabled={!righe.length}>
            Esporta Excel (CSV)
          </Pulsante>
        </div>
      </div>


      {daApprovare > 0 && (
        <Card tono="avviso" className="p-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold text-avviso-titolo">{daApprovare} chiusure evento da approvare</span>
          <Pulsante variante="scuro" caricamento={approvaTutte.isPending} onClick={() => {
            if (!confirm(`Approvare tutte le ${daApprovare} chiusure del mese, con le relative spese?`)) return
            for (const r of righe.filter((x) => x.stato === 'inviato' && x.evento)) {
              approvaTutte.mutate({ oreId: r.id, eventoId: r.evento!.id, approva: true, approvatoDa: profilo.id })
            }
          }}>Approva tutte</Pulsante>
        </Card>
      )}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !perOperatore.length ? (
        <Card><Vuoto titolo="Nessuna ora in questo mese" testo="Le ore compaiono quando l'operatore chiude l'evento dall'app." /></Card>
      ) : perOperatore.map((op) => <BloccoOperatore key={op.nome} nome={op.nome} righe={op.righe} />)}
    </div>
  )
}

function BloccoOperatore({ nome, righe }: { nome: string; righe: RigaReport[] }) {
  const valide = righe.filter((r) => r.stato !== 'respinto')
  const minuti = valide.reduce((s, r) => s + (r.minuti_totali ?? 0), 0)
  const compenso = valide.reduce((s, r) => s + (r.compenso ?? 0), 0)
  const spese = valide.reduce((s, r) => s + speseApprovabili(r), 0)

  return (
    <Card className="overflow-hidden">
      <div className="p-5 flex flex-wrap justify-between items-center gap-4 bg-evidenza border-b border-evidenza-bordo">
        <TitoloSezione>{nome}</TitoloSezione>
        <div className="flex gap-5 flex-wrap text-sm">
          <span><span className="text-su-scuro-tenue">Eventi </span><strong>{valide.length}</strong></span>
          <span><span className="text-su-scuro-tenue">Ore </span><strong>{durata(minuti)}</strong></span>
          <span><span className="text-su-scuro-tenue">Compenso </span><strong>{euro(compenso)}</strong></span>
          <span><span className="text-su-scuro-tenue">Rimborsi </span><strong>{euro(spese)}</strong></span>
          <span className="text-accento"><span className="opacity-80">Totale </span><strong>{euro(compenso + spese)}</strong></span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-tenue border-b border-bordo">
              {['Data', 'Evento', 'Location', 'Viaggio', 'Totale', 'Compenso', 'Rimborsi', ''].map((h) => <th key={h} className="px-5 py-3 font-semibold whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => <RigaTabella key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function RigaTabella({ r }: { r: RigaReport }) {
  const profilo = useProfilo()
  const approva = useApprovaOre()
  return (
    <tr className={cn('border-b border-bordo last:border-0', r.stato === 'respinto' && 'opacity-50 line-through')}>
      <td className="px-5 py-3 whitespace-nowrap font-semibold">{r.evento ? dataBreve(r.evento.allestimento_il) : '—'}</td>
      <td className="px-5 py-3 whitespace-nowrap">
        {r.evento ? (
          <>
            <Link to={`/gestione/eventi/${r.evento.id}`} className="font-semibold hover:underline">{r.evento.tipo_booth?.nome ?? 'Evento'}, {r.evento.citta}</Link>
            <span className="text-xs text-tenue"> {r.evento.regione}</span>
          </>
        ) : '—'}
      </td>
      <td className="px-5 py-3 whitespace-nowrap">{durata(r.minuti_in_location)}</td>
      <td className="px-5 py-3 whitespace-nowrap">{durata(r.minuti_viaggio)}</td>
      <td className="px-5 py-3 whitespace-nowrap font-semibold">{durata(r.minuti_totali)}</td>
      <td className="px-5 py-3 whitespace-nowrap font-semibold">{euro(r.compenso)}</td>
      <td className="px-5 py-3 whitespace-nowrap">{euro(speseApprovabili(r))}</td>
      <td className="px-5 py-3 whitespace-nowrap text-right">
        {r.stato === 'inviato' ? (
          <Pulsante icona={<Check className="size-4" aria-hidden />} caricamento={approva.isPending}
            onClick={() => r.evento && approva.mutate({ oreId: r.id, eventoId: r.evento.id, approva: true, approvatoDa: profilo.id })}>
            Approva
          </Pulsante>
        ) : (
          <span className={cn('text-xs font-semibold', r.stato === 'approvato' ? 'text-accento' : 'text-urgente-testo')}>
            {r.stato === 'approvato' ? 'Approvate' : 'Respinte'}
          </span>
        )}
      </td>
    </tr>
  )
}
