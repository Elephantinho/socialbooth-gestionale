import { Link } from 'react-router-dom'
import { FileDown } from 'lucide-react'
import { chiaveMese, etichettaMese } from '@/shared/lib/periodi'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useMieOre } from '@/modules/eventi/api'
import type { RigaOre } from '@/modules/eventi/types'
import { dataBreve, durata, euro } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { COLORE_RICAVI } from '@/modules/costi/components/GraficoAndamento'
import { TotaliPeriodo } from '@/modules/eventi/components/TotaliPeriodo'

export function OreOperatore() {
  const profilo = useProfilo()
  const { data, isPending, error } = useMieOre(profilo.id)

  // Raggruppa per mese dell'evento
  const mesi = Object.entries((data ?? []).reduce<Record<string, RigaOre[]>>((acc, r) => {
    const k = chiaveMese(r.evento?.allestimento_il ?? r.creato_il)
    ;(acc[k] ??= []).push(r)
    return acc
  }, {})).sort(([a], [b]) => b.localeCompare(a))

  return (
    <div className="flex flex-col gap-5 px-5 pt-sicura pb-6">
      <div className="pt-2">
        <h1 className="font-display text-[30px] font-bold tracking-tight">Le mie ore</h1>
        <p className="text-sm text-tenue">
          Tariffa: <strong className="text-inchiostro">{profilo.tariffa_oraria != null ? `${euro(profilo.tariffa_oraria)}/h` : 'da impostare'}</strong> · viaggio incluso
        </p>
      </div>

      {!!data?.length && <AndamentoCompensi righe={data} />}
      {!!data?.length && (
        <TotaliPeriodo titolo="Le mie ore per periodo" righe={data.filter((r) => r.stato !== 'respinto').map((r) => ({
          quando: r.evento?.allestimento_il ?? r.creato_il, minutiLocation: r.minuti_in_location, minutiViaggio: r.minuti_viaggio, compenso: r.compenso ?? 0,
        }))} />
      )}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : mesi.length === 0 ? (
        <Card><Vuoto titolo="Nessuna ora registrata" testo="Quando chiudi un evento, le ore compaiono qui." /></Card>
      ) : mesi.map(([mese, righe]) => {
        const valide = righe.filter((r) => r.stato !== 'respinto')
        const minuti = valide.reduce((s, r) => s + (r.minuti_totali ?? 0), 0)
        const compenso = valide.reduce((s, r) => s + (r.compenso ?? 0), 0)
        return (
          <section key={mese} className="flex flex-col gap-2">
            <Card tono="scuro" className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-accento-chiaro">{etichettaMese(mese)}</p>
                  <p className="font-bold mt-0.5">{valide.length} eventi · {durata(minuti)}</p>
                </div>
                <p className="font-display text-2xl font-bold">{euro(compenso)}</p>
              </div>
              <Link to={`/riepilogo/${profilo.id}/${mese}`} className="h-10 rounded-xl bg-scuro-2 text-sm font-bold inline-flex items-center justify-center gap-2">
                <FileDown className="size-4" aria-hidden /> Riepilogo del mese in PDF
              </Link>
            </Card>
            {righe.map((r) => (
              <Card key={r.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{r.evento?.tipo_booth?.nome ?? 'Evento'} · {r.evento?.citta}</p>
                  <p className="text-sm text-tenue">
                    {r.evento ? dataBreve(r.evento.allestimento_il) : ''} · {durata(r.minuti_in_location)} + {durata(r.minuti_viaggio)} viaggio
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{euro(r.compenso)}</p>
                  <p className={cn('text-xs font-bold',
                    r.stato === 'approvato' ? 'text-accento' : r.stato === 'respinto' ? 'text-urgente-testo' : 'text-avviso-testo')}>
                    {r.stato === 'approvato' ? 'Approvate' : r.stato === 'respinto' ? 'Respinte' : 'In verifica'}
                  </p>
                </div>
              </Card>
            ))}
          </section>
        )
      })}
    </div>
  )
}

/** Compensi degli ultimi 6 mesi, una barra per mese */
function AndamentoCompensi({ righe }: { righe: RigaOre[] }) {
  const oggi = new Date()
  const dati = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() - 5 + i, 1)
    const k = d.toLocaleDateString('sv-SE').slice(0, 7)
    const valore = righe
      .filter((r) => r.stato !== 'respinto' && r.evento && new Date(r.evento.allestimento_il).toLocaleDateString('sv-SE').slice(0, 7) === k)
      .reduce((s, r) => s + (r.compenso ?? 0), 0)
    return { mese: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''), compenso: Math.round(valore) }
  })
  const totale = dati.reduce((s, d) => s + d.compenso, 0)
  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <p className="font-bold">Compensi, ultimi 6 mesi</p>
        <p className="font-display text-xl font-bold">{euro(totale)}</p>
      </div>
      <div className="h-36" role="img" aria-label="Compensi per mese">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dati} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="mese" tickLine={false} axisLine={false} tick={{ fill: '#5E5F66', fontSize: 12, fontWeight: 600 }} />
            <Tooltip cursor={{ fill: 'rgba(21,22,26,0.05)' }} formatter={(v) => [euro(Number(v)), 'Compenso']}
              contentStyle={{ borderRadius: 12, border: '1px solid #E3E1DB', fontWeight: 600 }} />
            <Bar dataKey="compenso" fill={COLORE_RICAVI} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
