import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useEliminaMagazzino, useMagazzini, useSalvaMagazzino } from '@/modules/anagrafiche/api'
import { trovaCoordinate } from '@/modules/viaggio/api'
import { REGIONI, type Enum, type Riga } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { AreaTesto, Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

export function Magazzini() {
  const { data, isPending, error } = useMagazzini()
  const admin = useProfilo().ruolo === 'admin'
  const [nuovo, setNuovo] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <p className="text-sm font-semibold text-tenue">Gestione</p>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Magazzini</h1>
          <p className="text-tenue mt-2 max-w-2xl">Da qui partono gli operatori: l'indirizzo serve per calcolare in automatico i tempi di viaggio.</p>
        </div>
        {admin && !nuovo && <Pulsante taglia="lg" icona={<Plus className="size-[18px]" aria-hidden />} onClick={() => setNuovo(true)}>Nuovo magazzino</Pulsante>}
      </div>

      <AnimatePresence>
        {nuovo && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-5"><ModuloMagazzino onFatto={() => setNuovo(false)} /></Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !data.length ? (
        <Card><Vuoto titolo="Nessun magazzino" testo="Aggiungi almeno un magazzino per regione per calcolare i viaggi." /></Card>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {data.map((m) => <SchedaMagazzino key={m.id} m={m} admin={admin} />)}
        </div>
      )}
    </div>
  )
}

function SchedaMagazzino({ m, admin }: { m: Riga<'magazzini'>; admin: boolean }) {
  const [modifica, setModifica] = useState(false)
  const elimina = useEliminaMagazzino()
  const posizione = m.lat != null && m.lng != null

  if (modifica) return <Card className="p-5"><ModuloMagazzino m={m} onFatto={() => setModifica(false)} /></Card>

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-xl bg-inchiostro text-white flex items-center justify-center shrink-0"><Building2 className="size-5" aria-hidden /></div>
        <div className="min-w-0">
          <p className="font-bold text-[16px]">{m.nome}</p>
          <p className="text-sm text-tenue">{m.indirizzo}, {m.citta} · {m.regione}</p>
        </div>
      </div>
      <p className={posizione ? 'text-xs font-bold text-accento flex items-center gap-1.5' : 'text-xs font-bold text-urgente-testo flex items-center gap-1.5'}>
        <MapPin className="size-3.5" aria-hidden />
        {posizione ? 'Posizione trovata: viaggi calcolati in automatico' : 'Posizione non trovata: correggi l\'indirizzo'}
      </p>
      {m.note && <p className="text-sm text-tenue">{m.note}</p>}
      {elimina.error && <Errore errore={new Error('Non si può eliminare: è usato da eventi o operatori')} />}
      {admin && (
        <div className="flex gap-2 mt-1">
          <Pulsante variante="secondario" icona={<Pencil className="size-4" aria-hidden />} onClick={() => setModifica(true)}>Modifica</Pulsante>
          <Pulsante variante="fantasma" icona={<Trash2 className="size-4" aria-hidden />} caricamento={elimina.isPending}
            onClick={() => confirm(`Eliminare ${m.nome}?`) && elimina.mutate(m.id)}>
            Elimina
          </Pulsante>
        </div>
      )}
    </Card>
  )
}

function ModuloMagazzino({ m, onFatto }: { m?: Riga<'magazzini'>; onFatto: () => void }) {
  const salva = useSalvaMagazzino()
  const [nome, setNome] = useState(m?.nome ?? '')
  const [indirizzo, setIndirizzo] = useState(m?.indirizzo ?? '')
  const [citta, setCitta] = useState(m?.citta ?? '')
  const [regione, setRegione] = useState<Enum<'regione'>>(m?.regione ?? 'Toscana')
  const [note, setNote] = useState(m?.note ?? '')
  const [cerco, setCerco] = useState(false)

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    setCerco(true)
    const punto = await trovaCoordinate(indirizzo, citta).catch(() => null)
    setCerco(false)
    salva.mutate(
      { id: m?.id, nome, indirizzo, citta, regione, note: note || null, lat: punto?.lat ?? null, lng: punto?.lng ?? null },
      { onSuccess: onFatto },
    )
  }

  return (
    <form onSubmit={invia} className="flex flex-col gap-3.5">
      <Campo etichetta="Nome" required placeholder="Magazzino Firenze" value={nome} onChange={(e) => setNome(e.target.value)} />
      <Campo etichetta="Indirizzo" required value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
      <div className="grid gap-3 grid-cols-2">
        <Campo etichetta="Città" required value={citta} onChange={(e) => setCitta(e.target.value)} />
        <Selezione etichetta="Regione" value={regione} onChange={(e) => setRegione(e.target.value as Enum<'regione'>)}>
          {REGIONI.map((r) => <option key={r}>{r}</option>)}
        </Selezione>
      </div>
      <AreaTesto etichetta="Note (orari, codice cancello…)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      {salva.error && <Errore errore={salva.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={cerco || salva.isPending}>Salva</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}
