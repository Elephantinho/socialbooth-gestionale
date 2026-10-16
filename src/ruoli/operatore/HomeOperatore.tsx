import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, LogOut } from 'lucide-react'
import { useAuth, useProfilo } from '@/modules/auth/AuthProvider'
import { useEventiOperatore, useMeseOperatore, useProposteInAttesa, useRispondiProposta } from '@/modules/eventi/api'
import type { EventoDettaglio, Proposta } from '@/modules/eventi/types'
import { dataBreve, euro, ora, traQuanto } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

export function HomeOperatore() {
  const profilo = useProfilo()
  const { esci } = useAuth()
  const eventi = useEventiOperatore(profilo.id)
  const proposte = useProposteInAttesa(profilo.id)
  const mese = useMeseOperatore(profilo.id)

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const [prossimo, ...altri] = eventi.data ?? []
  const nomeMese = new Date().toLocaleDateString('it-IT', { month: 'long' })

  return (
    <div className="flex flex-col gap-6 px-5 pt-sicura pb-6">
      <header className="flex items-start justify-between pt-2">
        <div>
          <p className="text-[13px] font-semibold text-tenue first-letter:uppercase">{oggi}</p>
          <h1 className="font-display text-[30px] font-bold tracking-tight leading-tight">
            Ciao, {profilo.nome.split(' ')[0] || 'operatore'}
          </h1>
        </div>
        <button onClick={esci} aria-label="Esci" className="size-11 rounded-full border border-bordo bg-superficie flex items-center justify-center cursor-pointer">
          <LogOut className="size-[18px]" aria-hidden />
        </button>
      </header>

      {eventi.isPending ? <Caricamento /> : eventi.error ? <Errore errore={eventi.error} /> : prossimo ? (
        <ProssimoEvento evento={prossimo} />
      ) : (
        <Card><Vuoto titolo="Nessun evento in programma" testo="Quando ti assegnano un evento lo trovi qui." /></Card>
      )}

      {!!proposte.data?.length && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <TitoloSezione>Da accettare</TitoloSezione>
            <span className="rounded-full bg-urgente px-2 text-xs font-bold text-white">{proposte.data.length}</span>
          </div>
          {proposte.data.map((p) => <PropostaCard key={p.id} proposta={p} />)}
        </section>
      )}

      {altri.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <TitoloSezione>Prossimi</TitoloSezione>
          {altri.map((e) => (
            <Link key={e.id} to={`/operatore/eventi/${e.id}`}>
              <Card className="p-4 flex items-center justify-between active:scale-[0.99] transition">
                <div>
                  <p className="font-bold">{e.tipo_booth?.nome ?? 'Evento'}</p>
                  <p className="text-sm text-tenue">{dataBreve(e.allestimento_il)} · {e.citta}</p>
                </div>
                <ArrowRight className="size-5 text-tenue" aria-hidden />
              </Card>
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <TitoloSezione className="first-letter:uppercase">{nomeMese}</TitoloSezione>
        <div className="grid grid-cols-3 gap-2">
          <Statistica valore={String(mese.data?.eventi ?? '—')} etichetta="eventi" />
          <Statistica valore={mese.data ? `${Math.round(mese.data.minuti / 60)} h` : '—'} etichetta="lavorate" />
          <Statistica valore={mese.data ? euro(Math.round(mese.data.compenso)).replace(',00', '') : '—'} etichetta="compenso" evidenza />
        </div>
      </section>
    </div>
  )
}

function ProssimoEvento({ evento: e }: { evento: EventoDettaglio }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card tono="scuro" className="rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-accento-chiaro">Prossimo evento</span>
          <span className="text-xs font-bold bg-scuro-3 px-2.5 py-1.5 rounded-full">{traQuanto(e.allestimento_il)}</span>
        </div>
        <div>
          <p className="font-display text-[26px] font-bold leading-tight">{e.tipo_booth?.nome ?? 'Evento'}</p>
          <p className="text-[15px] text-[#C9CAD1] mt-1">{dataBreve(e.allestimento_il)} · {e.citta}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Orario etichetta="Ritiro" valore={ora(e.ritiro_magazzino_il)} />
          <Orario etichetta="Allestim." valore={ora(e.allestimento_il)} />
          <Orario etichetta="Attivaz." valore={ora(e.inizio_attivazione)} />
        </div>
        {e.note_accesso && (
          <p className="flex items-start gap-2 text-[13px] font-semibold text-avviso-icona">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
            <span className="line-clamp-2">{e.note_accesso}</span>
          </p>
        )}
        <Link
          to={`/operatore/eventi/${e.id}`}
          className="h-[50px] rounded-[14px] bg-white text-inchiostro font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          Apri scheda evento <ArrowRight className="size-[18px]" aria-hidden />
        </Link>
      </Card>
    </motion.div>
  )
}

function Orario({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="bg-scuro-2 rounded-[14px] px-3 py-2.5">
      <p className="text-[11px] font-semibold text-su-scuro-tenue">{etichetta}</p>
      <p className="text-lg font-bold mt-0.5">{valore}</p>
    </div>
  )
}

function PropostaCard({ proposta }: { proposta: Proposta }) {
  const rispondi = useRispondiProposta()
  const e = proposta.evento
  if (!e) return null
  const oreAllaScadenza = proposta.scade_il
    ? Math.max(0, Math.round((new Date(proposta.scade_il).getTime() - Date.now()) / 3_600_000))
    : null

  return (
    <motion.div layout exit={{ opacity: 0, height: 0 }}>
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-[16px]">{e.tipo_booth?.nome ?? 'Evento'}</p>
            <p className="text-sm text-tenue mt-0.5">{dataBreve(e.allestimento_il)} · {e.citta}</p>
            <p className="text-sm text-tenue">{ora(e.allestimento_il)} – {ora(e.smontaggio_il)}</p>
          </div>
          {oreAllaScadenza != null && (
            <span className="shrink-0 text-xs font-bold text-urgente-testo bg-urgente-tenue px-2.5 py-1.5 rounded-[10px]">
              Scade tra {oreAllaScadenza} h
            </span>
          )}
        </div>
        {rispondi.error && <Errore errore={rispondi.error} />}
        <div className="flex gap-2">
          <Pulsante variante="secondario" className="flex-1" disabled={rispondi.isPending}
            onClick={() => rispondi.mutate({ propostaId: proposta.id, accetta: false })}>
            Rifiuta
          </Pulsante>
          <Pulsante className="flex-[2]" caricamento={rispondi.isPending && rispondi.variables?.accetta}
            onClick={() => rispondi.mutate({ propostaId: proposta.id, accetta: true })}>
            Accetta
          </Pulsante>
        </div>
      </Card>
    </motion.div>
  )
}

function Statistica({ valore, etichetta, evidenza }: { valore: string; etichetta: string; evidenza?: boolean }) {
  return (
    <Card tono={evidenza ? 'accento' : 'chiaro'} className="rounded-2xl p-3">
      <p className="font-display text-[22px] font-bold leading-tight truncate">{valore}</p>
      <p className={evidenza ? 'text-xs font-semibold' : 'text-xs font-semibold text-tenue'}>{etichetta}</p>
    </Card>
  )
}
