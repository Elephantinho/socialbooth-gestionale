import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'
import { useSalvaArticolo, useTogliArticolo } from './api'
import { CATEGORIE, STATI, type Articolo, type StatoArticolo } from './magazzino'

const COLORE_STATO: Record<StatoArticolo, string> = {
  disponibile: 'bg-ok-tenue text-ok',
  in_manutenzione: 'bg-avviso text-avviso-testo',
  fuori_uso: 'bg-urgente-tenue text-urgente-testo',
}

/** Gli strumenti del magazzino divisi per categoria; chi gestisce li aggiunge e li modifica qui */
export function Strumenti({ magazzinoId, articoli, modificabile }: { magazzinoId: string; articoli: Articolo[]; modificabile: boolean }) {
  const [aperto, setAperto] = useState<string | 'nuovo' | null>(null)
  const gruppi = CATEGORIE.map((c) => ({ ...c, righe: articoli.filter((a) => a.categoria === c.id).toSorted((a, b) => a.nome.localeCompare(b.nome)) }))
    .filter((g) => g.righe.length)

  return (
    <div className="flex flex-col gap-5">
      {gruppi.length === 0 && aperto !== 'nuovo' && <p className="text-tenue">Ancora nessuno strumento in questo magazzino.</p>}
      {gruppi.map((g) => (
        <section key={g.id} className="flex flex-col">
          <h3 className="text-xs font-semibold text-tenue uppercase tracking-wide mb-1.5">{g.etichetta}</h3>
          <ul className="divide-y divide-bordo border-y border-bordo">
            {g.righe.map((a) => aperto === a.id ? (
              <li key={a.id} className="py-3"><ModuloArticolo magazzinoId={magazzinoId} articolo={a} onFatto={() => setAperto(null)} /></li>
            ) : (
              <li key={a.id} className="py-2.5 flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="font-semibold">{a.nome}</span>
                  {a.codice && <span className="text-sm text-tenue"> · {a.codice}</span>}
                </span>
                {a.stato !== 'disponibile' && <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1', COLORE_STATO[a.stato])}>{STATI[a.stato]}</span>}
                <span className="font-semibold tabular-nums w-10 text-right" aria-label={`${a.quantita} pezzi`}>{a.quantita}</span>
                {modificabile && (
                  <button onClick={() => setAperto(a.id)} aria-label={`Modifica ${a.nome}`} className="size-8 rounded-lg text-tenue hover:text-inchiostro hover:bg-sfondo flex items-center justify-center cursor-pointer">
                    <Pencil className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {modificabile && (aperto === 'nuovo' ? (
        <div className="rounded-xl border border-bordo-forte bg-sfondo/50 p-4">
          <ModuloArticolo magazzinoId={magazzinoId} onFatto={() => setAperto(null)} />
        </div>
      ) : (
        <Pulsante variante="secondario" className="self-start" onClick={() => setAperto('nuovo')}><Plus className="size-4" aria-hidden /> Aggiungi strumento</Pulsante>
      ))}
    </div>
  )
}

function ModuloArticolo({ magazzinoId, articolo, onFatto }: { magazzinoId: string; articolo?: Articolo; onFatto: () => void }) {
  const salva = useSalvaArticolo()
  const togli = useTogliArticolo()
  const [nome, setNome] = useState(articolo?.nome ?? '')
  const [categoria, setCategoria] = useState(articolo?.categoria ?? 'booth')
  const [quantita, setQuantita] = useState(String(articolo?.quantita ?? 1))
  const [stato, setStato] = useState<StatoArticolo>(articolo?.stato ?? 'disponibile')
  const [codice, setCodice] = useState(articolo?.codice ?? '')
  const [provato, setProvato] = useState(false)
  const errNome = provato && !nome.trim() ? 'Scrivi il nome' : undefined
  const errQuantita = provato && !/^\d+$/.test(quantita.trim()) ? 'Un numero' : undefined

  function invia(e: React.FormEvent) {
    e.preventDefault()
    setProvato(true)
    if (!nome.trim() || !/^\d+$/.test(quantita.trim())) return
    salva.mutate({
      id: articolo?.id,
      riga: { magazzino_id: magazzinoId, nome: nome.trim(), categoria, quantita: Number(quantita), stato, codice: codice.trim() || null },
    }, { onSuccess: onFatto })
  }

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <Campo etichetta="Nome" placeholder="es. Photobooth Classic" value={nome} onChange={(e) => setNome(e.target.value)} errore={errNome} autoFocus className="col-span-2" />
        <Selezione etichetta="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIE.map((c) => <option key={c.id} value={c.id}>{c.etichetta}</option>)}
        </Selezione>
        <Campo etichetta="Pezzi" inputMode="numeric" value={quantita} onChange={(e) => setQuantita(e.target.value)} errore={errQuantita} />
        <Selezione etichetta="Stato" value={stato} onChange={(e) => setStato(e.target.value as StatoArticolo)}>
          {(Object.keys(STATI) as StatoArticolo[]).map((s) => <option key={s} value={s}>{STATI[s]}</option>)}
        </Selezione>
        <Campo etichetta="Codice (facoltativo)" placeholder="es. PB-01" value={codice} onChange={(e) => setCodice(e.target.value)} />
      </div>
      {(salva.error || togli.error) && <Errore errore={salva.error ?? togli.error} />}
      <div className="flex gap-2 flex-wrap">
        <Pulsante type="submit" caricamento={salva.isPending}>{articolo ? 'Salva' : 'Aggiungi'}</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
        {articolo && (
          <Pulsante type="button" variante="fantasma" className="ml-auto text-urgente-testo" caricamento={togli.isPending}
            onClick={() => { if (confirm(`Togliere ${articolo.nome} dal magazzino?`)) togli.mutate(articolo.id, { onSuccess: onFatto }) }}>
            Togli dal magazzino
          </Pulsante>
        )}
      </div>
    </form>
  )
}
