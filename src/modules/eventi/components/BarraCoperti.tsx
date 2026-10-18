import { copertura } from '../logic/giorni'

/** "13 su 19 coperti" con la barra verde (coperti) e arancione (in attesa) */
export function BarraCoperti({ eventi }: { eventi: { stato: string }[] }) {
  const { totale, coperti, attesa } = copertura(eventi)
  if (!totale) return null
  const pct = (n: number) => `${(n / totale) * 100}%`
  return (
    <div className="flex items-center gap-4">
      <p className="text-sm font-semibold whitespace-nowrap">
        {coperti === totale ? <span className="text-ok">Tutti coperti</span> : <><span className="text-ok">{coperti} su {totale}</span> coperti</>}
      </p>
      <div className="h-2 flex-1 rounded-full bg-bordo/70 overflow-hidden flex" role="img" aria-label={`${coperti} eventi coperti su ${totale}`}>
        <span className="bg-ok h-full" style={{ width: pct(coperti) }} />
        <span className="bg-avviso-icona h-full" style={{ width: pct(attesa) }} />
      </div>
    </div>
  )
}
