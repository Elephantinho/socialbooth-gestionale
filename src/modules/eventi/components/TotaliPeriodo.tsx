import { useState } from 'react'
import { chiaveMese, etichettaMese, etichettaSettimana, lunediDi } from '@/shared/lib/periodi'
import { durata, euro } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'

export type RigaPeriodo = { quando: string; minutiLocation: number; minutiViaggio: number; compenso: number }

/** Totali di ore e compensi per settimana o per mese */
export function TotaliPeriodo({ righe, titolo = 'Totali', senzaCompensi }: { righe: RigaPeriodo[]; titolo?: string; senzaCompensi?: boolean }) {
  const [per, setPer] = useState<'settimana' | 'mese'>('settimana')

  const gruppi = [...righe.reduce((m, r) => {
    const k = per === 'settimana' ? lunediDi(r.quando) : chiaveMese(r.quando)
    const g = m.get(k) ?? { eventi: 0, location: 0, viaggio: 0, compenso: 0 }
    g.eventi += 1; g.location += r.minutiLocation; g.viaggio += r.minutiViaggio; g.compenso += r.compenso
    return m.set(k, g)
  }, new Map<string, { eventi: number; location: number; viaggio: number; compenso: number }>())]
    .sort(([a], [b]) => b.localeCompare(a))

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-bordo">
        <TitoloSezione className="text-[15px]">{titolo}</TitoloSezione>
        <div className="flex rounded-lg bg-sfondo p-1" role="tablist">
          {(['settimana', 'mese'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={per === k} onClick={() => setPer(k)}
              className={cn('h-8 px-3 rounded-md text-xs font-semibold cursor-pointer capitalize', per === k ? 'bg-accento-tenue text-accento-scuro' : 'text-tenue')}>
              Per {k}
            </button>
          ))}
        </div>
      </div>
      {!gruppi.length ? <p className="p-4 text-sm text-tenue">Nessuna ora registrata.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-tenue">
                <th className="px-4 py-2.5 font-semibold">{per === 'settimana' ? 'Settimana' : 'Mese'}</th>
                <th className="px-4 py-2.5 font-semibold text-right">Eventi</th>
                <th className="px-4 py-2.5 font-semibold text-right">Location</th>
                <th className="px-4 py-2.5 font-semibold text-right">Viaggio</th>
                <th className="px-4 py-2.5 font-semibold text-right">Totale ore</th>
                {!senzaCompensi && <th className="px-4 py-2.5 font-semibold text-right">Compenso</th>}
              </tr>
            </thead>
            <tbody>
              {gruppi.map(([k, g]) => (
                <tr key={k} className="border-t border-bordo">
                  <td className="px-4 py-2.5 font-semibold whitespace-nowrap capitalize">{per === 'settimana' ? etichettaSettimana(k) : etichettaMese(k)}</td>
                  <td className="px-4 py-2.5 text-right">{g.eventi}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">{durata(g.location)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">{durata(g.viaggio)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold">{durata(g.location + g.viaggio)}</td>
                  {!senzaCompensi && <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold">{euro(g.compenso)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
