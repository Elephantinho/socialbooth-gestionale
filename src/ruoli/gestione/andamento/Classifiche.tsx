import { Link } from 'react-router-dom'
import { contiPer, type EventoEconomico } from '@/modules/costi/logic/perRegione'
import { euro, nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'

type Evento = EventoEconomico & {
  operatore: { id: string; nome: string; cognome: string; foto: string | null; tariffa_oraria: number | null } | null
  cliente: { id: string; nome: string } | null
}

/** Operatori e clienti del periodo, ordinati */
export function Classifiche({ eventi }: { eventi: Evento[] }) {
  const perOperatore = [...contiPer(eventi.filter((e) => e.operatore), (e) => e.operatore!.id).entries()]
    .map(([id, c]) => ({ op: eventi.find((e) => e.operatore?.id === id)!.operatore!, ...c }))
    .sort((a, b) => b.eventi - a.eventi || b.margine - a.margine).slice(0, 5)
  const perCliente = [...contiPer(eventi.filter((e) => e.cliente), (e) => e.cliente!.id).entries()]
    .map(([id, c]) => ({ nome: eventi.find((e) => e.cliente?.id === id)!.cliente!.nome, ...c }))
    .sort((a, b) => b.ricavi - a.ricavi).slice(0, 5)

  return (
    <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
      <Card className="p-5 flex flex-col gap-3">
        <TitoloSezione>Operatori</TitoloSezione>
        {perOperatore.length === 0 ? <p className="text-sm text-tenue">Nessun evento assegnato nel periodo.</p> : perOperatore.map((r, i) => (
          <Link key={r.op.id} to={`/gestione/operatori/${r.op.id}`} className="flex items-center gap-3 hover:opacity-80">
            <span className="w-5 text-sm font-semibold text-tenue">{i + 1}</span>
            <Avatar nome={nomeCompleto(r.op)} foto={r.op.foto} taglia="sm" />
            <span className="flex-1 min-w-0 font-semibold truncate">{nomeCompleto(r.op)}</span>
            <span className="text-sm text-tenue">{r.eventi} eventi</span>
            <span className={cn('text-sm font-semibold w-24 text-right', r.margine < 0 ? 'text-urgente-testo' : 'text-ok')}>{euro(Math.round(r.margine))}</span>
          </Link>
        ))}
      </Card>
      <Card className="p-5 flex flex-col gap-3">
        <TitoloSezione>Clienti</TitoloSezione>
        {perCliente.length === 0 ? <p className="text-sm text-tenue">Nessun cliente indicato nel periodo.</p> : perCliente.map((r, i) => (
          <div key={r.nome} className="flex items-center gap-3">
            <span className="w-5 text-sm font-semibold text-tenue">{i + 1}</span>
            <span className="flex-1 min-w-0 font-semibold truncate">{r.nome}</span>
            <span className="text-sm text-tenue">{r.eventi} eventi</span>
            <span className="text-sm font-semibold w-24 text-right">{euro(Math.round(r.ricavi))}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
