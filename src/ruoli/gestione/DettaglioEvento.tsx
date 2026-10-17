import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Phone, UserRound } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { giaPassato } from '@/modules/eventi/logic/archivio'
import { useAggiornaEvento, useConcludiEvento, useEventoGestione } from '@/modules/eventi/api'
import { ritardo } from '@/modules/passaggi/ritardi'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { ModuloEvento } from '@/modules/eventi/components/ModuloEvento'
import type { EventoGestioneCompleto } from '@/modules/eventi/types'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { dataLunga, nomeCompleto, ora } from '@/shared/lib/formato'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { Andamento } from '@/modules/passaggi/Andamento'

export function DettaglioEvento() {
  const { id = '' } = useParams()
  const { data: e, isPending, error } = useEventoGestione(id)
  const [modifica, setModifica] = useState(false)
  const aggiorna = useAggiornaEvento()
  const puo = usePuo()
  const modificabile = puo('eventi.modifica')
  const creatore = puo('eventi.crea')

  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />

  const annullato = e.stato === 'annullato'
  const chiuso = e.stato === 'completato'

  function annulla() {
    if (confirm("Annullare l'evento? L'operatore non lo vedrà più tra i suoi incarichi.")) {
      aggiorna.mutate({ id: e!.id, modifiche: { stato: 'annullato' } })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <Link to="/gestione" className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro">
            <ArrowLeft className="size-4" aria-hidden /> Eventi
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="font-display text-[26px] font-semibold leading-tight">{nomeEvento(e)}</h1>
            <StatoEvento stato={e.stato} />
          </div>
          <p className="text-tenue font-medium mt-1">
            {e.nome && e.tipo_booth ? `${e.tipo_booth.nome}, ` : ''}#{String(e.codice).padStart(4, '0')}, {dataLunga(e.allestimento_il)}, {e.citta}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!modificabile ? null : annullato ? creatore && (
            <Pulsante variante="secondario" caricamento={aggiorna.isPending}
              onClick={() => aggiorna.mutate({ id: e.id, modifiche: { stato: 'da_assegnare', operatore_id: null } })}>
              Riapri evento
            </Pulsante>
          ) : !chiuso && (
            <>
              {creatore && (
                <>
                  <Pulsante variante="secondario" onClick={annulla} disabled={aggiorna.isPending}>
                    Annulla evento
                  </Pulsante>
                </>
              )}
              <Pulsante variante={modifica ? 'scuro' : 'primario'}
                onClick={() => setModifica((v) => !v)}>
                {modifica ? 'Chiudi modifica' : 'Modifica'}
              </Pulsante>
            </>
          )}
        </div>
      </div>

      {aggiorna.error && <Errore errore={aggiorna.error} />}
      <DaChiudere e={e} />

      {modifica ? (
        <ModuloEvento
          evento={e}
          testoPulsante="Salva modifiche"
          onSalva={async (dati) => {
            await aggiorna.mutateAsync({ id: e.id, modifiche: dati })
            setModifica(false)
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-6 items-start">
          <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-4">
            <Riepilogo e={e} />
          </div>
          <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-4">
            {['confermato', 'in_corso', 'completato'].includes(e.stato) && (
              <Card className="p-5 flex flex-col gap-4">
                <TitoloSezione>Andamento</TitoloSezione>
                <Andamento eventoId={e.id} />
              </Card>
            )}
            <Operatore e={e} />
          </aside>
        </div>
      )}
    </div>
  )
}

function Riepilogo({ e }: { e: EventoGestioneCompleto }) {
  const righe: [string, string][] = [
    ['Project', e.project ? nomeCompleto(e.project) : '—'],
    ['Indirizzo', `${e.indirizzo}, ${e.citta} (${e.regione})`],
    ['Allestimento', ora(e.allestimento_il)],
    ['Attivazione', `${ora(e.inizio_attivazione)} – ${ora(e.fine_attivazione)}`],
    ['Smontaggio', ora(e.smontaggio_il)],
    ['ZTL / Wi‑Fi', `${e.ztl ? 'Sì' : 'No'} / ${e.wifi ? 'Sì' : 'No'}`],
    ['Steward', e.hostess ? `Sì, outfit: ${e.outfit || 'da definire'}` : 'No'],
    ['Referente', [e.referente_nome, e.referente_telefono].filter(Boolean).join(', ') || '—'],
  ]
  return (
    <Card className="p-5 md:p-6 flex flex-col gap-4">
      <TitoloSezione>Dettagli</TitoloSezione>
      <dl className="grid gap-x-6 gap-y-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        {righe.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-semibold text-tenue">{k}</dt>
            <dd className="font-semibold mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      {e.note_accesso && (
        <div className="rounded-xl bg-avviso p-4">
          <p className="text-sm font-semibold text-avviso-titolo">Accesso e scarico</p>
          <p className="text-sm text-avviso-testo mt-1 whitespace-pre-line">{e.note_accesso}</p>
        </div>
      )}
      {e.note && <p className="text-sm whitespace-pre-line"><span className="font-semibold">Note: </span>{e.note}</p>}
    </Card>
  )
}

function Operatore({ e }: { e: EventoGestioneCompleto }) {
  const puoAssegnare = usePuo()('eventi.assegna') && ['da_assegnare', 'proposto', 'confermato'].includes(e.stato) && !giaPassato(e)
  // Senza operatore l'elenco dei liberi è già aperto: è la prossima cosa da fare
  const [scegli, setScegli] = useState(puoAssegnare && !e.operatore)
  const numero = e.operatore?.telefono?.replace(/[^\d+]/g, '')

  return (
    <Card className="p-5 flex flex-col gap-4">
      <TitoloSezione>Operatore</TitoloSezione>
      {e.operatore ? (
        <div className="bg-superficie border border-evidenza-bordo rounded-xl p-3.5 flex items-center gap-3">
          <Link to={`/gestione/operatori/${e.operatore.id}`}><Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} /></Link>
          <div className="flex-1 min-w-0">
            <Link to={`/gestione/operatori/${e.operatore.id}`} className="font-semibold truncate block hover:underline">{nomeCompleto(e.operatore)}</Link>
            <p className="text-xs text-su-scuro-tenue">
              {e.stato === 'proposto' ? 'Deve ancora accettare' : e.stato === 'confermato' ? 'Ha confermato' : e.stato === 'in_corso' ? 'Al lavoro' : e.stato === 'completato' ? 'Ha concluso' : 'Assegnato'}
            </p>
          </div>
          {numero && (
            <a href={`tel:${numero}`} aria-label="Chiama l'operatore" className="size-10 rounded-full border border-bordo-forte flex items-center justify-center">
              <Phone className="size-4" aria-hidden />
            </a>
          )}
        </div>
      ) : (
        <div className="bg-superficie border border-evidenza-bordo rounded-xl p-3.5 flex items-center gap-3 text-tenue">
          <UserRound className="size-5" aria-hidden /> Nessun operatore assegnato
        </div>
      )}
      {puoAssegnare && (
        <button onClick={() => setScegli((s) => !s)} aria-expanded={scegli}
          className="h-11 rounded-lg bg-superficie border border-bordo-forte hover:border-inchiostro font-semibold text-sm cursor-pointer">
          {e.operatore ? 'Cambia operatore' : 'Scegli operatore'}
        </button>
      )}
      <AnimatePresence initial={false}>
        {scegli && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-inchiostro">
            <AssegnaOperatore eventoId={e.id} onFatto={() => setScegli(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}


/** Evento iniziato che ha un passaggio in ritardo o è finito senza check-out: si può chiudere a mano */
function DaChiudere({ e }: { e: EventoGestioneCompleto }) {
  const concludi = useConcludiEvento()
  const puo = usePuo()('eventi.modifica')
  if (e.stato !== 'confermato' && e.stato !== 'in_corso') return null
  const manca = ritardo(e)
  const finito = giaPassato(e)
  if (!manca && !finito) return null
  const iniziato = new Date(e.allestimento_il).getTime() <= Date.now()
  return (
    <Card tono="urgente" className="p-4 flex flex-wrap items-center gap-3 justify-between -mt-2">
      <div>
        <p className="font-semibold text-urgente-testo">{manca ?? 'Evento finito ma non chiuso'}</p>
        <p className="text-sm mt-0.5">Senti l'operatore. Se l'evento è concluso e manca solo il check-out, puoi chiuderlo tu.</p>
      </div>
      {puo && iniziato && (
        <Pulsante variante="secondario" caricamento={concludi.isPending}
          onClick={() => { if (confirm("Chiudere l'evento come completato?")) concludi.mutate(e.id) }}>
          Chiudi evento
        </Pulsante>
      )}
      {concludi.error && <Errore errore={concludi.error} />}
    </Card>
  )
}
