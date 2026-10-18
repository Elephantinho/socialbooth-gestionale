import { Link } from 'react-router-dom'
import { ArrowRight, Check, CreditCard, Plus } from 'lucide-react'
import { useProfilo } from '@/modules/auth/sessione'
import { usePuo } from '@/modules/auth/permessi'
import { useContiPeriodo, usePagamentiDaControllare } from '@/modules/conti/api'
import { euro, totali } from '@/modules/conti/conti'
import { useEventiInProgramma } from '@/modules/eventi/api'
import { RigaEvento } from '@/modules/eventi/components/RigaEvento'
import { giaPassato, passato } from '@/modules/eventi/logic/archivio'
import { BarraCoperti } from '@/modules/eventi/components/BarraCoperti'
import { ritardo } from '@/modules/passaggi/ritardi'
import { cn } from '@/shared/lib/cn'
import { confiniMese, giornoLungo, giornoRoma, maiuscola, meseRoma, piuGiorni } from '@/shared/lib/date'
import { useAdesso } from '@/shared/lib/tempo'
import { Card } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/** Prima pagina dell'ufficio: oggi, cosa c'è da fare, la settimana e (a chi li vede) i soldi del mese. */
export function Panoramica() {
  const profilo = useProfilo()
  const puo = usePuo()
  const adesso = useAdesso()
  const { data, isPending, error } = useEventiInProgramma()
  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />

  const oggi = giornoRoma(adesso)
  const tutti = data
  const diOggi = tutti.filter((e) => giornoRoma(e.allestimento_il) === oggi && e.stato !== 'annullato')
  const conclusiOggi = diOggi.filter((e) => e.stato === 'completato').length
  const inProgramma = tutti.filter((e) => !passato(e, adesso))
  // Da oggi ai prossimi 6 giorni (gli aperti dei giorni scorsi stanno tra i "da fare")
  const settimana = inProgramma.filter((e) => { const g = giornoRoma(e.allestimento_il); return g >= oggi && g <= piuGiorni(oggi, 6) })

  // Cose da fare, tutte cliccabili verso l'elenco già filtrato.
  // I ritardi degli operatori li segue l'ufficio (admin, gestore): il project non li ha tra i suoi "da fare".
  const vedeRitardi = profilo.ruolo !== 'project'
  const daFare = [
    { n: inProgramma.filter((e) => (e.stato === 'da_assegnare' || e.stato === 'bozza') && !giaPassato(e, adesso)).length, testo: 'da assegnare', a: '/gestione?stato=da_assegnare', tono: 'rosso' },
    { n: vedeRitardi ? tutti.filter((e) => ritardo(e, adesso)).length : 0, testo: 'in ritardo', a: '/gestione?stato=ritardo', tono: 'rosso' },
    { n: inProgramma.filter((e) => e.stato === 'proposto').length, testo: 'in attesa di risposta', a: '/gestione?stato=proposto', tono: 'arancione' },
  ].filter((x) => x.n > 0)

  const ora = new Date(adesso).getHours()
  const saluto = ora < 13 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-tenue font-medium">{maiuscola(giornoLungo(oggi))}</p>
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
            <p className="text-[15px] text-tenue">Ogni evento in programma ha il suo operatore{vedeRitardi && ' e niente è in ritardo'}.</p>
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
            <BarraCoperti eventi={settimana} />
          </Card>

          {puo('soldi') && <SoldiDelMese adesso={adesso} />}
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
                {diOggi.toSorted((a, b) => a.allestimento_il.localeCompare(b.allestimento_il)).slice(0, 8)
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
function SoldiDelMese({ adesso }: { adesso: number }) {
  const { dal, al } = confiniMese(meseRoma(adesso))
  const { data } = useContiPeriodo(dal, al)
  if (!data) return <Card className="p-5"><Caricamento /></Card>
  const { ricavi, costi, margine, daFatturare, daIncassare } = totali(data)
  const mese = new Date(adesso).toLocaleDateString('it-IT', { month: 'long' })

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
        <div><p className="text-tenue">Ricavi</p><p className="font-semibold tabular-nums text-base">{euro(ricavi)}</p></div>
        <div><p className="text-tenue">Costi</p><p className="font-semibold tabular-nums text-base">{euro(costi)}</p></div>
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
