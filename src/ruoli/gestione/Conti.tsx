import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/sessione'
import { useContiPeriodo } from '@/modules/conti/api'
import { bilancio, etichettaVoce, euro, mesiDellAnno, raggruppa, spesePerOperatore, totali, type Gruppo } from '@/modules/conti/conti'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { confiniMese, meseRoma, nomeMese, piuMesi } from '@/shared/lib/date'
import { useAdesso } from '@/shared/lib/tempo'
import { Card } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Vista = 'andamento' | 'eventi' | 'operatori' | 'regioni'
type Periodo = 'mese' | 'anno'
type EventoRiga = NonNullable<ReturnType<typeof useContiPeriodo>['data']>[number]
type Imposta = (modifiche: Record<string, string | null>) => void

const VISTE: [Vista, string][] = [['andamento', 'Andamento'], ['eventi', 'Eventi'], ['operatori', 'Operatori'], ['regioni', 'Regioni']]

// Colori del grafico: ricavi e costi (coppia controllata per leggibilità e daltonismo)
const COLORE_RICAVI = '#2a78d6'
const COLORE_COSTI = '#eb6834'

/** Per gli anni: dal 1° gennaio al 1° gennaio dopo, all'ora di Roma */
const confiniAnno = (anno: number) => ({ dal: confiniMese(`${anno}-01`).dal, al: confiniMese(`${anno + 1}-01`).dal })

const percento = (parte: number, tutto: number) => (tutto ? Math.round((parte / tutto) * 100) : 0)

/**
 * Conti, in quattro schede:
 * - Andamento: anno per anno e mese per mese, con il grafico
 * - Eventi: ricavo, costi e fattura di ogni evento di un mese
 * - Operatori: quanto spende ognuno e per cosa
 * - Regioni: ricavi e costi per regione
 * Tutto sta nell'indirizzo, così un link riapre la stessa vista. Il project vede solo i suoi eventi.
 */
export function Conti() {
  const { ruolo } = useProfilo()
  const adesso = useAdesso()
  const [par, setPar] = useSearchParams()
  const vista = (VISTE.find(([v]) => v === par.get('vista'))?.[0] ?? 'andamento') as Vista
  const mese = par.get('mese') ?? meseRoma(adesso)
  const anno = Number(par.get('anno') ?? mese.slice(0, 4))
  const periodo: Periodo = par.get('periodo') === 'anno' ? 'anno' : 'mese'

  const imposta: Imposta = (modifiche) => {
    const p = new URLSearchParams(par)
    for (const [k, v] of Object.entries(modifiche)) { if (v == null) p.delete(k); else p.set(k, v) }
    setPar(p, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo={ruolo === 'project' ? 'I miei conti' : 'Conti'} />
      <nav className="flex gap-1 border-b border-bordo -mt-2 overflow-x-auto" aria-label="Viste dei conti">
        {VISTE.map(([v, testo]) => (
          <button key={v} onClick={() => imposta({ vista: v === 'andamento' ? null : v, operatore: null, regione: null })} aria-current={vista === v ? 'page' : undefined}
            className={cn('h-11 px-4 -mb-px border-b-2 text-[15px] font-semibold whitespace-nowrap cursor-pointer',
              vista === v ? 'border-inchiostro text-inchiostro' : 'border-transparent text-tenue hover:text-inchiostro')}>
            {testo}
          </button>
        ))}
      </nav>

      {vista === 'andamento' && <Andamento anno={anno} adesso={adesso} imposta={imposta} />}
      {vista === 'eventi' && <EventiDelMese mese={mese} imposta={imposta} conProject={ruolo !== 'project'}
        operatore={par.get('operatore')} regione={par.get('regione')} />}
      {vista === 'operatori' && <ConPeriodo periodo={periodo} mese={mese} anno={anno} imposta={imposta}>
        {(eventi, quando) => <Operatori eventi={eventi} quando={quando} periodo={periodo} mese={mese} imposta={imposta} />}
      </ConPeriodo>}
      {vista === 'regioni' && <ConPeriodo periodo={periodo} mese={mese} anno={anno} imposta={imposta}>
        {(eventi) => <Regioni eventi={eventi} periodo={periodo} mese={mese} imposta={imposta} />}
      </ConPeriodo>}
    </div>
  )
}

/* ---------- Andamento: gli anni e i mesi ---------- */

function Andamento({ anno, adesso, imposta }: { anno: number; adesso: number; imposta: Imposta }) {
  // Tutta la storia (dal 2020 all'anno prossimo): servono gli anni e il confronto con l'anno prima
  const annoCorrente = Number(meseRoma(adesso).slice(0, 4))
  const [dal, al] = [confiniAnno(2020).dal, confiniAnno(annoCorrente + 1).al]
  const { data, isPending, error } = useContiPeriodo(dal, al)
  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />

  const anni = raggruppa(data, 'anno').toSorted((a, b) => b.chiave.localeCompare(a.chiave))
  const diQuestAnno = data.filter((e) => meseRoma(e.allestimento_il).startsWith(String(anno)))
  const t = totali(diQuestAnno)
  const primo = anni.find((g) => g.chiave === String(anno - 1))
  const mesi = mesiDellAnno(diQuestAnno, anno)
  const apriMese = (chiave: string) => imposta({ vista: 'eventi', mese: chiave, anno: null })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Scorri testo={String(anno)} prima={() => imposta({ anno: String(anno - 1) })} dopo={() => imposta({ anno: String(anno + 1) })} />
      </div>

      <Riassunto>
        {t.ricavi === 0 && t.costi === 0 ? `Nel ${anno} ancora nessun prezzo o spesa.` : <>
          Nel {anno}: {euro(t.ricavi)} di ricavi e {euro(t.costi)} di costi. {t.margine >= 0 ? 'Restano ' : 'Mancano '}
          <Importo valore={t.margine} /> ({percento(t.margine, t.ricavi)}% dei ricavi).
          {primo && primo.ricavi > 0 && <> Rispetto al {anno - 1} i ricavi sono {t.ricavi >= primo.ricavi ? 'cresciuti' : 'calati'} del {Math.abs(percento(t.ricavi - primo.ricavi, primo.ricavi))}%.</>}
        </>}
      </Riassunto>
      <Avvisi senzaPrezzo={t.senzaPrezzo} daFatturare={t.daFatturare} daRimborsare={t.daRimborsare} />

      <Card className="p-4 md:p-5">
        <GraficoMesi mesi={mesi} onApri={apriMese} />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Mese per mese</h2>
        <TabellaGruppi gruppi={mesi.filter((m) => m.eventi > 0)} intestazione="Mese" onApri={(g) => apriMese(g.chiave)}
          vuoto={`Nessun evento nel ${anno}.`} />
      </section>

      {anni.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Anno per anno</h2>
          <TabellaGruppi gruppi={anni} intestazione="Anno" onApri={(g) => imposta({ anno: g.chiave })} evidenzia={String(anno)} />
        </section>
      )}
    </div>
  )
}

/** Dodici mesi: per ognuno una barra dei ricavi e una dei costi. Clic su un mese: i suoi eventi. */
function GraficoMesi({ mesi, onApri }: { mesi: Gruppo[]; onApri: (mese: string) => void }) {
  const [sopra, setSopra] = useState<string>()
  const massimo = tetto(Math.max(...mesi.flatMap((m) => [m.ricavi, m.costi]), 1))
  const righe = [1, 0.5, 0].map((f) => massimo * f)
  const attivo = mesi.find((m) => m.chiave === sopra)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Ricavi e costi, mese per mese</h2>
        <p className="flex gap-4 text-sm text-tenue">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLORE_RICAVI }} />Ricavi</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLORE_COSTI }} />Costi</span>
        </p>
      </div>
      <div className="relative flex gap-2">
        {/* Asse dei valori: tre righe leggere */}
        <div className="relative h-48 w-12 shrink-0 text-[11px] text-tenue tabular-nums text-right" aria-hidden>
          {righe.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${(1 - v / massimo) * 100}%` }}>{compatto(v)}</span>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-x-0 top-0 h-48 flex flex-col justify-between pointer-events-none" aria-hidden>
            {righe.map((v) => <span key={v} className={cn('border-t', v === 0 ? 'border-bordo-forte' : 'border-bordo border-dashed')} />)}
          </div>
          <div className="relative grid grid-cols-12 gap-0.5 sm:gap-1">
            {mesi.map((m) => (
              <button key={m.chiave} onClick={() => onApri(m.chiave)} onMouseEnter={() => setSopra(m.chiave)} onMouseLeave={() => setSopra(undefined)}
                onFocus={() => setSopra(m.chiave)} onBlur={() => setSopra(undefined)}
                aria-label={`${nomeMese(m.chiave)}: ricavi ${euro(m.ricavi)}, costi ${euro(m.costi)}. Apri gli eventi`}
                className={cn('flex flex-col items-center cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-inchiostro', sopra === m.chiave && 'bg-sfondo')}>
                <span className="h-48 w-full flex items-end justify-center gap-[2px] px-0.5">
                  <span className="w-full max-w-4 rounded-t-[4px]" style={{ height: `${(m.ricavi / massimo) * 100}%`, background: COLORE_RICAVI }} />
                  <span className="w-full max-w-4 rounded-t-[4px]" style={{ height: `${(m.costi / massimo) * 100}%`, background: COLORE_COSTI }} />
                </span>
                <span className={cn('text-[11px] sm:text-xs mt-1.5 h-4', sopra === m.chiave ? 'text-inchiostro font-semibold' : 'text-tenue')}>{corto(m)}</span>
              </button>
            ))}
          </div>
          {attivo && (
            <div className="absolute top-2 z-10 pointer-events-none rounded-lg bg-superficie border border-bordo shadow-md px-3 py-2 text-sm min-w-44"
              style={mesi.indexOf(attivo) < 6 ? { left: `${((mesi.indexOf(attivo) + 1) / 12) * 100}%` } : { right: `${((12 - mesi.indexOf(attivo)) / 12) * 100}%` }}>
              <p className="font-semibold">{nomeMese(attivo.chiave)}</p>
              <p className="flex justify-between gap-4"><span className="text-tenue">Ricavi</span><span className="tabular-nums">{euro(attivo.ricavi)}</span></p>
              <p className="flex justify-between gap-4"><span className="text-tenue">Costi</span><span className="tabular-nums">{euro(attivo.costi)}</span></p>
              <p className="flex justify-between gap-4 font-semibold"><span>Restano</span><span className="tabular-nums">{euro(attivo.margine)}</span></p>
              <p className="text-xs text-tenue mt-0.5">{attivo.eventi === 1 ? '1 evento' : `${attivo.eventi} eventi`}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const corto = (m: Gruppo) => nomeMese(m.chiave).slice(0, 3).toLowerCase()

/** Un tetto "tondo" sopra il valore più alto: 1, 2, 2,5 o 5 per una potenza di 10 */
function tetto(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  return [1, 2, 2.5, 5, 10].map((x) => x * p).find((x) => x >= v) ?? v
}
const compatto = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k €` : `${v} €`)

/* ---------- Eventi di un mese ---------- */

function EventiDelMese({ mese, imposta, conProject, operatore, regione }: { mese: string; imposta: Imposta; conProject: boolean; operatore: string | null; regione: string | null }) {
  const { dal, al } = confiniMese(mese)
  const { data, isPending, error } = useContiPeriodo(dal, al)
  const eventi = (data ?? []).filter((e) => (!operatore || e.operatore?.id === operatore) && (!regione || e.regione === regione))
  const t = totali(eventi)
  const nomeFiltro = operatore ? (eventi[0]?.operatore ? nomeCompleto(eventi[0].operatore) : 'operatore') : regione

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Scorri testo={nomeMese(mese)} prima={() => imposta({ mese: piuMesi(mese, -1) })} dopo={() => imposta({ mese: piuMesi(mese, 1) })} />
        {nomeFiltro && (
          <button onClick={() => imposta({ operatore: null, regione: null })}
            className="h-9 pl-3 pr-2 rounded-full bg-inchiostro text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
            Solo {nomeFiltro} <X className="size-4" aria-label="togli il filtro" />
          </button>
        )}
      </div>
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card><Vuoto titolo="Nessun evento in questo mese" /></Card>
      ) : (
        <>
          <Riassunto>
            {eventi.length === 1 ? '1 evento' : `${eventi.length} eventi`}: {euro(t.ricavi)} di ricavi e {euro(t.costi)} di costi.
            {' '}{t.margine >= 0 ? 'Restano ' : 'Mancano '}<Importo valore={t.margine} />.
          </Riassunto>
          <Avvisi senzaPrezzo={t.senzaPrezzo} daFatturare={t.daFatturare} daRimborsare={t.daRimborsare} />
          <TabellaEventi eventi={eventi} conProject={conProject} />
        </>
      )}
    </div>
  )
}

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
              <th className="px-3 py-3 font-semibold text-right">Resta</th>
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
                  <td className={cn('px-3 py-3 text-right tabular-nums', b.ricavo == null && 'text-urgente-testo font-semibold')}>{b.ricavo == null ? 'manca il prezzo' : euro(b.ricavo)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{euro(b.costi)}</td>
                  <td className={cn('px-3 py-3 text-right tabular-nums font-semibold', b.margine != null && (b.margine >= 0 ? 'text-ok' : 'text-urgente-testo'))}>{euro(b.margine)}</td>
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

/* ---------- Operatori: quanto spende ognuno ---------- */

/** Un mese o un anno, con le frecce; carica gli eventi del periodo e li passa alla vista */
function ConPeriodo({ periodo, mese, anno, imposta, children }: {
  periodo: Periodo; mese: string; anno: number; imposta: Imposta; children: (eventi: EventoRiga[], quando: string) => React.ReactNode
}) {
  const { dal, al } = periodo === 'mese' ? confiniMese(mese) : confiniAnno(anno)
  const { data, isPending, error } = useContiPeriodo(dal, al)
  const quando = periodo === 'mese' ? `A ${nomeMese(mese).split(' ')[0].toLowerCase()}` : `Nel ${anno}`
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="inline-flex bg-superficie border border-bordo rounded-xl p-1 gap-0.5">
          {([['mese', 'Un mese'], ['anno', "Un anno"]] as [Periodo, string][]).map(([v, testo]) => (
            <button key={v} onClick={() => imposta({ periodo: v === 'anno' ? 'anno' : null, anno: v === 'anno' ? mese.slice(0, 4) : null })} aria-pressed={periodo === v}
              className={cn('h-9 px-4 rounded-lg text-sm font-semibold cursor-pointer', periodo === v ? 'bg-inchiostro text-white' : 'text-tenue hover:text-inchiostro hover:bg-sfondo')}>
              {testo}
            </button>
          ))}
        </div>
        {periodo === 'mese'
          ? <Scorri testo={nomeMese(mese)} prima={() => imposta({ mese: piuMesi(mese, -1) })} dopo={() => imposta({ mese: piuMesi(mese, 1) })} />
          : <Scorri testo={String(anno)} prima={() => imposta({ anno: String(anno - 1) })} dopo={() => imposta({ anno: String(anno + 1) })} />}
      </div>
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : children(data, quando)}
    </div>
  )
}

function Operatori({ eventi, quando, periodo, mese, imposta }: { eventi: EventoRiga[]; quando: string; periodo: Periodo; mese: string; imposta: Imposta }) {
  const operatori = spesePerOperatore(eventi)
  const totale = operatori.reduce((t, o) => t + o.totale, 0)
  const tasca = operatori.reduce((t, o) => t + o.tasca, 0)
  const massimo = Math.max(...operatori.map((o) => o.totale), 1)
  // Dal clic su un operatore si vedono i suoi eventi del mese (per un anno, del primo mese)
  const apri = (id: string) => imposta({ vista: 'eventi', operatore: id, mese: periodo === 'mese' ? mese : `${mese.slice(0, 4)}-01`, periodo: null, anno: null })

  if (operatori.length === 0) return <Card><Vuoto titolo="Nessun operatore ha lavorato in questo periodo" /></Card>
  return (
    <>
      <Riassunto>
        {totale === 0 ? `${quando} gli operatori non hanno segnato spese.` : <>
          {quando} gli operatori hanno speso {euro(totale)}
          {tasca > 0 ? <>: {euro(totale - tasca)} con la carta aziendale e {euro(tasca)} di tasca loro, da rimborsare.</> : ', tutto con la carta aziendale.'}
        </>}
      </Riassunto>
      <Card className="divide-y divide-bordo">
        {operatori.map((o) => (
          <button key={o.id} onClick={() => apri(o.id)} className="w-full text-left px-4 py-4 grid gap-x-6 gap-y-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] md:items-center cursor-pointer hover:bg-sfondo/70">
            <div className="min-w-0">
              <p className="font-semibold truncate">{o.nome}</p>
              <p className="text-sm text-tenue">{o.eventi === 1 ? '1 evento' : `${o.eventi} eventi`}{o.mediaPerEvento ? `, in media ${euro(o.mediaPerEvento)} a evento` : ''}</p>
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              {/* Quanto ha speso rispetto a chi ha speso di più */}
              <span className="h-2 rounded-full bg-sfondo overflow-hidden" aria-hidden>
                <span className="block h-full rounded-full bg-inchiostro/70" style={{ width: `${(o.totale / massimo) * 100}%` }} />
              </span>
              <p className="text-sm text-tenue truncate">
                {o.perVoce.length === 0 ? 'Nessuna spesa' : o.perVoce.slice(0, 4).map((v) => `${etichettaVoce(v.voce)} ${euro(v.importo)}`).join(', ')}
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-lg font-semibold tabular-nums">{euro(o.totale)}</p>
              {o.tasca > 0 && <p className="text-sm font-semibold text-avviso-testo tabular-nums">{euro(o.tasca)} da rimborsare</p>}
            </div>
          </button>
        ))}
      </Card>
    </>
  )
}

/* ---------- Regioni ---------- */

function Regioni({ eventi, periodo, mese, imposta }: { eventi: EventoRiga[]; periodo: Periodo; mese: string; imposta: Imposta }) {
  const gruppi = raggruppa(eventi, 'regione').toSorted((a, b) => b.ricavi - a.ricavi)
  return (
    <TabellaGruppi gruppi={gruppi} intestazione="Regione" vuoto="Nessun evento in questo periodo."
      onApri={(g) => imposta({ vista: 'eventi', regione: g.chiave, mese: periodo === 'mese' ? mese : `${mese.slice(0, 4)}-01`, periodo: null, anno: null })} />
  )
}

/* ---------- Pezzi comuni ---------- */

/** Una riga per mese, anno o regione; cliccando si scende nel dettaglio */
function TabellaGruppi({ gruppi, intestazione, onApri, evidenzia, vuoto }: { gruppi: Gruppo[]; intestazione: string; onApri: (g: Gruppo) => void; evidenzia?: string; vuoto?: string }) {
  if (gruppi.length === 0) return <p className="text-tenue">{vuoto ?? 'Niente da mostrare.'}</p>
  const tot = gruppi.reduce((t, g) => ({ eventi: t.eventi + g.eventi, ricavi: t.ricavi + g.ricavi, costi: t.costi + g.costi }), { eventi: 0, ricavi: 0, costi: 0 })
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[15px] min-w-[560px]">
          <thead className="bg-sfondo text-xs text-tenue">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">{intestazione}</th>
              <th className="px-3 py-3 font-semibold text-right">Eventi</th>
              <th className="px-3 py-3 font-semibold text-right">Ricavi</th>
              <th className="px-3 py-3 font-semibold text-right">Costi</th>
              <th className="px-4 py-3 font-semibold text-right">Restano</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {gruppi.map((g) => (
              <tr key={g.chiave} onClick={() => onApri(g)} className={cn('cursor-pointer hover:bg-sfondo/70', evidenzia === g.chiave && 'bg-accento-tenue/50')}>
                <td className="px-4 py-3 font-semibold">{g.etichetta}</td>
                <td className="px-3 py-3 text-right tabular-nums">{g.eventi}</td>
                <td className="px-3 py-3 text-right tabular-nums">{euro(g.ricavi)}{g.senzaPrezzo > 0 && <span className="block text-xs font-semibold text-urgente-testo">{g.senzaPrezzo} senza prezzo</span>}</td>
                <td className="px-3 py-3 text-right tabular-nums">{euro(g.costi)}</td>
                <td className={cn('px-4 py-3 text-right tabular-nums font-semibold', g.margine >= 0 ? 'text-ok' : 'text-urgente-testo')}>
                  {euro(g.margine)}{g.percentuale != null && <span className="block text-xs font-medium text-tenue">{g.percentuale}%</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {gruppi.length > 1 && (
            <tfoot className="bg-sfondo font-semibold border-t border-bordo-forte">
              <tr>
                <td className="px-4 py-3">Totale</td>
                <td className="px-3 py-3 text-right tabular-nums">{tot.eventi}</td>
                <td className="px-3 py-3 text-right tabular-nums">{euro(tot.ricavi)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{euro(tot.costi)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{euro(tot.ricavi - tot.costi)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  )
}

/** Il riassunto del periodo, detto a parole */
const Riassunto = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[19px] md:text-[21px] leading-snug max-w-[50rem]">{children}</p>
)

const Importo = ({ valore }: { valore: number }) => (
  <span className={cn('font-semibold tabular-nums', valore >= 0 ? 'text-ok' : 'text-urgente-testo')}>{euro(Math.abs(valore))}</span>
)

function Avvisi({ senzaPrezzo, daFatturare, daRimborsare }: { senzaPrezzo: number; daFatturare: number; daRimborsare: number }) {
  if (!senzaPrezzo && !daFatturare && !daRimborsare) return null
  const p = 'text-sm font-semibold rounded-lg px-3 py-1.5'
  return (
    <div className="flex flex-wrap gap-2 -mt-3">
      {senzaPrezzo > 0 && <span className={cn(p, 'bg-urgente-tenue text-urgente-testo')}>{senzaPrezzo === 1 ? '1 evento senza prezzo' : `${senzaPrezzo} eventi senza prezzo`}: i ricavi veri sono più alti</span>}
      {daFatturare > 0 && <span className={cn(p, 'bg-urgente-tenue text-urgente-testo')}>{daFatturare === 1 ? '1 evento concluso' : `${daFatturare} eventi conclusi`} da fatturare</span>}
      {daRimborsare > 0 && <span className={cn(p, 'bg-avviso text-avviso-testo')}>{euro(daRimborsare)} da rimborsare agli operatori</span>}
    </div>
  )
}

function Scorri({ testo, prima, dopo }: { testo: string; prima: () => void; dopo: () => void }) {
  const tasto = 'size-10 rounded-lg border border-bordo-forte bg-superficie flex items-center justify-center cursor-pointer hover:bg-sfondo'
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={prima} aria-label="Prima" className={tasto}><ChevronLeft className="size-5" aria-hidden /></button>
      <p className="text-lg font-semibold min-w-40 text-center">{testo}</p>
      <button onClick={dopo} aria-label="Dopo" className={tasto}><ChevronRight className="size-5" aria-hidden /></button>
    </div>
  )
}
