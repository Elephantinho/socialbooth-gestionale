import { Link } from 'react-router-dom'
import { ArrowRight, Check, CreditCard, Plus } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { usePuo } from '@/modules/auth/permessi'
import { useContiPeriodo, usePagamentiDaControllare } from '@/modules/conti/api'
import { euro, raggruppa, type EventoConti } from '@/modules/conti/conti'
import { useEventiInProgramma } from '@/modules/eventi/api'
import { RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { giaPassato, passato } from '@/modules/eventi/logic/archivio'
import { giornoRoma } from '@/modules/eventi/logic/filtri'
import { ritardo } from '@/modules/passaggi/ritardi'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const SETTIMANA = 7 * 86_400_000

/** Prima pagina dell'ufficio: oggi, cosa c'è da fare, la settimana e (a chi li vede) i soldi del mese. */
export function Panoramica() {
  const profilo = useProfilo()
  const puo = usePuo()
  const { data, isPending, error } = useEventiInProgramma()
  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />

  const adesso = Date.now()
  const oggi = giornoRoma(new Date().toISOString())
  const tutti = data
  const diOggi = tutti.filter((e) => giornoRoma(e.allestimento_il) === oggi && e.stato !== 'annullato')
  const conclusiOggi = diOggi.filter((e) => e.stato === 'completato').length
  const inProgramma = tutti.filter((e) => !passato(e))
  const settimana = inProgramma.filter((e) => new Date(e.allestimento_il).getTime() < adesso + SETTIMANA)
  const coperti = settimana.filter((e) => e.stato === 'confermato' || e.stato === 'in_corso').length

  // Cose da fare, tutte cliccabili verso l'elenco già filtrato
  const daFare = [
    { n: inProgramma.filter((e) => (e.stato === 'da_assegnare' || e.stato === 'bozza') && !giaPassato(e)).length, testo: 'da assegnare', a: '/gestione?stato=da_assegnare', tono: 'rosso' },
    { n: tutti.filter((e) => ritardo(e)).length, testo: 'in ritardo', a: '/gestione?stato=ritardo', tono: 'rosso' },
    { n: inProgramma.filter((e) => e.stato === 'proposto').length, testo: 'in attesa di risposta', a: '/gestione?stato=proposto', tono: 'arancione' },
  ].filter((x) => x.n > 0)

  const ora = new Date().getHours()
  const saluto = ora < 13 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const dataOggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-tenue font-medium">{dataOggi[0].toUpperCase() + dataOggi.slice(1)}</p>
          <h1 className="font-display text-[28px] font-semibold leading-tight">{saluto}, {profilo.nome}</h1>
        </div>
        {puo('eventi.crea') && (
          <Link to="/gestione/eventi/nuovo" className="h-11 px-5 rounded-lg bg-accento text-su-accento font-semibold text-sm flex items-center gap-2 hover:bg-accento-hover">
            <Plus className="size-[18px]" aria-hidden /> Nuovo evento
          </Link>
        )}
      </div>

      {/* Da fare: se non c'è niente, si dice che è tutto a posto */}
      {daFare.length === 0 ? (
        <Card className="p-5 flex items-center gap-4 bg-ok-tenue border-ok/20">
          <span className="size-11 rounded-full bg-ok text-white flex items-center justify-center shrink-0"><Check className="size-6" strokeWidth={3} aria-hidden /></span>
          <div>
            <p className="text-lg font-semibold text-ok">Tutto a posto</p>
            <p className="text-[15px] text-tenue">Ogni evento in programma ha il suo operatore e niente è in ritardo.</p>
          </div>
        </Card>
      ) : (
        <div className={cn('grid gap-2 md:gap-3', daFare.length === 3 ? 'grid-cols-3' : daFare.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
          {daFare.map((x) => (
            <Link key={x.testo} to={x.a} className={cn('rounded-xl border p-3 md:p-5 flex items-center justify-between gap-3 hover:shadow-sm transition',
              x.tono === 'rosso' ? 'bg-urgente-tenue border-urgente/25' : 'bg-avviso border-avviso-icona/30')}>
              <div>
                <p className={cn('text-[26px] md:text-[32px] font-semibold leading-none tabular-nums', x.tono === 'rosso' ? 'text-urgente-testo' : 'text-avviso-testo')}>{x.n}</p>
                <p className="text-[13px] md:text-base font-semibold mt-1.5 leading-snug">{x.n === 1 ? 'evento' : 'eventi'} {x.testo}</p>
              </div>
              <ArrowRight className="size-5 text-tenue max-md:hidden" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start">
          {/* Prossimi 7 giorni */}
          <Card className="p-5 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Prossimi 7 giorni</h2>
              <Link to="/gestione" className="text-sm font-semibold text-tenue hover:text-inchiostro">Eventi</Link>
            </div>
            <p className="text-[32px] font-semibold leading-none tabular-nums">{settimana.length} <span className="text-base font-medium text-tenue">eventi</span></p>
            {settimana.length > 0 && (
              <>
                <div className="h-2.5 rounded-full bg-bordo/70 overflow-hidden flex" aria-hidden>
                  <span className="bg-ok h-full" style={{ width: `${(coperti / settimana.length) * 100}%` }} />
                  <span className="bg-avviso-icona h-full" style={{ width: `${(settimana.filter((e) => e.stato === 'proposto').length / settimana.length) * 100}%` }} />
                </div>
                <p className="text-sm"><span className="font-semibold text-ok">{coperti} coperti</span><span className="text-tenue"> su {settimana.length}</span></p>
              </>
            )}
          </Card>

          {puo('soldi') && <SoldiDelMese />}
          {puo('carte') && <PagamentiDaControllare />}
      </div>

        {/* Oggi */}
        <Card className="overflow-visible">
          <div className="px-5 py-4 border-b border-bordo flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Oggi</h2>
            {diOggi.length > 0 && (
              <p className="text-sm text-tenue">
                <span className="font-semibold text-ok">{conclusiOggi} {conclusiOggi === 1 ? 'concluso' : 'conclusi'}</span> su {diOggi.length}
              </p>
            )}
          </div>
          {diOggi.length === 0 ? (
            <p className="px-5 py-8 text-tenue">Nessun evento oggi.</p>
          ) : (
            <>
              <div className="h-1.5 bg-sfondo flex" aria-hidden>
                <span className="bg-ok h-full" style={{ width: `${(conclusiOggi / diOggi.length) * 100}%` }} />
                <span className="bg-ok/40 h-full" style={{ width: `${(diOggi.filter((e) => e.stato === 'in_corso').length / diOggi.length) * 100}%` }} />
              </div>
              <div className="divide-y divide-bordo">
                {[...diOggi].sort((a, b) => a.allestimento_il.localeCompare(b.allestimento_il)).slice(0, 8)
                  .map((e) => <RigaEvento key={e.id} e={e} assegna={puo('eventi.assegna')} />)}
              </div>
              {diOggi.length > 8 && (
                <Link to={`/gestione?giorno=${oggi}`} className="block px-5 py-3 border-t border-bordo text-sm font-semibold hover:bg-sfondo">
                  Vedi tutti i {diOggi.length} eventi di oggi
                </Link>
              )}
            </>
          )}
        </Card>

    </div>
  )
}

/** Ricavi, costi e margine del mese in corso, con fatture da fare e da incassare */
function SoldiDelMese() {
  const d = new Date()
  const dal = new Date(d.getFullYear(), d.getMonth(), 1)
  const al = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const { data } = useContiPeriodo(dal, al)
  if (!data) return <Card className="p-5"><Caricamento /></Card>
  const eventi = data.map((e) => ({ ...e, conti: Array.isArray(e.conti) ? e.conti[0] ?? null : e.conti, spese: e.spese ?? [] }))
  const tot = raggruppa(eventi as EventoConti[], 'regione').reduce((t, g) => ({ ricavi: t.ricavi + g.ricavi, costi: t.costi + g.costi }), { ricavi: 0, costi: 0 })
  const margine = tot.ricavi - tot.costi
  const daFatturare = eventi.filter((e) => e.stato === 'completato' && !e.conti?.fattura_numero).length
  const daIncassare = eventi.filter((e) => e.conti?.fattura_numero && !e.conti.incassata).length
  const mese = d.toLocaleDateString('it-IT', { month: 'long' })

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Soldi di {mese}</h2>
        <Link to="/gestione/conti" className="text-sm font-semibold text-tenue hover:text-inchiostro">Conti</Link>
      </div>
      <div>
        <p className="text-sm font-semibold text-tenue">Margine</p>
        <p className={cn('text-[32px] font-semibold leading-none tabular-nums', margine >= 0 ? 'text-ok' : 'text-urgente-testo')}>{euro(margine)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-tenue">Ricavi</p><p className="font-semibold tabular-nums text-base">{euro(tot.ricavi)}</p></div>
        <div><p className="text-tenue">Costi</p><p className="font-semibold tabular-nums text-base">{euro(tot.costi)}</p></div>
      </div>
      {(daFatturare > 0 || daIncassare > 0) && (
        <div className="flex flex-wrap gap-2">
          {daFatturare > 0 && <Link to="/gestione/conti" className="text-sm font-semibold rounded-lg px-3 py-1.5 bg-urgente-tenue text-urgente-testo">{daFatturare} da fatturare</Link>}
          {daIncassare > 0 && <Link to="/gestione/conti" className="text-sm font-semibold rounded-lg px-3 py-1.5 bg-avviso text-avviso-testo">{daIncassare} da incassare</Link>}
        </div>
      )}
    </Card>
  )
}

function PagamentiDaControllare() {
  const { data } = usePagamentiDaControllare()
  const n = data?.length ?? 0
  if (!n) return null
  return (
    <Link to="/gestione/carte" className="rounded-xl border border-avviso-icona/30 bg-avviso p-5 flex items-center gap-4 hover:shadow-sm transition">
      <CreditCard className="size-6 text-avviso-testo shrink-0" aria-hidden />
      <p className="flex-1"><span className="font-semibold text-avviso-titolo">{n} {n === 1 ? 'pagamento' : 'pagamenti'} con la carta</span><span className="text-avviso-testo"> da controllare</span></p>
      <ArrowRight className="size-5 text-tenue" aria-hidden />
    </Link>
  )
}
