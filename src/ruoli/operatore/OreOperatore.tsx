import { useProfilo } from '@/modules/auth/AuthProvider'
import { useMieOre } from '@/modules/eventi/api'
import type { RigaOre } from '@/modules/eventi/types'
import { dataBreve, durata, euro } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/Card'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

export function OreOperatore() {
  const profilo = useProfilo()
  const { data, isPending, error } = useMieOre(profilo.id)

  // Raggruppa per mese dell'evento
  const mesi = Object.entries((data ?? []).reduce<Record<string, RigaOre[]>>((acc, r) => {
    const d = r.evento ? new Date(r.evento.allestimento_il) : new Date(r.creato_il)
    const k = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    ;(acc[k] ??= []).push(r)
    return acc
  }, {}))

  return (
    <div className="flex flex-col gap-5 px-5 pt-sicura pb-6">
      <div className="pt-2">
        <h1 className="font-display text-[30px] font-bold tracking-tight">Le mie ore</h1>
        <p className="text-sm text-tenue">
          Tariffa: <strong className="text-inchiostro">{profilo.tariffa_oraria != null ? `${euro(profilo.tariffa_oraria)}/h` : 'da impostare'}</strong> · viaggio incluso
        </p>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : mesi.length === 0 ? (
        <Card><Vuoto titolo="Nessuna ora registrata" testo="Quando chiudi un evento, le ore compaiono qui." /></Card>
      ) : mesi.map(([mese, righe]) => {
        const valide = righe.filter((r) => r.stato !== 'respinto')
        const minuti = valide.reduce((s, r) => s + (r.minuti_totali ?? 0), 0)
        const compenso = valide.reduce((s, r) => s + (r.compenso ?? 0), 0)
        return (
          <section key={mese} className="flex flex-col gap-2">
            <Card tono="scuro" className="p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accento-chiaro">{mese}</p>
                <p className="font-bold mt-0.5">{valide.length} eventi · {durata(minuti)}</p>
              </div>
              <p className="font-display text-2xl font-bold">{euro(compenso)}</p>
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
