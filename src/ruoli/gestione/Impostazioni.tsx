import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePuo } from '@/modules/auth/permessi'
import { useImpostazioni, useSalvaImpostazione } from '@/modules/anagrafiche/api'
import { Card } from '@/shared/ui/Card'
import { Campo } from '@/shared/ui/Campo'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const etichette: Record<string, { titolo: string; unita: string; passo: string }> = {
  ore_scadenza_proposta: { titolo: 'Ore per accettare un incarico', unita: 'ore', passo: '1' },
  riserva_automatica: { titolo: 'Se l\'operatore rifiuta, proponi il più vicino libero (1 = sì, 0 = no)', unita: '', passo: '1' },
}

/** Regole dell'assegnazione degli operatori */
export function Impostazioni() {
  const { data, isPending, error } = useImpostazioni()
  const admin = usePuo()('impostazioni')
  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Impostazioni" />
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] max-w-3xl">
          {data.filter((i) => i.chiave in etichette).map((i) => <Voce key={i.chiave} chiave={i.chiave} valore={i.valore} modificabile={admin} />)}
        </div>
      )}
    </div>
  )
}

function Voce({ chiave, valore, modificabile }: { chiave: string; valore: number | null; modificabile: boolean }) {
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
        <p className="font-semibold">{e.titolo}</p>
        <div className="flex gap-2 items-end">
          <Campo etichetta={e.unita} type="number" step={e.passo} min={0} value={v} disabled={!modificabile} onChange={(ev) => setV(ev.target.value)} className="flex-1" />
          {modificabile && <Pulsante type="submit" taglia="lg" caricamento={salva.isPending}>{ok ? 'Salvato' : 'Salva'}</Pulsante>}
        </div>
        {salva.error && <Errore errore={salva.error} />}
      </form>
    </Card>
  )
}
