import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Wallet, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/sessione'
import { useContiPeriodo } from '@/modules/conti/api'
import { bilancio, etichettaVoce, euro, mesiDellAnno, raggruppa, spesePerOperatore, totali, type Voce } from '@/modules/conti/conti'
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

/*
 * Un solo linguaggio in tutta la pagina: una barra lunga quanto i ricavi, arancione per la parte
 * che se ne va in costi, verde per quello che resta. Colori controllati per leggibilità e daltonismo.
 */
const COSTI = '#eb6834'
const RESTA = '#1baf7a'
// Tipi di spesa nelle barre: i quattro più comuni con il loro colore, gli altri insieme in grigio.
// Niente arancione e verde, che qui vogliono già dire costi e resta. Colori controllati.
type Fascia = 'carburante' | 'pedaggi' | 'parcheggio' | 'vitto' | 'altro'
const FASCE: { id: Fascia; etichetta: string; colore: string }[] = [
  { id: 'carburante', etichetta: 'Carburante', colore: '#2a78d6' },
  { id: 'pedaggi', etichetta: 'Pedaggi', colore: '#eda100' },
  { id: 'parcheggio', etichetta: 'Parcheggio', colore: '#6250d6' },
  { id: 'vitto', etichetta: 'Vitto', colore: '#e87ba4' },
  { id: 'altro', etichetta: 'Altro', colore: '#8b8e97' },
]
const fasciaDi = (v: Voce): Fascia => (FASCE.some((f) => f.id === v) ? (v as Fascia) : 'altro')
const coloreVoce = (v: Voce) => FASCE.find((f) => f.id === fasciaDi(v))!.colore
/** Somma le spese per fascia, nell'ordine fisso, solo quelle presenti */
const perFascia = (voci: { voce: Voce; importo: number }[]) =>
  FASCE.map((f) => ({ ...f, importo: voci.filter((v) => fasciaDi(v.voce) === f.id).reduce((t, v) => t + v.importo, 0) })).filter((f) => f.importo > 0)

const confiniAnno = (anno: number) => ({ dal: confiniMese(`${anno}-01`).dal, al: confiniMese(`${anno + 1}-01`).dal })
const percento = (parte: number, tutto: number) => (tutto ? Math.round((parte / tutto) * 100) : 0)
const meseCorto = (chiave: string) => nomeMese(chiave).split(' ')[0]

/**
 * Conti in quattro schede: Andamento (anno e mesi), Eventi (di un mese), Operatori (quanto spende
 * ognuno), Regioni. Tutto sta nell'indirizzo. Il project vede solo i suoi eventi.
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
        {(eventi) => <Operatori eventi={eventi} periodo={periodo} mese={mese} imposta={imposta} />}
      </ConPeriodo>}
      {vista === 'regioni' && <ConPeriodo periodo={periodo} mese={mese} anno={anno} imposta={imposta}>
        {(eventi) => <Regioni eventi={eventi} periodo={periodo} mese={mese} imposta={imposta} />}
      </ConPeriodo>}
    </div>
  )
}

/* ---------- Andamento ---------- */

function Andamento({ anno, adesso, imposta }: { anno: number; adesso: number; imposta: Imposta }) {
  const annoCorrente = Number(meseRoma(adesso).slice(0, 4))
  const { data, isPending, error } = useContiPeriodo(confiniAnno(2020).dal, confiniAnno(annoCorrente + 1).al)
  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />

  const diQuestAnno = data.filter((e) => meseRoma(e.allestimento_il).startsWith(String(anno)))
  const t = totali(diQuestAnno)
  const mesi = mesiDellAnno(diQuestAnno, anno)
  const anni = raggruppa(data, 'anno').toSorted((a, b) => b.chiave.localeCompare(a.chiave))

  return (
    <div className="flex flex-col gap-8">
      <Scorri testo={String(anno)} prima={() => imposta({ anno: String(anno - 1) })} dopo={() => imposta({ anno: String(anno + 1) })} />
      <Riepilogo ricavi={t.ricavi} costi={t.costi} />
      <Segnali daRimborsare={t.daRimborsare} />
      <Righe righe={mesi.map((m) => ({ ...m, etichetta: meseCorto(m.chiave) }))}
        onApri={(chiave) => imposta({ vista: 'eventi', mese: chiave, anno: null })} />
      {anni.length > 1 && (
        <Righe righe={anni} evidenzia={String(anno)} onApri={(chiave) => imposta({ anno: chiave })} />
      )}
    </div>
  )
}

/* ---------- Eventi di un mese ---------- */

function EventiDelMese({ mese, imposta, conProject, operatore, regione }: { mese: string; imposta: Imposta; conProject: boolean; operatore: string | null; regione: string | null }) {
  const { dal, al } = confiniMese(mese)
  const { data, isPending, error } = useContiPeriodo(dal, al)
  const eventi = (data ?? []).filter((e) => (!operatore || e.operatore?.id === operatore) && (!regione || e.regione === regione))
  const t = totali(eventi)
  const nomeFiltro = operatore ? (eventi[0]?.operatore ? nomeCompleto(eventi[0].operatore) : '') : regione
  const scala = Math.max(...eventi.map((e) => { const b = bilancio(e.conti, e.spese); return Math.max(b.ricavo ?? 0, b.costi) }), 1)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Scorri testo={nomeMese(mese)} prima={() => imposta({ mese: piuMesi(mese, -1) })} dopo={() => imposta({ mese: piuMesi(mese, 1) })} />
        {nomeFiltro && (
          <button onClick={() => imposta({ operatore: null, regione: null })}
            className="h-9 pl-3 pr-2 rounded-full bg-inchiostro text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
            {nomeFiltro} <X className="size-4" aria-label="togli il filtro" />
          </button>
        )}
      </div>
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : eventi.length === 0 ? (
        <Card><Vuoto titolo="Nessun evento" /></Card>
      ) : (
        <>
          <Riepilogo ricavi={t.ricavi} costi={t.costi} />
          <Segnali daRimborsare={t.daRimborsare} />
          <Card className="divide-y divide-bordo">
            {eventi.map((e) => {
              const b = bilancio(e.conti, e.spese)
              return (
                <Link key={e.id} to={`/gestione/eventi/${e.id}`}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] md:grid-cols-[3.25rem_minmax(0,14rem)_minmax(0,1fr)_7.5rem_7.5rem] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-sfondo/70">
                  <span className="text-center leading-tight">
                    <span className="block text-lg font-semibold tabular-nums">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { day: 'numeric', timeZone: 'Europe/Rome' })}</span>
                    <span className="block text-xs text-tenue">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { weekday: 'short', timeZone: 'Europe/Rome' }).replace('.', '')}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold truncate">{nomeEvento(e)}</span>
                    <span className="block text-sm text-tenue truncate">{[e.citta, e.operatore && nomeCompleto(e.operatore), conProject && e.project && nomeCompleto(e.project)].filter(Boolean).join(', ')}</span>
                  </span>
                  <span className="max-md:col-span-3 max-md:order-last">
                    <Barra ricavi={b.ricavo ?? 0} costi={b.costi} scala={scala} />
                  </span>
                  <Cifre ricavi={b.ricavo} costi={b.costi} />
                  <span className="max-md:hidden justify-self-end"><Fattura conti={e.conti} /></span>
                </Link>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}

/** A che punto è la fattura: un'icona colorata, il dettaglio al passaggio del mouse */
function Fattura({ conti }: { conti: EventoRiga['conti'] }) {
  const p = 'text-xs font-semibold rounded-full px-2.5 py-1 inline-flex items-center gap-1 whitespace-nowrap'
  if (conti?.incassata) return <span className={cn(p, 'bg-ok-tenue text-ok')}>Incassata</span>
  if (conti?.fattura_numero) return <span className={cn(p, 'bg-avviso text-avviso-testo')} title={`Fattura n. ${conti.fattura_numero}`}><FileText className="size-3.5" aria-hidden />Da incassare</span>
  return null
}

/* ---------- Operatori ---------- */

/** Un mese o un anno, con le frecce; carica gli eventi del periodo e li passa alla vista */
function ConPeriodo({ periodo, mese, anno, imposta, children }: {
  periodo: Periodo; mese: string; anno: number; imposta: Imposta; children: (eventi: EventoRiga[]) => React.ReactNode
}) {
  const { dal, al } = periodo === 'mese' ? confiniMese(mese) : confiniAnno(anno)
  const { data, isPending, error } = useContiPeriodo(dal, al)
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="inline-flex bg-superficie border border-bordo rounded-xl p-1 gap-0.5">
          {([['mese', 'Mese'], ['anno', 'Anno']] as [Periodo, string][]).map(([v, testo]) => (
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
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : children(data)}
    </div>
  )
}

function Operatori({ eventi, periodo, mese, imposta }: { eventi: EventoRiga[]; periodo: Periodo; mese: string; imposta: Imposta }) {
  const [sopra, setSopra] = useState<string>()
  const operatori = spesePerOperatore(eventi)
  if (operatori.length === 0) return <Card><Vuoto titolo="Nessun operatore" /></Card>

  const totale = operatori.reduce((t, o) => t + o.totale, 0)
  const tasca = operatori.reduce((t, o) => t + o.tasca, 0)
  // Le spese di tutti per fascia, per la barra grande e la legenda
  const fasce = perFascia(operatori.flatMap((o) => o.perVoce))
  const massimo = Math.max(...operatori.map((o) => o.totale), 1)
  const apri = (id: string) => imposta({ vista: 'eventi', operatore: id, mese: periodo === 'mese' ? mese : `${mese.slice(0, 4)}-01`, periodo: null, anno: null })

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
          <Cifra etichetta="Spese" valore={totale} grande />
          {tasca > 0 && <Cifra etichetta="Da rimborsare" valore={tasca} icona={<Wallet className="size-4 text-avviso-icona" aria-hidden />} />}
        </div>
        {totale > 0 && <BarraVoci voci={operatori.flatMap((o) => o.perVoce)} larghezza={1} alta />}
        <p className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {fasce.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: f.colore }} aria-hidden />
              {f.etichetta} <span className="text-tenue tabular-nums">{euro(f.importo)}</span>
            </span>
          ))}
        </p>
      </div>

      <Card className="divide-y divide-bordo">
        {operatori.map((o) => (
          <button key={o.id} onClick={() => apri(o.id)} onMouseEnter={() => setSopra(o.id)} onMouseLeave={() => setSopra(undefined)}
            className="relative w-full text-left grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_8rem] items-center gap-x-5 gap-y-2 px-4 py-3.5 cursor-pointer hover:bg-sfondo/70">
            <span className="min-w-0">
              <span className="block font-semibold truncate">{o.nome}</span>
              <span className="inline-flex items-center gap-1 text-sm text-tenue" title={`${o.eventi} eventi`}>
                <CalendarDays className="size-3.5" aria-hidden />{o.eventi}
              </span>
            </span>
            <span className="max-md:col-span-2 max-md:order-last">
              {o.totale > 0 ? <BarraVoci voci={o.perVoce} larghezza={o.totale / massimo} /> : <span className="block h-3 rounded-full bg-sfondo" />}
            </span>
            <span className="text-right">
              <span className="block font-semibold tabular-nums">{euro(o.totale)}</span>
              {o.tasca > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-avviso-testo tabular-nums" title="Da rimborsare">
                  <Wallet className="size-3.5" aria-hidden />{euro(o.tasca)}
                </span>
              )}
            </span>
            {sopra === o.id && o.perVoce.length > 0 && (
              <span className="absolute z-10 right-4 top-full -mt-2 rounded-lg bg-superficie border border-bordo shadow-md px-3 py-2 text-sm min-w-52 pointer-events-none">
                {o.perVoce.map((v) => (
                  <span key={v.voce} className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: coloreVoce(v.voce) }} />{etichettaVoce(v.voce)}</span>
                    <span className="tabular-nums">{euro(v.importo)}</span>
                  </span>
                ))}
              </span>
            )}
          </button>
        ))}
      </Card>
    </>
  )
}

/** Barra divisa per tipo di spesa, lunga in proporzione (larghezza da 0 a 1) */
function BarraVoci({ voci, larghezza, alta }: { voci: { voce: Voce; importo: number }[]; larghezza: number; alta?: boolean }) {
  const fasce = perFascia(voci)
  const totale = fasce.reduce((t, f) => t + f.importo, 0) || 1
  return (
    <span className={cn('flex gap-[2px]', alta ? 'h-4' : 'h-3')} style={{ width: `${Math.max(larghezza * 100, 2)}%` }} aria-hidden>
      {fasce.map((f) => (
        <span key={f.id} className="h-full first:rounded-l-[4px] last:rounded-r-[4px]" style={{ width: `${(f.importo / totale) * 100}%`, background: f.colore }} />
      ))}
    </span>
  )
}

/* ---------- Regioni ---------- */

function Regioni({ eventi, periodo, mese, imposta }: { eventi: EventoRiga[]; periodo: Periodo; mese: string; imposta: Imposta }) {
  const t = totali(eventi)
  const regioni = raggruppa(eventi, 'regione').toSorted((a, b) => b.ricavi - a.ricavi)
  if (regioni.length === 0) return <Card><Vuoto titolo="Nessun evento" /></Card>
  return (
    <>
      <Riepilogo ricavi={t.ricavi} costi={t.costi} />
      <Righe righe={regioni}
        onApri={(chiave) => imposta({ vista: 'eventi', regione: chiave, mese: periodo === 'mese' ? mese : `${mese.slice(0, 4)}-01`, periodo: null, anno: null })} />
    </>
  )
}

/* ---------- Il linguaggio comune: barra, riepilogo, righe ---------- */

/** Barra lunga quanto i ricavi (rispetto a "scala"): arancione i costi, verde quello che resta. In perdita, tutta arancione. */
function Barra({ ricavi, costi, scala, alta }: { ricavi: number; costi: number; scala: number; alta?: boolean }) {
  const lungo = Math.max(ricavi, costi)
  if (lungo === 0) return <span className={cn('block rounded-full bg-sfondo', alta ? 'h-5' : 'h-3')} aria-hidden />
  const quotaCosti = Math.min(costi / lungo, 1)
  return (
    <span className={cn('flex gap-[2px]', alta ? 'h-5' : 'h-3')} style={{ width: `${(lungo / scala) * 100}%` }} aria-hidden>
      {costi > 0 && <span className="h-full rounded-l-[4px] last:rounded-r-[4px]" style={{ width: `${quotaCosti * 100}%`, background: COSTI }} />}
      {ricavi > costi && <span className="h-full rounded-r-[4px] first:rounded-l-[4px]" style={{ width: `${(1 - quotaCosti) * 100}%`, background: RESTA }} />}
    </span>
  )
}

/** Le tre cifre del periodo, con la barra grande sotto: è anche la legenda di tutte le barre della pagina */
function Riepilogo({ ricavi, costi }: { ricavi: number; costi: number }) {
  const resta = ricavi - costi
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <Cifra etichetta="Ricavi" valore={ricavi} grande />
        <div className="flex gap-x-10 gap-y-3 flex-wrap">
          <Cifra etichetta="Costi" valore={costi} colore={COSTI} nota={ricavi ? `${percento(costi, ricavi)}%` : undefined} />
          <Cifra etichetta={resta >= 0 ? 'Resta' : 'In perdita'} valore={Math.abs(resta)} colore={resta >= 0 ? RESTA : COSTI} nota={ricavi && resta >= 0 ? `${percento(resta, ricavi)}%` : undefined} />
        </div>
      </div>
      <Barra ricavi={ricavi} costi={costi} scala={Math.max(ricavi, costi, 1)} alta />
    </div>
  )
}

function Cifra({ etichetta, valore, colore, nota, grande, icona }: { etichetta: string; valore: number; colore?: string; nota?: string; grande?: boolean; icona?: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-tenue inline-flex items-center gap-1.5">
        {colore && <span className="size-2.5 rounded-sm" style={{ background: colore }} aria-hidden />}{icona}{etichetta}
      </p>
      <p className={cn('font-semibold tabular-nums leading-tight', grande ? 'text-[34px]' : 'text-[22px]')}>
        {euro(valore)}{nota && <span className="text-sm font-medium text-tenue ml-1.5">{nota}</span>}
      </p>
    </div>
  )
}

type Riga = { chiave: string; etichetta: string; eventi: number; ricavi: number; costi: number }

/** Una riga per mese, anno o regione: nome, barra, cifre. Clic: si scende nel dettaglio. */
function Righe({ righe, onApri, evidenzia }: { righe: Riga[]; onApri: (chiave: string) => void; evidenzia?: string }) {
  const scala = Math.max(...righe.map((r) => Math.max(r.ricavi, r.costi)), 1)
  return (
    <Card className="divide-y divide-bordo">
      {righe.map((r) => {
        const vuota = r.eventi === 0
        return (
          <button key={r.chiave} onClick={() => onApri(r.chiave)} disabled={vuota}
            className={cn('w-full text-left grid grid-cols-[6.5rem_minmax(0,1fr)_auto] md:grid-cols-[8rem_minmax(0,1fr)_7.5rem] items-center gap-x-4 px-4 cursor-pointer hover:bg-sfondo/70 disabled:cursor-default disabled:hover:bg-transparent',
              vuota ? 'py-1.5' : 'py-3', evidenzia === r.chiave && 'bg-accento-tenue/40')}>
            <span className={cn('flex flex-col', vuota ? 'text-sm text-tenue/60' : 'font-semibold')}>
              {r.etichetta}
              {!vuota && <span className="text-xs font-medium text-tenue inline-flex items-center gap-1"><CalendarDays className="size-3" aria-hidden />{r.eventi}</span>}
            </span>
            {vuota ? <span /> : <Barra ricavi={r.ricavi} costi={r.costi} scala={scala} />}
            {vuota ? <span /> : <Cifre ricavi={r.ricavi} costi={r.costi} />}
          </button>
        )
      })}
    </Card>
  )
}

/** A destra di ogni barra: quanto resta (grande) e i ricavi (piccolo) */
function Cifre({ ricavi, costi }: { ricavi: number | null; costi: number }) {
  if (ricavi == null) return <span className="text-right tabular-nums text-sm text-tenue">−{euro(costi)}</span>
  const resta = ricavi - costi
  return (
    <span className="text-right leading-tight">
      <span className={cn('block font-semibold tabular-nums', resta < 0 && 'text-urgente-testo')}>{euro(resta)}</span>
      <span className="block text-xs text-tenue tabular-nums">{euro(ricavi)}</span>
    </span>
  )
}

/** Cose da sistemare: icona e numero, niente frasi */
function Segnali({ daRimborsare }: { daRimborsare: number }) {
  if (!daRimborsare) return null
  const p = 'h-8 px-3 rounded-full text-sm font-semibold inline-flex items-center gap-1.5'
  return (
    <div className="flex flex-wrap gap-2 -mt-4">
      {daRimborsare > 0 && <span className={cn(p, 'bg-avviso text-avviso-testo')}><Wallet className="size-4" aria-hidden />{euro(daRimborsare)} da rimborsare</span>}
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
