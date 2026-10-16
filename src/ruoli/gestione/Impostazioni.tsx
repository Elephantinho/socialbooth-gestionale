import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useImpostazioni, useSalvaImpostazione, useStatisticheStampe } from '@/modules/anagrafiche/api'
import { euro } from '@/shared/lib/formato'
import { Card } from '@/shared/ui/Card'
import { Campo } from '@/shared/ui/Campo'
import { Intestazione, Numero } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const etichette: Record<string, { titolo: string; unita: string; passo: string }> = {
  costo_confezione_carta: { titolo: 'Costo di una confezione di carta', unita: '€', passo: '0.01' },
  stampe_per_confezione: { titolo: 'Stampe per confezione', unita: 'stampe', passo: '1' },
  costo_stampa: { titolo: 'Costo di una stampa (manuale)', unita: '€', passo: '0.0001' },
  ore_scadenza_proposta: { titolo: 'Ore per accettare un incarico', unita: 'ore', passo: '1' },
}

/** Valori usati dai calcoli automatici */
export function Impostazioni() {
  const { data, isPending, error } = useImpostazioni()
  const admin = useProfilo().ruolo === 'admin'
  const statistiche = useStatisticheStampe()
  const costo = typeof statistiche.data?.costo === 'number' && statistiche.data.costo > 0 ? statistiche.data.costo : null
  const media = typeof statistiche.data?.media === 'number' && statistiche.data.media > 0 ? statistiche.data.media : null
  const ordine = ['costo_confezione_carta', 'stampe_per_confezione', 'ore_scadenza_proposta', 'costo_stampa']
  return (
    <div className="flex flex-col gap-6">
      <Intestazione sopra="Amministrazione" titolo="Impostazioni" descrizione="I valori che l'app usa per i calcoli automatici." />
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <Numero valore={costo ? `${costo.toLocaleString('it-IT', { maximumFractionDigits: 3 })} €` : '—'} etichetta="costo di una stampa (calcolato)" tono="accento" />
        <Numero valore={media ?? '—'} etichetta="stampe in media per evento" />
        <Numero valore={costo && media ? euro(costo * media) : '—'} etichetta="costo carta medio per evento" tono="scuro" />
      </div>
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {[...data].sort((a, b) => ordine.indexOf(a.chiave) - ordine.indexOf(b.chiave)).map((i) => <Voce key={i.chiave} chiave={i.chiave} valore={i.valore} descrizione={i.descrizione} modificabile={admin} />)}
        </div>
      )}
    </div>
  )
}

function Voce({ chiave, valore, descrizione, modificabile }: { chiave: string; valore: number | null; descrizione: string | null; modificabile: boolean }) {
  const salva = useSalvaImpostazione()
  const qc = useQueryClient()
  const [v, setV] = useState(valore != null ? String(valore) : '')
  const [ok, setOk] = useState(false)
  const e = etichette[chiave] ?? { titolo: chiave, unita: '', passo: 'any' }
  return (
    <Card className="p-5">
      <form className="flex flex-col gap-3" onSubmit={(ev) => {
        ev.preventDefault()
        setOk(false)
        salva.mutate({ chiave, valore: v === '' ? null : Number(v.replace(',', '.')) }, { onSuccess: () => { setOk(true); qc.invalidateQueries({ queryKey: ['impostazioni'] }) } })
      }}>
        <p className="font-bold">{e.titolo}</p>
        {descrizione && <p className="text-sm text-tenue -mt-2">{descrizione}</p>}
        <div className="flex gap-2 items-end">
          <Campo etichetta={e.unita} type="number" step={e.passo} min={0} value={v} disabled={!modificabile} onChange={(ev) => setV(ev.target.value)} className="flex-1" />
          {modificabile && <Pulsante type="submit" taglia="lg" caricamento={salva.isPending} icona={ok ? <Check className="size-4" aria-hidden /> : undefined}>Salva</Pulsante>}
        </div>
        {salva.error && <Errore errore={salva.error} />}
      </form>
    </Card>
  )
}
