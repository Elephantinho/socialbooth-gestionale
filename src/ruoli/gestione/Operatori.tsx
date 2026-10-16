import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Phone } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useAggiornaProfilo, useMagazzini, useOperatori } from '@/modules/anagrafiche/api'
import { SceltaRegioni } from '@/modules/auth/SceltaRegioni'
import { euro, iniziali } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import type { Enum } from '@/shared/types/database'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Operatore = NonNullable<ReturnType<typeof useOperatori>['data']>[number]

export function Operatori() {
  const { data, isPending, error } = useOperatori()
  const profilo = useProfilo()
  const admin = profilo.ruolo === 'admin'
  const inAttesa = (data ?? []).filter((o) => !o.attivo)
  const attivi = (data ?? []).filter((o) => o.attivo)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-tenue">Gestione</p>
        <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Operatori</h1>
        <p className="text-tenue mt-2 max-w-2xl">
          Gli operatori si registrano dall'app indicando le loro regioni. Un admin li attiva e imposta tariffa oraria e magazzino.
        </p>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !data.length ? (
        <Card><Vuoto titolo="Nessun operatore" testo="Condividi il link dell'app: gli operatori possono registrarsi da soli." /></Card>
      ) : (
        <>
          {inAttesa.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <TitoloSezione>Da approvare <span className="text-urgente">· {inAttesa.length}</span></TitoloSezione>
              {inAttesa.map((o) => <SchedaOperatore key={o.id} o={o} admin={admin} />)}
            </section>
          )}
          <section className="flex flex-col gap-2.5">
            <TitoloSezione>Attivi · {attivi.length}</TitoloSezione>
            {attivi.map((o) => <SchedaOperatore key={o.id} o={o} admin={admin} />)}
          </section>
        </>
      )}
    </div>
  )
}

function SchedaOperatore({ o, admin }: { o: Operatore; admin: boolean }) {
  const [aperto, setAperto] = useState(false)
  const aggiorna = useAggiornaProfilo()
  const numero = o.telefono?.replace(/[^\d+]/g, '')

  return (
    <Card className="overflow-hidden">
      <div className="p-4 md:px-5 flex flex-wrap items-center gap-4">
        <div className={cn('size-12 rounded-full font-bold flex items-center justify-center', o.attivo ? 'bg-accento-tenue text-accento-scuro' : 'bg-avviso text-avviso-titolo')}>
          {iniziali(o.nome)}
        </div>
        <div className="flex-[1_1_200px] min-w-0">
          <p className="font-bold text-[16px] truncate">{o.nome || 'Senza nome'}</p>
          <p className="text-sm text-tenue">
            {o.magazzino?.nome ?? 'Nessun magazzino'} · {o.tariffa_oraria != null ? `${euro(o.tariffa_oraria)}/h` : 'tariffa da impostare'}
          </p>
        </div>
        <div className="flex-[2_1_260px] flex flex-wrap gap-1.5">
          {o.zone.length ? o.zone.map((z) => (
            <span key={z.regione} className="text-xs font-bold bg-sfondo border border-bordo px-2.5 py-1 rounded-full">{z.regione}</span>
          )) : <span className="text-xs font-bold text-urgente-testo">Nessuna regione</span>}
        </div>
        <div className="flex gap-2 ml-auto">
          {numero && (
            <a href={`tel:${numero}`} aria-label={`Chiama ${o.nome}`} className="size-11 rounded-xl border border-bordo flex items-center justify-center">
              <Phone className="size-4" aria-hidden />
            </a>
          )}
          {admin && !o.attivo && (
            <Pulsante caricamento={aggiorna.isPending} onClick={() => aggiorna.mutate({ id: o.id, modifiche: { attivo: true } })}>Approva</Pulsante>
          )}
          {admin && (
            <Pulsante variante="secondario" icona={<Pencil className="size-4" aria-hidden />} onClick={() => setAperto((a) => !a)} aria-expanded={aperto}>
              Modifica
            </Pulsante>
          )}
        </div>
      </div>
      {aggiorna.error && <div className="px-5 pb-4"><Errore errore={aggiorna.error} /></div>}
      <AnimatePresence initial={false}>
        {aperto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-bordo bg-sfondo/60">
            <ModificaOperatore o={o} onFatto={() => setAperto(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function ModificaOperatore({ o, onFatto }: { o: Operatore; onFatto: () => void }) {
  const magazzini = useMagazzini()
  const aggiorna = useAggiornaProfilo()
  const [tariffa, setTariffa] = useState(o.tariffa_oraria != null ? String(o.tariffa_oraria) : '')
  const [magazzinoId, setMagazzinoId] = useState(o.magazzino_id ?? '')
  const [regioni, setRegioni] = useState<Enum<'regione'>[]>(o.zone.map((z) => z.regione))
  const [attivo, setAttivo] = useState(o.attivo)

  return (
    <form className="p-5 flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault()
      aggiorna.mutate({
        id: o.id,
        modifiche: { tariffa_oraria: tariffa ? Number(tariffa) : null, magazzino_id: magazzinoId || null, attivo },
        regioni,
      }, { onSuccess: onFatto })
    }}>
      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <Campo etichetta="Tariffa oraria (€)" type="number" min={0} step="0.5" value={tariffa} onChange={(e) => setTariffa(e.target.value)} />
        <Selezione etichetta="Magazzino di riferimento" value={magazzinoId} onChange={(e) => setMagazzinoId(e.target.value)}>
          <option value="">— Nessuno —</option>
          {magazzini.data?.map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.citta}</option>)}
        </Selezione>
        <Selezione etichetta="Stato" value={attivo ? 'si' : 'no'} onChange={(e) => setAttivo(e.target.value === 'si')}>
          <option value="si">Attivo (riceve eventi)</option>
          <option value="no">Non attivo</option>
        </Selezione>
      </div>
      <SceltaRegioni valore={regioni} onChange={setRegioni} etichetta="Regioni coperte" />
      {aggiorna.error && <Errore errore={aggiorna.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={aggiorna.isPending}>Salva</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}
