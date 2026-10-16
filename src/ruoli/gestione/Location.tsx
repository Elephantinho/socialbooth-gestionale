import { useState } from 'react'
import { MapPin, Pencil, Trash2 } from 'lucide-react'
import { useEliminaLocation, useLocation, useSalvaLocation } from '@/modules/anagrafiche/api'
import type { Riga } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { AreaTesto, Campo, SiNo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

export function Location() {
  const { data, isPending, error } = useLocation()
  const [cerca, setCerca] = useState('')
  const filtrate = (data ?? []).filter((l) =>
    `${l.nome ?? ''} ${l.indirizzo} ${l.citta}`.toLowerCase().includes(cerca.toLowerCase()))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-tenue">Archivio</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Location salvate</h1>
        <p className="text-tenue mt-2 max-w-2xl">
          Ogni nuovo indirizzo viene salvato con accessi, ZTL e Wi‑Fi: la volta dopo si compila tutto da solo.
        </p>
      </div>
      <Campo etichetta="Cerca" placeholder="Nome, indirizzo o città" value={cerca} onChange={(e) => setCerca(e.target.value)} className="max-w-md" />
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !filtrate.length ? (
        <Card><Vuoto titolo="Nessuna location" testo="Si aggiungono da sole quando crei un evento in un posto nuovo." /></Card>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {filtrate.map((l) => <SchedaLocation key={l.id} l={l} />)}
        </div>
      )}
    </div>
  )
}

function SchedaLocation({ l }: { l: Riga<'location'> }) {
  const [modifica, setModifica] = useState(false)
  const elimina = useEliminaLocation()
  const salva = useSalvaLocation()
  const [nome, setNome] = useState(l.nome ?? '')
  const [note, setNote] = useState(l.note_accesso ?? '')
  const [ztl, setZtl] = useState(!!l.ztl)
  const [wifi, setWifi] = useState(!!l.wifi)

  if (modifica) {
    return (
      <Card className="p-5">
        <form className="flex flex-col gap-3.5" onSubmit={(e) => {
          e.preventDefault()
          salva.mutate({ id: l.id, indirizzo: l.indirizzo, citta: l.citta, regione: l.regione, nome: nome || null, note_accesso: note || null, ztl, wifi },
            { onSuccess: () => setModifica(false) })
        }}>
          <p className="font-semibold">{l.indirizzo}, {l.citta}</p>
          <Campo etichetta="Nome della location" placeholder="Villa…, Hotel…" value={nome} onChange={(e) => setNome(e.target.value)} />
          <AreaTesto etichetta="Accessibilità e scarico" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <SiNo etichetta="ZTL" valore={ztl} onChange={setZtl} />
            <SiNo etichetta="Wi‑Fi" valore={wifi} onChange={setWifi} />
          </div>
          {salva.error && <Errore errore={salva.error} />}
          <div className="flex gap-2">
            <Pulsante type="submit" caricamento={salva.isPending}>Salva</Pulsante>
            <Pulsante type="button" variante="secondario" onClick={() => setModifica(false)}>Annulla</Pulsante>
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-lg bg-accento-tenue text-accento flex items-center justify-center shrink-0"><MapPin className="size-5" aria-hidden /></div>
        <div className="min-w-0">
          <p className="font-semibold text-[16px]">{l.nome || l.indirizzo}</p>
          <p className="text-sm text-tenue">{l.nome ? `${l.indirizzo}, ` : ''}{l.citta}, {l.regione}</p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-xs font-semibold bg-sfondo border border-bordo px-2.5 py-1 rounded-full">ZTL {l.ztl ? 'sì' : 'no'}</span>
        <span className="text-xs font-semibold bg-sfondo border border-bordo px-2.5 py-1 rounded-full">Wi‑Fi {l.wifi ? 'sì' : 'no'}</span>
      </div>
      {l.note_accesso && <p className="text-sm text-avviso-testo bg-avviso rounded-lg p-3 whitespace-pre-line">{l.note_accesso}</p>}
      {elimina.error && <Errore errore={elimina.error} />}
      <div className="flex gap-2 mt-1">
        <Pulsante variante="secondario" icona={<Pencil className="size-4" aria-hidden />} onClick={() => setModifica(true)}>Modifica</Pulsante>
        <Pulsante variante="fantasma" icona={<Trash2 className="size-4" aria-hidden />} caricamento={elimina.isPending}
          onClick={() => confirm('Eliminare questa location? Gli eventi passati restano.') && elimina.mutate(l.id)}>
          Elimina
        </Pulsante>
      </div>
    </Card>
  )
}
