import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useContiPeriodo } from '@/modules/conti/api'
import { bilancio, euro, raggruppa, type EventoConti, type Gruppo, type Per } from '@/modules/conti/conti'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Periodo = 'mese' | 'anno'
const oggi = new Date()
const meseDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const maiuscola = (t: string) => t[0].toUpperCase() + t.slice(1)
const nomeMese = (m: string) => maiuscola(new Date(`${m}-15T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))

const DIVISIONI: Record<Per, string> = { mese: 'Mese', evento: 'Evento', operatore: 'Operatore', regione: 'Regione' }

/**
 * Conti: si sceglie un periodo (un mese o un anno) e come dividerlo (mese, evento, operatore, regione).
 * Una sola tabella, sempre le stesse colonne. Il project vede solo i suoi eventi (lo decide il database).
 */
export function Conti() {
  const { ruolo } = useProfilo()
  const naviga = useNavigate()
  const [par, setPar] = useSearchParams()
  const periodo: Periodo = par.get('periodo') === 'anno' ? 'anno' : 'mese'
  const mese = par.get('mese') ?? meseDi(oggi)
  const anno = Number(par.get('anno') ?? oggi.getFullYear())
  const per: Per = (par.get('per') as Per) ?? (periodo === 'anno' ? 'mese' : 'evento')
  const filtro = { operatore: par.get('operatore'), regione: par.get('regione') }

  const imposta = (modifiche: Record<string, string | null>) => {
    const p = new URLSearchParams(par)
    for (const [k, v] of Object.entries(modifiche)) { if (v == null) p.delete(k); else p.set(k, v) }
    setPar(p, { replace: true })
  }

  const [a, m] = mese.split('-').map(Number)
  const dal = periodo === 'mese' ? new Date(a, m - 1, 1) : new Date(anno, 0, 1)
  const al = periodo === 'mese' ? new Date(a, m, 1) : new Date(anno + 1, 0, 1)
  const { data, isPending, error } = useContiPeriodo(dal, al)

  const eventi = (data ?? [])
    .map((e) => ({ ...e, conti: Array.isArray(e.conti) ? e.conti[0] ?? null : e.conti, spese: e.spese ?? [] }))
    .filter((e) => (!filtro.operatore || e.operatore?.id === filtro.operatore) && (!filtro.regione || e.regione === filtro.regione))
  const totale = raggruppa(eventi as EventoConti[], 'regione').reduce(
    (t, g) => ({ ricavi: t.ricavi + g.ricavi, costi: t.costi + g.costi, senzaPrezzo: t.senzaPrezzo + g.senzaPrezzo, daRimborsare: t.daRimborsare + g.daRimborsare }),
    { ricavi: 0, costi: 0, senzaPrezzo: 0, daRimborsare: 0 })
  const margine = totale.ricavi - totale.costi
  const daFatturare = eventi.filter((e) => e.stato === 'completato' && !e.conti?.fattura_numero).length
  const divisioni = (Object.keys(DIVISIONI) as Per[]).filter((d) => d !== 'mese' || periodo === 'anno')
  const nomeFiltro = filtro.operatore ? eventi[0]?.operatore && nomeCompleto(eventi[0].operatore) : filtro.regione

  /** Clic su una riga: si scende nel dettaglio */
  function apri(g: Gruppo) {
    if (per === 'evento') return naviga(`/gestione/eventi/${g.chiave}`)
    if (per === 'mese') return imposta({ periodo: null, mese: g.chiave, per: 'evento' })
    if (per === 'operatore') return imposta({ operatore: g.chiave === '-' ? null : g.chiave, per: 'evento' })
    imposta({ regione: g.chiave, per: 'evento' })
  }

  return (
    <div className="flex flex-col gap-5">
      <Intestazione titolo={ruolo === 'project' ? 'I miei conti' : 'Conti'} />

      {/* Periodo */}
      <div className="flex flex-wrap items-center gap-3 -mt-2">
        <Segmenti valore={periodo} scelte={[['mese', 'Un mese'], ['anno', "Tutto l'anno"]]}
          onChange={(v) => imposta({ periodo: v === 'anno' ? 'anno' : null, anno: v === 'anno' ? String(a) : null, per: null })} />
        <div className="flex items-center gap-1.5">
          <Freccia lato="sinistra" onClick={() => periodo === 'mese' ? imposta({ mese: meseDi(new Date(a, m - 2, 1)) }) : imposta({ anno: String(anno - 1) })} />
          <p className="text-lg font-semibold min-w-40 text-center">{periodo === 'mese' ? nomeMese(mese) : anno}</p>
          <Freccia lato="destra" onClick={() => periodo === 'mese' ? imposta({ mese: meseDi(new Date(a, m, 1)) }) : imposta({ anno: String(anno + 1) })} />
        </div>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <>
          {/* Le tre cifre del periodo */}
          <Card className="p-5 md:p-6 grid gap-5 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            <Cifra etichetta="Incassato e da incassare" titolo="Ricavi" valore={euro(totale.ricavi)} />
            <Cifra etichetta="Spese di tutti gli eventi" titolo="Costi" valore={euro(totale.costi)} />
            <Cifra etichetta={totale.ricavi ? `Resta il ${Math.round((margine / totale.ricavi) * 100)}% dei ricavi` : 'Ricavi meno costi'} titolo="Margine"
              valore={euro(margine)} tono={margine >= 0 ? 'ok' : 'male'} />
          </Card>
          {(totale.senzaPrezzo > 0 || daFatturare > 0 || totale.daRimborsare > 0) && (
            <div className="flex flex-wrap gap-2 -mt-2">
              {totale.senzaPrezzo > 0 && <Avviso>{totale.senzaPrezzo} {totale.senzaPrezzo === 1 ? 'evento senza prezzo' : 'eventi senza prezzo'}: i ricavi sono più alti di così</Avviso>}
              {daFatturare > 0 && <Avviso>{daFatturare} {daFatturare === 1 ? 'evento concluso' : 'eventi conclusi'} da fatturare</Avviso>}
              {totale.daRimborsare > 0 && <Avviso arancione>{euro(totale.daRimborsare)} da rimborsare agli operatori (spese pagate di tasca)</Avviso>}
            </div>
          )}

          {/* Come dividere */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-tenue">Dividi per</span>
            <Segmenti valore={per} scelte={divisioni.map((d) => [d, DIVISIONI[d]])} onChange={(v) => imposta({ per: v })} />
            {nomeFiltro && (
              <button onClick={() => imposta({ operatore: null, regione: null })}
                className="h-9 pl-3 pr-2 rounded-full bg-inchiostro text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                Solo {nomeFiltro} <X className="size-4" aria-hidden />
              </button>
            )}
          </div>

          {eventi.length === 0 ? <Card><Vuoto titolo="Nessun evento in questo periodo" /></Card>
            : per === 'evento' ? <TabellaEventi eventi={eventi} conProject={ruolo !== 'project'} />
            : <TabellaGruppi gruppi={raggruppa(eventi as EventoConti[], per)} per={per} onApri={apri} />}
        </>
      )}
    </div>
  )
}

function Segmenti<T extends string>({ valore, scelte, onChange }: { valore: T; scelte: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex bg-superficie border border-bordo rounded-xl p-1 gap-0.5">
      {scelte.map(([id, testo]) => (
        <button key={id} onClick={() => onChange(id)} aria-pressed={valore === id}
          className={cn('h-9 px-4 rounded-lg text-sm font-semibold cursor-pointer whitespace-nowrap', valore === id ? 'bg-inchiostro text-white' : 'text-tenue hover:text-inchiostro hover:bg-sfondo')}>
          {testo}
        </button>
      ))}
    </div>
  )
}

function Freccia({ lato, onClick }: { lato: 'sinistra' | 'destra'; onClick: () => void }) {
  const Icona = lato === 'sinistra' ? ChevronLeft : ChevronRight
  return (
    <button onClick={onClick} aria-label={lato === 'sinistra' ? 'Prima' : 'Dopo'} className="size-10 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo">
      <Icona className="size-5" aria-hidden />
    </button>
  )
}

function Cifra({ titolo, valore, etichetta, tono }: { titolo: string; valore: string; etichetta: string; tono?: 'ok' | 'male' }) {
  return (
    <div>
      <p className="text-sm font-semibold text-tenue">{titolo}</p>
      <p className={cn('text-[32px] font-semibold tabular-nums leading-tight', tono === 'ok' && 'text-ok', tono === 'male' && 'text-urgente-testo')}>{valore}</p>
      <p className="text-sm text-tenue">{etichetta}</p>
    </div>
  )
}

const Avviso = ({ children, arancione }: { children: React.ReactNode; arancione?: boolean }) => (
  <span className={cn('text-sm font-semibold rounded-lg px-3 py-1.5', arancione ? 'bg-avviso text-avviso-testo' : 'bg-urgente-tenue text-urgente-testo')}>{children}</span>
)

const intestazioni: Record<Exclude<Per, 'evento'>, string> = { mese: 'Mese', operatore: 'Operatore', regione: 'Regione' }

/** Una riga per mese, operatore o regione; cliccando si vedono i suoi eventi */
function TabellaGruppi({ gruppi, per, onApri }: { gruppi: Gruppo[]; per: Exclude<Per, 'evento'>; onApri: (g: Gruppo) => void }) {
  const ordinati = per === 'mese' ? gruppi : [...gruppi].sort((x, y) => y.ricavi - x.ricavi)
  const tot = gruppi.reduce((t, g) => ({ eventi: t.eventi + g.eventi, ricavi: t.ricavi + g.ricavi, costi: t.costi + g.costi, rimb: t.rimb + g.daRimborsare }), { eventi: 0, ricavi: 0, costi: 0, rimb: 0 })
  const maxRicavi = Math.max(...gruppi.map((g) => g.ricavi), 1)
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[15px] min-w-[720px]">
          <thead className="bg-sfondo text-xs text-tenue">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">{intestazioni[per]}</th>
              <th className="px-3 py-3 font-semibold text-right">Eventi</th>
              <th className="px-3 py-3 font-semibold text-right">Ricavi</th>
              <th className="px-3 py-3 font-semibold text-right">Costi</th>
              <th className="px-3 py-3 font-semibold text-right">Margine</th>
              {per === 'operatore' && <th className="px-4 py-3 font-semibold text-right">Da rimborsare</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {ordinati.map((g) => (
              <tr key={g.chiave} onClick={() => onApri(g)} className="cursor-pointer hover:bg-sfondo/70">
                <td className="px-4 py-3">
                  <p className="font-semibold">{g.etichetta}</p>
                  <span className="block h-1.5 mt-1.5 rounded-full bg-ok/70 max-w-48" style={{ width: `${(g.ricavi / maxRicavi) * 100}%` }} aria-hidden />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{g.eventi}</td>
                <td className="px-3 py-3 text-right tabular-nums">{euro(g.ricavi)}{g.senzaPrezzo > 0 && <span className="block text-xs font-semibold text-urgente-testo">{g.senzaPrezzo} senza prezzo</span>}</td>
                <td className="px-3 py-3 text-right tabular-nums">{euro(g.costi)}</td>
                <td className={cn('px-3 py-3 text-right tabular-nums font-semibold', g.margine >= 0 ? 'text-ok' : 'text-urgente-testo')}>
                  {euro(g.margine)}{g.percentuale != null && <span className="block text-xs font-medium text-tenue">{g.percentuale}%</span>}
                </td>
                {per === 'operatore' && <td className={cn('px-4 py-3 text-right tabular-nums', g.daRimborsare > 0 ? 'font-semibold text-avviso-testo' : 'text-tenue')}>{euro(g.daRimborsare)}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-sfondo font-semibold border-t border-bordo-forte">
            <tr>
              <td className="px-4 py-3">Totale</td>
              <td className="px-3 py-3 text-right tabular-nums">{tot.eventi}</td>
              <td className="px-3 py-3 text-right tabular-nums">{euro(tot.ricavi)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{euro(tot.costi)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{euro(tot.ricavi - tot.costi)}</td>
              {per === 'operatore' && <td className="px-4 py-3 text-right tabular-nums">{euro(tot.rimb)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

type EventoRiga = Omit<NonNullable<ReturnType<typeof useContiPeriodo>['data']>[number], 'conti'> & { conti: { prezzo: number | null; fattura_numero: string | null; fattura_importo: number | null; incassata: boolean } | null }

/** Una riga per evento, con lo stato della fattura */
function TabellaEventi({ eventi, conProject }: { eventi: EventoRiga[]; conProject: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[15px] min-w-[780px]">
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
            {eventi.map((e) => {
              const b = bilancio(e.conti, e.spese)
              return (
                <tr key={e.id} className="hover:bg-sfondo/60">
                  <td className="px-4 py-3 whitespace-nowrap text-tenue">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })}</td>
                  <td className="px-3 py-3 max-w-72">
                    <Link to={`/gestione/eventi/${e.id}`} className="font-semibold hover:underline block truncate">{nomeEvento(e)}</Link>
                    <span className="text-sm text-tenue">{e.citta}{e.operatore ? `, ${nomeCompleto(e.operatore)}` : ''}</span>
                  </td>
                  {conProject && <td className="px-3 py-3 text-tenue whitespace-nowrap">{e.project ? nomeCompleto(e.project) : '—'}</td>}
                  <td className={cn('px-3 py-3 text-right tabular-nums', b.ricavo == null && 'text-urgente-testo font-semibold')}>{b.ricavo == null ? 'manca' : euro(b.ricavo)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{euro(b.costi)}</td>
                  <td className={cn('px-3 py-3 text-right tabular-nums font-semibold', b.margine != null && (b.margine >= 0 ? 'text-ok' : 'text-urgente-testo'))}>
                    {euro(b.margine)}{b.percentuale != null && <span className="block text-xs font-medium text-tenue">{b.percentuale}%</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap"><StatoFattura stato={e.stato} conti={e.conti} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function StatoFattura({ stato, conti }: { stato: string; conti: EventoRiga['conti'] }) {
  const p = 'text-xs font-semibold rounded-full px-2.5 py-1'
  if (conti?.incassata) return <span className={cn(p, 'bg-ok-tenue text-ok')}>Incassata</span>
  if (conti?.fattura_numero) return <span className={cn(p, 'bg-avviso text-avviso-testo')}>N. {conti.fattura_numero}, da incassare</span>
  if (stato === 'completato') return <span className={cn(p, 'bg-urgente-tenue text-urgente-testo')}>Da fatturare</span>
  return <span className="text-xs text-tenue">evento da fare</span>
}
