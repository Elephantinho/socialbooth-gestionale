import { AttivaNotifiche } from '@/modules/comunicazione/components/AttivaNotifiche'
import { Logo } from '@/shared/ui/Logo'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { Avatar } from '@/shared/ui/Avatar'
import { Campanella } from '@/modules/comunicazione/components/Campanella'
import { useEventiOperatore, useProposteInAttesa, useRispondiProposta } from '@/modules/eventi/api'
import type { EventoDettaglio, Proposta } from '@/modules/eventi/types'
import { dataBreve, nomeCompleto, ora, traQuanto } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

export function HomeOperatore() {
  const profilo = useProfilo()
  const eventi = useEventiOperatore(profilo.id)
  const proposte = useProposteInAttesa(profilo.id)

  const oggi = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const [prossimo, ...altri] = eventi.data ?? []

  return (
    <div className="flex flex-col gap-6 px-5 pt-sicura pb-6">
      <header className="flex items-start justify-between pt-2">
        <div>
          <Logo taglia="sm" className="mb-3" />
          <h1 className="font-display text-[26px] font-semibold leading-tight first-letter:uppercase">{oggi}</h1>
        </div>
        <div className="flex items-center gap-2">
        <Campanella />
        <Link to="/operatore/profilo" aria-label="Il mio profilo">
          <Avatar nome={nomeCompleto(profilo)} foto={profilo.foto} taglia="md" className="ring-2 ring-superficie" />
        </Link>
        </div>
      </header>

      <AttivaNotifiche />

      {!!proposte.data?.length && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <TitoloSezione>Da accettare</TitoloSezione>
            <span className="rounded-full bg-urgente px-2 text-xs font-semibold text-white">{proposte.data.length}</span>
          </div>
          {proposte.data.map((p) => <PropostaCard key={p.id} proposta={p} />)}
        </section>
      )}

      {eventi.isPending ? <Caricamento /> : eventi.error ? <Errore errore={eventi.error} /> : prossimo ? (
        <ProssimoEvento evento={prossimo} />
      ) : (
        <Card><Vuoto titolo="Nessun evento in programma" testo="Quando ti assegnano un evento lo trovi qui." /></Card>
      )}



      {altri.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <TitoloSezione>Prossimi</TitoloSezione>
          {altri.map((e) => (
            <Link key={e.id} to={`/operatore/eventi/${e.id}`}>
              <Card className="p-4 flex items-center justify-between active:scale-[0.99] transition">
                <div>
                  <p className="font-semibold">{e.tipo_booth?.nome ?? 'Evento'}</p>
                  <p className="text-sm text-tenue">{dataBreve(e.allestimento_il)}, {e.citta}</p>
                </div>
                <ChevronRight className="size-5 text-tenue" aria-hidden />
              </Card>
            </Link>
          ))}
        </section>
      )}

    </div>
  )
}

function ProssimoEvento({ evento: e }: { evento: EventoDettaglio }) {
  return (
    <div>
      <Card tono="scuro" className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-accento-scuro">Il tuo prossimo evento</span>
          <span className="text-xs font-semibold bg-scuro-3 text-accento-scuro px-2.5 py-1.5 rounded-full">{traQuanto(e.allestimento_il)}</span>
        </div>
        <div>
          <p className="font-display text-[26px] font-semibold leading-tight">{e.tipo_booth?.nome ?? 'Evento'}</p>
          <p className="text-[15px] text-tenue mt-1">{dataBreve(e.allestimento_il)}, {e.citta}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Orario etichetta="Allestimento" valore={ora(e.allestimento_il)} />
          <Orario etichetta="Inizio" valore={ora(e.inizio_attivazione)} />
          <Orario etichetta="Smontaggio" valore={ora(e.smontaggio_il)} />
        </div>
        {e.note_accesso && (
          <p className="flex items-start gap-2 text-[13px] font-medium text-avviso-testo">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
            <span className="line-clamp-2">{e.note_accesso}</span>
          </p>
        )}
        <Link
          to={`/operatore/eventi/${e.id}`}
          className="h-[50px] rounded-lg bg-accento text-su-accento font-semibold text-[15px] flex items-center justify-center gap-2 active:translate-y-px"
        >
          Apri la scheda
        </Link>
      </Card>
    </div>
  )
}

function Orario({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="bg-superficie border border-evidenza-bordo rounded-lg px-3 py-2.5">
      <p className="text-[11px] font-semibold text-su-scuro-tenue">{etichetta}</p>
      <p className="text-lg font-semibold mt-0.5">{valore}</p>
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
            <p className="font-semibold text-[16px]">{e.tipo_booth?.nome ?? 'Evento'}</p>
            <p className="text-sm text-tenue mt-0.5">{dataBreve(e.allestimento_il)}, {e.citta}</p>
            <p className="text-sm text-tenue">{ora(e.allestimento_il)} – {ora(e.smontaggio_il)}</p>
          </div>
          {oreAllaScadenza != null && (
            <span className="shrink-0 text-xs font-semibold text-urgente-testo bg-urgente-tenue px-2.5 py-1.5 rounded-xl">
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
