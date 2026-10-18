import { useState } from 'react'
import { REGIONI } from '@/shared/types/database'
import { nomeCompleto } from '@/shared/lib/formato'
import { AreaTesto, Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'
import { usePersonePerMagazzino, useSalvaMagazzino } from './api'
import { controllaMagazzino, daMagazzino, magazzinoVuoto, type DatiMagazzino, type Magazzino } from './magazzino'

/** Dove sta il magazzino, chi lo segue e sotto quante stampe la carta è da ricaricare */
export function ModuloMagazzino({ magazzino, onSalvato, onAnnulla }: { magazzino?: Magazzino; onSalvato: (id: string) => void; onAnnulla: () => void }) {
  const salva = useSalvaMagazzino()
  const persone = usePersonePerMagazzino()
  const [d, setD] = useState<DatiMagazzino>(() => (magazzino ? daMagazzino(magazzino) : magazzinoVuoto))
  const [provato, setProvato] = useState(false)
  const errori = provato ? controllaMagazzino(d) : {}
  const campo = (k: keyof DatiMagazzino) => ({
    value: d[k], errore: errori[k],
    onChange: (e: { target: { value: string } }) => setD((p) => ({ ...p, [k]: e.target.value })),
  })

  function invia(e: React.FormEvent) {
    e.preventDefault()
    setProvato(true)
    if (Object.keys(controllaMagazzino(d)).length > 0) return
    salva.mutate({ id: magazzino?.id, dati: d }, { onSuccess: (r) => onSalvato(r.id) })
  }

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-4">
      <Campo etichetta="Nome" placeholder="es. Magazzino Firenze" {...campo('nome')} />
      <Campo etichetta="Indirizzo" placeholder="es. Via Roma, 1" {...campo('indirizzo')} />
      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <Campo etichetta="Città" {...campo('citta')} />
        <Selezione etichetta="Regione" {...campo('regione')}>
          <option value="">Scegli…</option>
          {REGIONI.map((r) => <option key={r} value={r}>{r}</option>)}
        </Selezione>
      </div>
      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <Selezione etichetta="Responsabile (facoltativo)" {...campo('responsabile_id')}>
          <option value="">Nessuno</option>
          {(persone.data ?? []).map((p) => <option key={p.id} value={p.id}>{nomeCompleto(p)}</option>)}
        </Selezione>
        <Campo etichetta="Avvisa quando la carta scende sotto (stampe)" inputMode="numeric" {...campo('carta_minima')} />
      </div>
      <AreaTesto etichetta="Note (facoltative)" rows={2} placeholder="es. orari di apertura, chi ha le chiavi" {...campo('note')} />

      {salva.error && <Errore errore={salva.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={salva.isPending}>{magazzino ? 'Salva le modifiche' : 'Crea magazzino'}</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onAnnulla}>Annulla</Pulsante>
      </div>
    </form>
  )
}
