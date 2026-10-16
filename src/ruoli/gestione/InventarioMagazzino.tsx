import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMagazzini } from '@/modules/anagrafiche/api'
import { CATEGORIE_ARTICOLO, useArticoli, useEliminaArticolo, useSalvaArticolo } from '@/modules/attrezzatura/api'
import { cn } from '@/shared/lib/cn'
import type { Enum, Riga } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

const statiArticolo: { id: Enum<'stato_articolo'>; etichetta: string; stile: string }[] = [
  { id: 'disponibile', etichetta: 'Disponibile', stile: 'bg-accento-tenue text-accento-scuro' },
  { id: 'in_manutenzione', etichetta: 'In manutenzione', stile: 'bg-avviso text-avviso-testo' },
  { id: 'fuori_uso', etichetta: 'Fuori uso', stile: 'bg-urgente-tenue text-urgente-testo' },
]

/** Inventario dell'attrezzatura di un magazzino. */
export function InventarioMagazzino() {
  const { id = '' } = useParams()
  const magazzino = useMagazzini().data?.find((m) => m.id === id)
  const articoli = useArticoli(id)
  const [nuovo, setNuovo] = useState(false)

  const gruppi = Object.entries((articoli.data ?? []).reduce<Record<string, Riga<'articoli'>[]>>((acc, a) => {
    (acc[a.categoria] ??= []).push(a)
    return acc
  }, {}))
  const totalePezzi = (articoli.data ?? []).reduce((s, a) => s + a.quantita, 0)
  const fuori = (articoli.data ?? []).reduce((s, a) => s + a.in_uso, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <Link to="/gestione/magazzini" className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro">
            <ArrowLeft className="size-4" aria-hidden /> Magazzini
          </Link>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{magazzino?.nome ?? 'Magazzino'}</h1>
          <p className="text-tenue mt-1">{magazzino ? `${magazzino.indirizzo}, ${magazzino.citta}, ` : ''}{articoli.data?.length ?? 0} articoli, {totalePezzi} pezzi{fuori ? `, ${fuori} fuori per eventi` : ''}</p>
          <p className="text-xs text-tenue mt-1">Si aggiorna da solo: l'attrezzatura esce quando l'operatore parte dal magazzino e rientra quando torna. I consumabili si scalano.</p>
        </div>
        {!nuovo && <Pulsante taglia="lg" icona={<Plus className="size-[18px]" aria-hidden />} onClick={() => setNuovo(true)}>Aggiungi articolo</Pulsante>}
      </div>

      {nuovo && <Card className="p-5"><ModuloArticolo magazzinoId={id} onFatto={() => setNuovo(false)} /></Card>}

      {articoli.isPending ? <Caricamento /> : articoli.error ? <Errore errore={articoli.error} /> : !gruppi.length ? (
        <Card><Vuoto titolo="Inventario vuoto" testo="Aggiungi booth, stampanti, consumabili e props presenti in questo magazzino." /></Card>
      ) : gruppi.map(([categoria, lista]) => (
        <section key={categoria} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-tenue">{categoria}</h2>
          <Card className="divide-y divide-bordo">
            {lista.map((a) => <RigaArticolo key={a.id} a={a} />)}
          </Card>
        </section>
      ))}
    </div>
  )
}

function RigaArticolo({ a }: { a: Riga<'articoli'> }) {
  const [modifica, setModifica] = useState(false)
  const elimina = useEliminaArticolo()
  const stato = statiArticolo.find((s) => s.id === a.stato)!

  if (modifica) return <div className="p-4"><ModuloArticolo magazzinoId={a.magazzino_id} a={a} onFatto={() => setModifica(false)} /></div>

  return (
    <div className="p-4 flex flex-wrap items-center gap-3">
      <div className="flex-[1_1_220px] min-w-0">
        <p className="font-semibold">{a.nome}</p>
        <p className="text-sm text-tenue">{[a.codice, a.note].filter(Boolean).join(', ') || '—'}</p>
      </div>
      <div className="text-right min-w-24">
        <p className="font-display text-xl font-semibold">{a.quantita - a.in_uso}<span className="text-sm text-tenue font-semibold"> / {a.quantita}</span></p>
        <p className={cn('text-xs font-semibold', a.in_uso ? 'text-avviso-testo' : 'text-tenue')}>{a.in_uso ? `${a.in_uso} fuori per eventi` : 'tutti in magazzino'}</p>
      </div>
      <span className={cn('text-xs font-semibold px-2.5 py-1.5 rounded-[10px]', stato.stile)}>{stato.etichetta}</span>
      <div className="flex gap-1">
        <button aria-label={`Modifica ${a.nome}`} onClick={() => setModifica(true)} className="size-10 rounded-lg flex items-center justify-center hover:bg-sfondo cursor-pointer">
          <Pencil className="size-4" aria-hidden />
        </button>
        <button aria-label={`Elimina ${a.nome}`} onClick={() => confirm(`Eliminare ${a.nome}?`) && elimina.mutate(a.id)}
          className="size-10 rounded-lg flex items-center justify-center text-tenue hover:bg-sfondo cursor-pointer">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

function ModuloArticolo({ magazzinoId, a, onFatto }: { magazzinoId: string; a?: Riga<'articoli'>; onFatto: () => void }) {
  const salva = useSalvaArticolo()
  const [nome, setNome] = useState(a?.nome ?? '')
  const [categoria, setCategoria] = useState(a?.categoria ?? 'Booth')
  const [quantita, setQuantita] = useState(String(a?.quantita ?? 1))
  const [codice, setCodice] = useState(a?.codice ?? '')
  const [stato, setStato] = useState<Enum<'stato_articolo'>>(a?.stato ?? 'disponibile')
  const [note, setNote] = useState(a?.note ?? '')

  return (
    <form className="flex flex-col gap-3.5" onSubmit={(e) => {
      e.preventDefault()
      salva.mutate({ id: a?.id, magazzino_id: magazzinoId, nome, categoria, quantita: Number(quantita) || 0, codice: codice || null, stato, note: note || null },
        { onSuccess: onFatto })
    }}>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <Campo etichetta="Nome" required placeholder="Es. Stampante DNP DS620" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Selezione etichetta="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIE_ARTICOLO.map((c) => <option key={c}>{c}</option>)}
        </Selezione>
        <Campo etichetta="Quantità" type="number" min={0} value={quantita} onChange={(e) => setQuantita(e.target.value)} />
        <Campo etichetta="Codice / seriale" value={codice} onChange={(e) => setCodice(e.target.value)} />
        <Selezione etichetta="Stato" value={stato} onChange={(e) => setStato(e.target.value as Enum<'stato_articolo'>)}>
          {statiArticolo.map((s) => <option key={s.id} value={s.id}>{s.etichetta}</option>)}
        </Selezione>
        <Campo etichetta="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {salva.error && <Errore errore={salva.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={salva.isPending}>Salva</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}
