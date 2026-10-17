import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { euro } from '@/shared/lib/formato'

// Colori validati per il daltonismo (teal / arancio) con il validatore della palette
export const COLORE_RICAVI = '#1F2533'
export const COLORE_COSTI = '#E6A700'

export type PuntoAndamento = { mese: string; ricavi: number; costi: number; margine: number }

/** Ricavi e costi per mese, barre affiancate. Sotto, la tabella con gli stessi numeri. */
export function GraficoAndamento({ dati }: { dati: PuntoAndamento[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-64" role="img" aria-label="Grafico di ricavi e costi per mese">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dati} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E3E1DB" />
            <XAxis dataKey="mese" tickLine={false} axisLine={{ stroke: '#D5D3CC' }} tick={{ fill: '#5E5F66', fontSize: 12, fontWeight: 600 }} />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: '#5E5F66', fontSize: 12 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k €` : `${v} €`)} />
            <Tooltip cursor={{ fill: 'rgba(21,22,26,0.05)' }} formatter={(v) => euro(Number(v))}
              contentStyle={{ borderRadius: 12, border: '1px solid #E3E1DB', fontWeight: 600 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 600 }} formatter={(v) => <span className="text-inchiostro">{v}</span>} />
            <Bar dataKey="ricavi" name="Ricavi" fill={COLORE_RICAVI} radius={[4, 4, 0, 0]} maxBarSize={34} />
            <Bar dataKey="costi" name="Costi" fill={COLORE_COSTI} radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-tenue">Vedi i numeri in tabella</summary>
        <table className="w-full mt-2">
          <thead><tr className="text-left text-xs text-tenue"><th className="py-1.5">Mese</th><th className="text-right">Ricavi</th><th className="text-right">Costi</th><th className="text-right">Margine</th></tr></thead>
          <tbody>
            {dati.map((d) => (
              <tr key={d.mese} className="border-t border-bordo">
                <td className="py-1.5 font-semibold capitalize">{d.mese}</td>
                <td className="text-right">{euro(d.ricavi)}</td>
                <td className="text-right">{euro(d.costi)}</td>
                <td className={d.margine < 0 ? 'text-right font-semibold text-urgente-testo' : 'text-right font-semibold'}>{euro(d.margine)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
