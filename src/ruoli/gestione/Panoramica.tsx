import { Link, useNavigate } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { useProfilo } from '@/modules/auth/sessione'
import { usePuo } from '@/modules/auth/permessi'
import { useContiPeriodo, useIncassi, usePagamentiDaControllare, useRimborsi } from '@/modules/conti/api'
import { useClienti } from '@/modules/clienti/api'
import { controllaCliente, daCliente } from '@/modules/clienti/clienti'
import { GIORNI_PER_INCASSARE, euro, riepilogoIncassi, rimborsiPerOperatore, totali } from '@/modules/conti/conti'
import { useEventiInProgramma } from '@/modules/eventi/api'
import { AssegnaRapido } from '@/modules/eventi/components/RigaEvento'
import { giaPassato, passato } from '@/modules/eventi/logic/archivio'
import { copertura } from '@/modules/eventi/logic/giorni'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { riassuntoDelGiorno } from '@/modules/eventi/logic/riassunto'
import type { EventoGestione } from '@/modules/eventi/types'
import { avanzamento } from '@/modules/passaggi/passaggi'
import { ritardo } from '@/modules/passaggi/ritardi'
import { cn } from '@/shared/lib/cn'
import { confiniMese, giornoBreve, giornoLungo, giornoRoma, giornoSettimana, maiuscola, meseRoma, piuGiorni } from '@/shared/lib/date'
import { nomeCompleto, ora } from '@/shared/lib/formato'
import { useAdesso } from '@/shared/lib/tempo'
import { Card } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/**
 * Prima pagina dell'ufficio. L'amministrazione vede i soldi da sistemare; gli altri la giornata degli eventi.
 */
export function Panoramica() {
  return useProfilo().ruolo === 'amministrazione' ? <PanoramicaSoldi /> : <PanoramicaEventi />
}

const conta = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`

const salutoDelle = (adesso: number) => { const ore = new Date(adesso).getHours(); return ore < 13 ? 'Buongiorno' : ore < 18 ? 'Buon pomeriggio' : 'Buonasera' }

/**
 * Per admin, project e gestore: in cima due frasi che dicono com'è la giornata; poi oggi come una
 * linea del tempo, la settimana a pallini, le cose da sistemare e (a chi li vede) i soldi del mese.
 */
function PanoramicaEventi() {
  const profilo = useProfilo()
  const puo = usePuo()
  const adesso = useAdesso()
  const { data, isPending, error } = useEventiInProgramma()
  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />

  const oggi = giornoRoma(adesso)
  // I ritardi degli operatori li segue l'ufficio (admin, gestore), non il project
  const conRitardi = profilo.ruolo !== 'project'
  const inProgramma = data.filter((e) => !passato(e, adesso))
  const diOggi = data.filter((e) => giornoRoma(e.allestimento_il) === oggi && e.stato !== 'annullato')
    .toSorted((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))
  const frase = riassuntoDelGiorno(data, adesso)

  const saluto = salutoDelle(adesso)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-72 max-w-[52rem]">
          <p className="text-tenue font-medium">{saluto} {profilo.nome}, è {giornoLungo(oggi)}.</p>
          <p className="font-display text-[24px] md:text-[28px] font-semibold leading-snug mt-2 text-pretty">{frase}</p>
        </div>
        {puo('eventi.crea') && (
          <Link to="/gestione/eventi/nuovo" className="h-11 px-5 rounded-lg bg-accento text-su-accento font-semibold text-sm flex items-center gap-2 hover:bg-accento-hover">
            <Plus className="size-[18px]" aria-hidden /> Nuovo evento
          </Link>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] items-start">
        <div className="flex flex-col gap-8 min-w-0">
          <Oggi eventi={diOggi} oggi={oggi} adesso={adesso} assegna={puo('eventi.assegna')} conRitardi={conRitardi} />
          <Settimana eventi={inProgramma} oggi={oggi} />
        </div>
        <div className="flex flex-col gap-8 min-w-0">
          <DaSistemare eventi={inProgramma} tutti={data} adesso={adesso} conRitardi={conRitardi} conCarte={puo('carte')} />
          {puo('soldi') && <SoldiDelMese adesso={adesso} />}
        </div>
      </div>
    </div>
  )
}

/* ---------- Per l'amministrazione: i soldi da sistemare ---------- */

/** Incassi, rimborsi, pagamenti con la carta e clienti da completare, ognuno con il suo pulsante; poi il mese */
function PanoramicaSoldi() {
  const profilo = useProfilo()
  const adesso = useAdesso()
  const oggi = giornoRoma(adesso)
  const incassi = useIncassi(false)
  const rimborsi = useRimborsi(false)
  const pagamenti = usePagamentiDaControllare()
  const clienti = useClienti()
  if (incassi.isPending || rimborsi.isPending) return <Caricamento />
  if (incassi.error || rimborsi.error) return <Errore errore={incassi.error ?? rimborsi.error} />

  const fatture = incassi.data
  const ri = riepilogoIncassi(fatture, oggi)
  const persone = rimborsiPerOperatore(rimborsi.data)
  const daRimborsare = persone.reduce((t, o) => t + o.totale, 0)
  const nPagamenti = pagamenti.data?.length ?? 0
  const incompleti = (clienti.data ?? []).filter((c) => Object.keys(controllaCliente(daCliente(c))).length > 0)

  const cose: Cosa[] = [
    fatture.length > 0 && { chiave: 'incassi', urgente: ri.inRitardo > 0, azione: 'Incassa', a: '/gestione/conti?vista=incassi',
      testo: `${conta(fatture.length, 'fattura', 'fatture')} da incassare`,
      esempi: fatture.slice(0, 2).map((f) => `${f.evento.cliente?.nome ?? nomeEvento(f.evento)}, n. ${f.fattura_numero}`).join('; ') + (fatture.length > 2 ? '…' : '') },
    persone.length > 0 && { chiave: 'rimborsi', urgente: false, azione: 'Rimborsa', a: '/gestione/conti?vista=rimborsi',
      testo: `${euro(daRimborsare)} da rimborsare`, esempi: persone.map((o) => o.nome).join(', ') },
    nPagamenti > 0 && { chiave: 'carte', urgente: false, azione: 'Controlla', a: '/gestione/carte',
      testo: `${conta(nPagamenti, 'pagamento', 'pagamenti')} con la carta da controllare` },
    incompleti.length > 0 && { chiave: 'clienti', urgente: false, azione: 'Completa', a: '/gestione/clienti',
      testo: `${conta(incompleti.length, 'cliente', 'clienti')} senza i dati per la fattura`, esempi: incompleti.slice(0, 3).map((c) => c.nome).join(', ') },
  ].filter(Boolean) as Cosa[]

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-[52rem]">
        <p className="text-tenue font-medium">{salutoDelle(adesso)} {profilo.nome}, è {giornoLungo(oggi)}.</p>
        <p className="font-display text-[24px] md:text-[28px] font-semibold leading-snug mt-2 text-pretty">
          {fatture.length === 0 ? 'Nessuna fattura da incassare.' : `Da incassare ${euro(ri.totale)} in ${conta(fatture.length, 'fattura', 'fatture')}.`}
        </p>
        {ri.inRitardo > 0 && (
          <p className="text-[17px] leading-snug mt-2 text-urgente-testo font-medium">
            {ri.inRitardo === 1 ? '1 fattura aspetta' : `${ri.inRitardo} fatture aspettano`} da più di {GIORNI_PER_INCASSARE} giorni: {euro(ri.totaleInRitardo)}.
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
        <section className="flex flex-col gap-3 min-w-0">
          <h2 className="text-lg font-semibold">Da sistemare</h2>
          {cose.length === 0 ? (
            <p className="flex items-center gap-2 text-ok font-medium"><Check className="size-5" strokeWidth={2.5} aria-hidden /> Niente da sistemare.</p>
          ) : (
            <Card className="divide-y divide-bordo">{cose.map((c) => <RigaCosa key={c.chiave} cosa={c} />)}</Card>
          )}
        </section>
        <div className="min-w-0"><SoldiDelMese adesso={adesso} /></div>
      </div>
    </div>
  )
}

/* ---------- Oggi: una linea del tempo ---------- */

function Oggi({ eventi, oggi, adesso, assegna, conRitardi }: { eventi: EventoGestione[]; oggi: string; adesso: number; assegna: boolean; conRitardi: boolean }) {
  const naviga = useNavigate()
  const visibili = eventi.slice(0, 8)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Oggi</h2>
      {eventi.length === 0 ? (
        <p className="text-tenue">Nessun evento oggi.</p>
      ) : (
        <Card className="overflow-visible py-1.5">
          <ol>
            {visibili.map((e, i) => {
              const manca = conRitardi ? ritardo(e, adesso) : null
              const finito = e.stato === 'completato'
              return (
                <li key={e.id} role="link" tabIndex={0}
                  onClick={() => naviga(`/gestione/eventi/${e.id}`)}
                  onKeyDown={(k) => { if (k.key === 'Enter') naviga(`/gestione/eventi/${e.id}`) }}
                  className="flex items-stretch gap-3 px-4 cursor-pointer hover:bg-sfondo focus-visible:outline-2 focus-visible:outline-accento">
                  <span className={cn('w-12 shrink-0 py-3 text-sm font-semibold tabular-nums', finito && 'text-tenue')}>{ora(e.allestimento_il)}</span>
                  {/* Il filo della giornata: un pallino per evento, colorato come il suo stato */}
                  <span className="flex flex-col items-center w-3 shrink-0" aria-hidden>
                    <span className={cn('w-px h-[18px]', i === 0 ? 'bg-transparent' : 'bg-bordo-forte')} />
                    <span className={cn('size-3 rounded-full shrink-0 border-2', puntino(e, manca))} />
                    <span className={cn('w-px flex-1', i === visibili.length - 1 ? 'bg-transparent' : 'bg-bordo-forte')} />
                  </span>
                  <div className={cn('flex-1 min-w-0 py-2.5', finito && 'opacity-60')}>
                    <p className="font-semibold truncate">{nomeEvento(e)}</p>
                    <p className="text-sm text-tenue truncate">
                      {e.citta}{e.operatore ? `, con ${nomeCompleto(e.operatore)}` : ''}
                    </p>
                    <div className="sm:hidden text-sm mt-0.5" onClick={(ev) => ev.stopPropagation()}>
                      <StatoOggi e={e} manca={manca} adesso={adesso} assegna={assegna} />
                    </div>
                  </div>
                  <div className="self-center shrink-0 text-sm max-sm:hidden" onClick={(ev) => ev.stopPropagation()}>
                    <StatoOggi e={e} manca={manca} adesso={adesso} assegna={assegna} />
                  </div>
                </li>
              )
            })}
          </ol>
          {eventi.length > visibili.length && (
            <Link to={`/gestione?giorno=${oggi}`} className="block px-4 py-2.5 text-sm font-semibold text-tenue hover:text-inchiostro">
              Vedi tutti i {eventi.length} eventi di oggi
            </Link>
          )}
        </Card>
      )}
    </section>
  )
}

/** A che punto è un evento di oggi, in poche parole (o il pulsante per assegnarlo) */
function StatoOggi({ e, manca, adesso, assegna }: { e: EventoGestione; manca: string | null; adesso: number; assegna: boolean }) {
  if (manca) return <span className="font-semibold text-urgente-testo">{manca}</span>
  switch (e.stato) {
    case 'completato': return <span className="text-tenue inline-flex items-center gap-1"><Check className="size-4" aria-hidden />Concluso</span>
    case 'in_corso': return <span className="font-semibold text-ok">{avanzamento(e.ultimo_passaggio)}</span>
    case 'proposto': return <span className="text-avviso-testo">Aspetta risposta</span>
    case 'confermato': return <span className="text-ok">Confermato</span>
    default: return assegna && !giaPassato(e, adesso)
      ? <AssegnaRapido eventoId={e.id} destra piccolo />
      : <span className="font-semibold text-urgente-testo">Senza operatore</span>
  }
}

function puntino(e: EventoGestione, manca: string | null) {
  if (manca || e.stato === 'da_assegnare' || e.stato === 'bozza') return 'border-urgente bg-urgente'
  if (e.stato === 'proposto') return 'border-avviso-icona bg-superficie'
  if (e.stato === 'completato') return 'border-ok bg-ok'
  if (e.stato === 'in_corso') return 'border-ok bg-ok/40'
  return 'border-ok bg-superficie'
}

/* ---------- La settimana: sette giorni, un pallino per evento ---------- */

const COLORE_SETTIMANA = { coperto: 'bg-ok', attesa: 'bg-avviso-icona', scoperto: 'bg-urgente' }
const MAX_PALLINI = 12
const ORDINE = Object.keys(COLORE_SETTIMANA)
const tipo = (e: EventoGestione): keyof typeof COLORE_SETTIMANA =>
  ['confermato', 'in_corso', 'completato'].includes(e.stato) ? 'coperto' : e.stato === 'proposto' ? 'attesa' : 'scoperto'

function Settimana({ eventi, oggi }: { eventi: EventoGestione[]; oggi: string }) {
  const giorni = Array.from({ length: 7 }, (_, i) => piuGiorni(oggi, i))
  const nellaSettimana = eventi.filter((e) => { const g = giornoRoma(e.allestimento_il); return g >= oggi && g <= giorni[6] && e.stato !== 'annullato' })
  const { totale, coperti } = copertura(nellaSettimana)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">I prossimi sette giorni</h2>
        <p className="text-sm text-tenue">
          {totale === 0 ? 'Nessun evento.' : totale === coperti ? `${totale} eventi, tutti con l'operatore.` : `${totale} eventi, ${coperti} con l'operatore.`}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {giorni.map((g) => {
          const delGiorno = nellaSettimana.filter((e) => giornoRoma(e.allestimento_il) === g)
            .toSorted((a, b) => ORDINE.indexOf(tipo(a)) - ORDINE.indexOf(tipo(b)))
          const scoperti = delGiorno.filter((e) => tipo(e) === 'scoperto').length
          return (
            <Link key={g} to={`/gestione?giorno=${g}`} title={`${giornoBreve(g)}: ${delGiorno.length} eventi`}
              className={cn('rounded-lg border bg-superficie px-1.5 sm:px-2 pt-2 pb-2.5 min-h-24 min-w-0 flex flex-col gap-1.5 hover:border-inchiostro/40 transition-colors',
                g === oggi ? 'border-inchiostro' : 'border-bordo')}>
              <span className="flex max-sm:flex-col sm:items-baseline sm:gap-1">
                <span className="text-xs text-tenue">{giornoSettimana(g)}</span>
                <span className="text-[17px] font-semibold tabular-nums leading-none">{Number(g.slice(8))}</span>
              </span>
              {delGiorno.length === 0 ? <span className="text-xs text-tenue/60 mt-auto max-sm:hidden">libero</span> : (
                <span className="flex flex-wrap gap-1" aria-label={`${delGiorno.length} eventi, ${scoperti} senza operatore`}>
                  {delGiorno.slice(0, MAX_PALLINI).map((e) => <span key={e.id} className={cn('size-2 rounded-full', COLORE_SETTIMANA[tipo(e)])} />)}
                  {delGiorno.length > MAX_PALLINI && <span className="text-[11px] leading-none text-tenue">+{delGiorno.length - MAX_PALLINI}</span>}
                </span>
              )}
            </Link>
          )
        })}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tenue">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ok" />ha l'operatore</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-avviso-icona" />aspetta risposta</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-urgente" />senza operatore</span>
      </p>
    </section>
  )
}

/* ---------- Da sistemare: frasi con il loro pulsante ---------- */

type Cosa = { chiave: string; testo: string; esempi?: string; azione: string; a: string; urgente: boolean }

function DaSistemare({ eventi, tutti, adesso, conRitardi, conCarte }: { eventi: EventoGestione[]; tutti: EventoGestione[]; adesso: number; conRitardi: boolean; conCarte: boolean }) {
  const oggi = giornoRoma(adesso)
  const daAssegnare = eventi.filter((e) => (e.stato === 'da_assegnare' || e.stato === 'bozza') && !giaPassato(e, adesso))
    .toSorted((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))
  const inAttesa = eventi.filter((e) => e.stato === 'proposto')
  const inRitardo = conRitardi ? tutti.filter((e) => ritardo(e, adesso)) : []
  const quando = (e: EventoGestione) => { const g = giornoRoma(e.allestimento_il); return g === oggi ? 'oggi' : g === piuGiorni(oggi, 1) ? 'domani' : giornoBreve(g).toLowerCase() }

  const cose: Cosa[] = [
    inRitardo.length > 0 && { chiave: 'ritardo', urgente: true, azione: 'Vedi', a: '/gestione?stato=ritardo',
      testo: inRitardo.length === 1 ? '1 evento è in ritardo' : `${inRitardo.length} eventi sono in ritardo` },
    daAssegnare.length > 0 && { chiave: 'assegnare', urgente: true, azione: 'Assegna', a: '/gestione?stato=da_assegnare',
      testo: daAssegnare.length === 1 ? '1 evento non ha ancora un operatore' : `${daAssegnare.length} eventi non hanno ancora un operatore`,
      esempi: daAssegnare.slice(0, 2).map((e) => `${nomeEvento(e)}, ${quando(e)}`).join('; ') + (daAssegnare.length > 2 ? '…' : '') },
    inAttesa.length > 0 && { chiave: 'attesa', urgente: false, azione: 'Vedi', a: '/gestione?stato=proposto',
      testo: inAttesa.length === 1 ? '1 operatore deve ancora rispondere' : `${inAttesa.length} operatori devono ancora rispondere` },
  ].filter(Boolean) as Cosa[]

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Da sistemare</h2>
      {cose.length === 0 ? (
        <p className="flex items-center gap-2 text-ok font-medium">
          <Check className="size-5" strokeWidth={2.5} aria-hidden /> Niente da sistemare: ogni evento ha il suo operatore.
        </p>
      ) : (
        <Card className="divide-y divide-bordo">
          {cose.map((c) => <RigaCosa key={c.chiave} cosa={c} />)}
        </Card>
      )}
      {conCarte && <PagamentiDaControllare />}
    </section>
  )
}

function RigaCosa({ cosa }: { cosa: Cosa }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className={cn('size-2.5 rounded-full shrink-0', cosa.urgente ? 'bg-urgente' : 'bg-avviso-icona')} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-snug">{cosa.testo}</p>
        {cosa.esempi && <p className="text-sm text-tenue truncate">{cosa.esempi}</p>}
      </div>
      <Link to={cosa.a} className={cn('h-9 px-3 rounded-lg text-sm font-semibold flex items-center shrink-0',
        cosa.urgente ? 'bg-inchiostro text-white hover:bg-inchiostro/85' : 'border border-bordo-forte hover:bg-sfondo')}>
        {cosa.azione}
      </Link>
    </div>
  )
}

function PagamentiDaControllare() {
  const { data } = usePagamentiDaControllare()
  const n = data?.length ?? 0
  if (!n) return null
  return (
    <Card>
      <RigaCosa cosa={{ chiave: 'carte', urgente: false, azione: 'Controlla', a: '/gestione/carte',
        testo: n === 1 ? '1 pagamento con la carta da controllare' : `${n} pagamenti con la carta da controllare` }} />
    </Card>
  )
}

/* ---------- I soldi del mese, detti a parole ---------- */

function SoldiDelMese({ adesso }: { adesso: number }) {
  const mese = meseRoma(adesso)
  const { dal, al } = confiniMese(mese)
  const { data } = useContiPeriodo(dal, al)
  const nome = maiuscola(new Date(adesso).toLocaleDateString('it-IT', { month: 'long', timeZone: 'Europe/Rome' }))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{nome}</h2>
        <Link to="/gestione/conti" className="text-sm font-semibold text-tenue hover:text-inchiostro">Apri i conti</Link>
      </div>
      {!data ? <Caricamento /> : (() => {
        const t = totali(data)
        if (t.ricavi === 0 && t.costi === 0) return <p className="text-tenue">Ancora nessun prezzo o spesa questo mese.</p>
        return (
          <Card className="p-4 flex flex-col gap-3">
            <p className="text-[17px] leading-snug">
              {euro(t.ricavi)} di ricavi e {euro(t.costi)} di costi: {t.margine >= 0 ? 'restano ' : 'mancano '}
              <span className={cn('font-semibold tabular-nums', t.margine >= 0 ? 'text-ok' : 'text-urgente-testo')}>{euro(Math.abs(t.margine))}</span>.
            </p>
            {/* Quanta parte dei ricavi se ne va in costi */}
            {t.ricavi > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="h-2 rounded-full bg-ok/25 overflow-hidden" aria-hidden>
                  <div className="h-full bg-urgente/70" style={{ width: `${Math.min(100, (t.costi / t.ricavi) * 100)}%` }} />
                </div>
                <p className="text-sm text-tenue">I costi sono il {Math.round((t.costi / t.ricavi) * 100)}% dei ricavi.</p>
              </div>
            )}
          </Card>
        )
      })()}
    </section>
  )
}
