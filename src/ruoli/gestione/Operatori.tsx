import { useState } from 'react'
import { useScorteCarta } from '@/modules/carta/api'
import { BadgeCarta } from '@/modules/carta/components/Carta'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Check, Search, Sparkles } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { useAggiornaProfilo, useMagazzini, useOperatori } from '@/modules/anagrafiche/api'
import { SceltaRegioni } from '@/modules/auth/SceltaRegioni'
import { euro, nomeCompleto } from '@/shared/lib/formato'
import { REGIONI, type Enum } from '@/shared/types/database'
import { Avatar } from '@/shared/ui/Avatar'
import { Card } from '@/shared/ui/Card'
import { Campo, Selezione } from '@/shared/ui/Campo'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Operatore = NonNullable<ReturnType<typeof useOperatori>['data']>[number]

export function Operatori() {
  const { data, isPending, error } = useOperatori()
  const admin = usePuo()('operatori.gestisci')
  const [regioneFiltro, setRegioneFiltro] = useState('')
  const [cerca, setCerca] = useState('')

  const corrisponde = (o: Operatore) => nomeCompleto(o).toLowerCase().includes(cerca.toLowerCase())
  const inAttesa = (data ?? []).filter((o) => !o.attivo && corrisponde(o))
  const attivi = (data ?? []).filter((o) => o.attivo && corrisponde(o))

  // Un operatore che copre più regioni compare in ognuna
  const perRegione = REGIONI
    .map((r) => ({ regione: r as string, operatori: attivi.filter((o) => o.zone.some((z) => z.regione === r)) }))
    .filter((g) => g.operatori.length && (!regioneFiltro || g.regione === regioneFiltro))
  const senzaRegione = attivi.filter((o) => !o.zone.length)

  return (
    <div className="flex flex-col gap-7">
      <Intestazione
        sopra="Gestione"
        titolo="Operatori"
        descrizione="Divisi per regione di riferimento. Clicca su un operatore per vedere eventi, compensi e margini."
      />

      <div className="flex flex-wrap gap-3 items-end">
        <label className="relative flex-[1_1_260px] max-w-md">
          <span className="sr-only">Cerca operatore</span>
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-tenue" aria-hidden />
          <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per nome"
            className="w-full h-12 rounded-xl border border-bordo-forte bg-superficie pl-10 pr-3 text-[15px] focus:outline-none focus:border-accento focus:ring-3 focus:ring-accento/15" />
        </label>
        <Selezione etichetta="" aria-label="Regione" value={regioneFiltro} onChange={(e) => setRegioneFiltro(e.target.value)} className="w-56">
          <option value="">Tutte le regioni</option>
          {REGIONI.map((r) => <option key={r}>{r}</option>)}
        </Selezione>
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !data.length ? (
        <Card><Vuoto titolo="Nessun operatore" testo="Condividi il link dell'app: gli operatori possono registrarsi da soli scegliendo le loro regioni." /></Card>
      ) : (
        <>
          {inAttesa.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-urgente-testo">Da approvare · {inAttesa.length}</h2>
              <Griglia>{inAttesa.map((o) => <SchedaOperatore key={o.id} o={o} admin={admin} />)}</Griglia>
            </section>
          )}

          {perRegione.map((g) => (
            <section key={g.regione} className="flex flex-col gap-3">
              <h2 className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xl font-bold">{g.regione}</span>
                <span className="text-sm font-semibold text-tenue">{g.operatori.length} {g.operatori.length === 1 ? 'operatore' : 'operatori'}</span>
                {g.operatori.length === 1 && (
                  <span className="text-[11px] font-bold bg-accento-tenue text-accento-scuro px-2 py-1 rounded-md inline-flex items-center gap-1">
                    <Sparkles className="size-3" aria-hidden /> assegnazione automatica
                  </span>
                )}
              </h2>
              <Griglia>{g.operatori.map((o) => <SchedaOperatore key={`${g.regione}-${o.id}`} o={o} admin={admin} />)}</Griglia>
            </section>
          ))}

          {!regioneFiltro && senzaRegione.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-urgente-testo">Senza regione · non ricevono eventi</h2>
              <Griglia>{senzaRegione.map((o) => <SchedaOperatore key={o.id} o={o} admin={admin} />)}</Griglia>
            </section>
          )}
        </>
      )}
    </div>
  )
}

const Griglia = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">{children}</div>
)

function SchedaOperatore({ o, admin }: { o: Operatore; admin: boolean }) {
  const puo = usePuo()
  const soldi = puo('tariffe')
  const carta = puo('carta.ricarica')
  const aggiorna = useAggiornaProfilo()
  const nome = nomeCompleto(o)
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="p-4 flex flex-col gap-3 h-full hover:shadow-[0_8px_24px_-12px_rgba(21,22,26,0.25)] transition-shadow">
        <Link to={`/gestione/operatori/${o.id}`} className="flex items-center gap-3 min-w-0">
          <Avatar nome={nome} foto={o.foto} taglia="lg" />
          <div className="min-w-0">
            <p className="font-bold text-[16px] truncate">{nome}</p>
            {soldi && <p className="text-sm text-tenue">{o.tariffa_oraria != null ? `${euro(o.tariffa_oraria)}/ora` : 'tariffa da impostare'}</p>}
          </div>
        </Link>
        <p className={o.magazzino ? 'text-sm font-semibold inline-flex items-center gap-1.5' : 'text-sm font-semibold text-urgente-testo inline-flex items-center gap-1.5'}>
          <Building2 className="size-4 shrink-0" aria-hidden /> <span className="truncate">{o.magazzino?.nome ?? 'Nessun magazzino'}</span>
        </p>
        {o.attivo && carta && <CartaOperatore id={o.id} />}
        <div className="flex flex-wrap gap-1.5">
          {o.zone.map((z) => <span key={z.regione} className="text-[11px] font-bold bg-sfondo border border-bordo px-2 py-0.5 rounded-full">{z.regione}</span>)}
        </div>
        {admin && !o.attivo && (
          <Pulsante className="mt-auto" icona={<Check className="size-4" aria-hidden />} caricamento={aggiorna.isPending}
            onClick={() => aggiorna.mutate({ id: o.id, modifiche: { attivo: true } })}>
            Approva
          </Pulsante>
        )}
      </Card>
    </motion.div>
  )
}

/** Badge carta: rossa se sta finendo (i dati arrivano da una sola richiesta condivisa) */
function CartaOperatore({ id }: { id: string }) {
  const scorta = useScorteCarta().data?.find((s) => s.id === id)
  return scorta ? <div><BadgeCarta stato={scorta} /></div> : null
}

/**
 * Modifica dei dati di un operatore.
 * Gestore operatori: anagrafica, regioni, magazzino, stato. Amministrazione: tariffa. Admin: tutto.
 */
export function ModificaOperatore({ o, onFatto }: { o: Operatore | (Operatore & Record<string, unknown>); onFatto: () => void }) {
  const puo = usePuo()
  const gestisce = puo('operatori.gestisci')
  const tariffe = puo('tariffe')
  const magazzini = useMagazzini()
  const aggiorna = useAggiornaProfilo()
  const [nome, setNome] = useState(o.nome)
  const [cognome, setCognome] = useState(o.cognome)
  const [telefono, setTelefono] = useState(o.telefono ?? '')
  const [tariffa, setTariffa] = useState(o.tariffa_oraria != null ? String(o.tariffa_oraria) : '')
  const [magazzinoId, setMagazzinoId] = useState(o.magazzino_id ?? '')
  const [regioni, setRegioni] = useState<Enum<'regione'>[]>(o.zone.map((z) => z.regione))
  const [attivo, setAttivo] = useState(o.attivo)

  return (
    <form className="p-5 flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault()
      aggiorna.mutate({
        id: o.id,
        modifiche: {
          ...(gestisce ? { nome, cognome, telefono: telefono || null, magazzino_id: magazzinoId || null, attivo } : {}),
          ...(tariffe ? { tariffa_oraria: tariffa ? Number(tariffa) : null } : {}),
        },
        regioni: gestisce ? regioni : undefined,
      }, { onSuccess: onFatto })
    }}>
      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        <Campo etichetta="Nome" required disabled={!gestisce} value={nome} onChange={(e) => setNome(e.target.value)} />
        <Campo etichetta="Cognome" disabled={!gestisce} value={cognome} onChange={(e) => setCognome(e.target.value)} />
        <Campo etichetta="Telefono" type="tel" disabled={!gestisce} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        {tariffe && <Campo etichetta="Tariffa oraria (€)" type="number" min={0} step="0.5" value={tariffa} onChange={(e) => setTariffa(e.target.value)} />}
        <Selezione etichetta="Magazzino di riferimento" disabled={!gestisce} value={magazzinoId} onChange={(e) => setMagazzinoId(e.target.value)}>
          <option value="">— Nessuno —</option>
          {magazzini.data?.map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.citta}</option>)}
        </Selezione>
        <Selezione etichetta="Stato" disabled={!gestisce} value={attivo ? 'si' : 'no'} onChange={(e) => setAttivo(e.target.value === 'si')}>
          <option value="si">Attivo (riceve eventi)</option>
          <option value="no">Non attivo</option>
        </Selezione>
      </div>
      {gestisce && <SceltaRegioni valore={regioni} onChange={setRegioni} etichetta="Regioni di riferimento" />}
      {aggiorna.error && <Errore errore={aggiorna.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={aggiorna.isPending}>Salva</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}
