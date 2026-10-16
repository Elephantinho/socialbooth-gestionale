import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CircleDollarSign, TrendingUp } from 'lucide-react'
import { useEconomiaPeriodo } from '@/modules/costi/api'
import { contiEvento, contiPer, totaleConti } from '@/modules/costi/logic/perRegione'
import { GraficoAndamento } from '@/modules/costi/components/GraficoAndamento'
import { TabellaRegioni } from '@/modules/costi/components/TabellaRegioni'
import { euro, meseCorrente, nomeCompleto, perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Numero } from '@/shared/ui/Intestazione'
import { Caricamento } from '@/shared/ui/Stati'

const chiaveMese = (iso: string) => perCampoData(iso).slice(0, 7)

/** Ricavi, costi e margine: mese corrente, ultimi 6 mesi, regioni e classifiche */
export function ContiDelMese({ affianco }: { affianco?: React.ReactNode }) {
  const mese = meseCorrente()
  const economia = useEconomiaPeriodo(6)
  const eventi = useMemo(() => economia.data ?? [], [economia.data])
  const delMese = eventi.filter((e) => chiaveMese(e.allestimento_il) === mese)
  const conti = totaleConti(delMese.map(contiEvento))

  const andamento = useMemo(() => {
    const perMese = contiPer(eventi, (e) => chiaveMese(e.allestimento_il))
    const oggi = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - 5 + i, 1)
      const c = perMese.get(d.toLocaleDateString('sv-SE').slice(0, 7))
      return {
        mese: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
        ricavi: Math.round(c?.ricavi ?? 0), costi: Math.round(c?.costiTotali ?? 0), margine: Math.round(c?.margine ?? 0),
      }
    })
  }, [eventi])

  const perOperatore = [...contiPer(delMese.filter((e) => e.operatore), (e) => e.operatore!.id).entries()]
    .map(([id, c]) => ({ op: delMese.find((e) => e.operatore?.id === id)!.operatore!, ...c }))
    .sort((a, b) => b.eventi - a.eventi || b.margine - a.margine).slice(0, 5)
  const perCliente = [...contiPer(delMese.filter((e) => e.cliente), (e) => e.cliente!.id).entries()]
    .map(([id, c]) => ({ nome: delMese.find((e) => e.cliente?.id === id)!.cliente!.nome, ...c }))
    .sort((a, b) => b.ricavi - a.ricavi).slice(0, 5)

  return (
    <>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <Numero valore={conti.eventi} etichetta="eventi questo mese" icona={<CalendarCheck className="size-5" aria-hidden />} />
        <Numero valore={euro(Math.round(conti.ricavi))} etichetta="ricavi del mese" tono="accento" icona={<CircleDollarSign className="size-5" aria-hidden />} />
        <Numero valore={euro(Math.round(conti.costiTotali))} etichetta="costi del mese" icona={<CircleDollarSign className="size-5" aria-hidden />} />
        <Numero valore={euro(Math.round(conti.margine))} etichetta="margine del mese" tono={conti.margine < 0 ? 'urgente' : 'scuro'} icona={<TrendingUp className="size-5" aria-hidden />} />
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <Card className="flex-[2_1_480px] min-w-0 p-5 flex flex-col gap-3">
          <div>
            <TitoloSezione>Ricavi e costi, ultimi 6 mesi</TitoloSezione>
            <p className="text-sm text-tenue">Eventi chiusi con i valori finali, gli altri con quelli previsti.</p>
          </div>
          {economia.isPending ? <Caricamento className="py-10" /> : <GraficoAndamento dati={andamento} />}
        </Card>
        {affianco}
      </div>

      <TabellaRegioni mese={mese} />

      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        <Card className="p-5 flex flex-col gap-3">
          <TitoloSezione>Operatori del mese</TitoloSezione>
          {perOperatore.length === 0 ? <p className="text-sm text-tenue">Nessun evento assegnato questo mese.</p> : perOperatore.map((r, i) => (
            <Link key={r.op.id} to={`/gestione/operatori/${r.op.id}`} className="flex items-center gap-3 hover:opacity-80">
              <span className="w-5 text-sm font-bold text-tenue">{i + 1}</span>
              <Avatar nome={nomeCompleto(r.op)} foto={r.op.foto} taglia="sm" />
              <span className="flex-1 min-w-0 font-semibold truncate">{nomeCompleto(r.op)}</span>
              <span className="text-sm text-tenue">{r.eventi} eventi</span>
              <span className={cn('text-sm font-bold w-24 text-right', r.margine < 0 ? 'text-urgente-testo' : 'text-accento')}>{euro(Math.round(r.margine))}</span>
            </Link>
          ))}
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <TitoloSezione>Clienti del mese</TitoloSezione>
          {perCliente.length === 0 ? <p className="text-sm text-tenue">Nessun cliente indicato negli eventi di questo mese.</p> : perCliente.map((r, i) => (
            <div key={r.nome} className="flex items-center gap-3">
              <span className="w-5 text-sm font-bold text-tenue">{i + 1}</span>
              <span className="flex-1 min-w-0 font-semibold truncate">{r.nome}</span>
              <span className="text-sm text-tenue">{r.eventi} eventi</span>
              <span className="text-sm font-bold w-24 text-right">{euro(Math.round(r.ricavi))}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
