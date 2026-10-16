import { StatoMontaggio } from '@/modules/montaggio/components/Montaggio'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Ban, Check, Copy, Pencil, Phone, RotateCcw, UserRound, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { usePuo } from '@/modules/auth/permessi'
import { giaPassato, inArchivio } from '@/modules/eventi/logic/archivio'
import { useAggiornaEvento, useApprovaOre, useEventoGestione } from '@/modules/eventi/api'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { ModuloEvento } from '@/modules/eventi/components/ModuloEvento'
import type { EventoGestioneCompleto } from '@/modules/eventi/types'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { CostiEvento } from '@/modules/costi/components/CostiEvento'
import { InfoLuogo } from '@/modules/luogo/components/InfoLuogo'
import { AllegatiEvento } from '@/modules/comunicazione/components/AllegatiEvento'
import { AttrezzaturaEvento } from '@/modules/attrezzatura/components/AttrezzaturaEvento'
import { dataLunga, durata, euro, nomeCompleto, ora } from '@/shared/lib/formato'
import { Avatar } from '@/shared/ui/Avatar'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

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
          <Link to={inArchivio(e) ? '/gestione/archivio' : '/gestione'} className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro">
            <ArrowLeft className="size-4" aria-hidden /> {inArchivio(e) ? 'Eventi passati' : 'Eventi'}
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="font-display text-4xl font-semibold tracking-tight">{e.tipo_booth?.nome ?? 'Evento'}</h1>
            <StatoEvento stato={e.stato} />
          </div>
          <p className="text-tenue font-medium mt-1">
            #{String(e.codice).padStart(4, '0')}, {dataLunga(e.allestimento_il)}, {e.citta}{e.cliente?.nome && `, ${e.cliente.nome}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!modificabile ? null : annullato ? creatore && (
            <Pulsante variante="secondario" icona={<RotateCcw className="size-4" aria-hidden />} caricamento={aggiorna.isPending}
              onClick={() => aggiorna.mutate({ id: e.id, modifiche: { stato: 'da_assegnare', operatore_id: null } })}>
              Riapri evento
            </Pulsante>
          ) : !chiuso && (
            <>
              {creatore && (
                <>
                  <Link to={`/gestione/eventi/nuovo?da=${e.id}`} className="h-11 px-4 rounded-lg border border-bordo-forte bg-superficie font-semibold text-sm inline-flex items-center gap-2 hover:bg-sfondo">
                    <Copy className="size-4" aria-hidden /> Duplica
                  </Link>
                  <Pulsante variante="secondario" icona={<Ban className="size-4" aria-hidden />} onClick={annulla} disabled={aggiorna.isPending}>
                    Annulla evento
                  </Pulsante>
                </>
              )}
              <Pulsante variante={modifica ? 'scuro' : 'primario'} icona={modifica ? <X className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
                onClick={() => setModifica((v) => !v)}>
                {modifica ? 'Chiudi modifica' : 'Modifica'}
              </Pulsante>
            </>
          )}
        </div>
      </div>

      {aggiorna.error && <Errore errore={aggiorna.error} />}

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
            <OreEvento e={e} />
            {puo('soldi') && <CostiEvento e={e} />}
          </div>
          <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-4">
            <Operatore e={e} />
            <InfoLuogo indirizzo={e.indirizzo} citta={e.citta} lat={e.lat} lng={e.lng} data={e.allestimento_il}
              magazzino={e.magazzino ? { nome: e.magazzino.nome, lat: e.magazzino.lat, lng: e.magazzino.lng } : null} ztlDichiarata={e.ztl} compatto />
            <StatoMontaggio eventoId={e.id} />
            <AttrezzaturaEvento eventoId={e.id} magazzinoId={e.magazzino_id} modificabile={(puo('eventi.crea') || puo('magazzini')) && !annullato && !chiuso} />
            <AllegatiEvento eventoId={e.id} />
            <Storico e={e} />
          </aside>
        </div>
      )}
    </div>
  )
}

function Riepilogo({ e }: { e: EventoGestioneCompleto }) {
  const righe: [string, string][] = [
    ['Indirizzo', `${e.indirizzo}, ${e.citta} (${e.regione})`],
    ['Ritiro magazzino', e.ritiro_magazzino_il ? `${ora(e.ritiro_magazzino_il)}, ${e.magazzino?.nome ?? ''}, ${e.viaggio_minuti ?? '?'} min di viaggio` : '—'],
    ['Allestimento', ora(e.allestimento_il)],
    ['Attivazione', `${ora(e.inizio_attivazione)} – ${ora(e.fine_attivazione)}`],
    ['Smontaggio', ora(e.smontaggio_il)],
    ['ZTL / Wi‑Fi / Hostess', `${e.ztl ? 'Sì' : 'No'} / ${e.wifi ? 'Sì' : 'No'} / ${e.hostess ? 'Sì' : 'No'}`],
    ['Outfit', e.outfit || '—'],
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
  const [scegli, setScegli] = useState(false)
  const puoAssegnare = usePuo()('eventi.assegna') && ['da_assegnare', 'proposto', 'confermato'].includes(e.stato) && !giaPassato(e)
  const numero = e.operatore?.telefono?.replace(/[^\d+]/g, '')

  return (
    <Card tono="scuro" className="p-5 flex flex-col gap-4">
      <TitoloSezione>Operatore</TitoloSezione>
      {e.operatore ? (
        <div className="bg-superficie border border-evidenza-bordo rounded-xl p-3.5 flex items-center gap-3">
          <Link to={`/gestione/operatori/${e.operatore.id}`}><Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} /></Link>
          <div className="flex-1 min-w-0">
            <Link to={`/gestione/operatori/${e.operatore.id}`} className="font-semibold truncate block hover:underline">{nomeCompleto(e.operatore)}</Link>
            <p className="text-xs text-su-scuro-tenue">
              {e.stato === 'proposto' ? 'Deve ancora accettare' : e.stato === 'confermato' ? 'Ha confermato' : e.stato === 'in_corso' ? 'Check-in fatto' : 'Assegnato'}
            </p>
          </div>
          {numero && (
            <a href={`tel:${numero}`} aria-label="Chiama l'operatore" className="size-10 rounded-full bg-scuro-3 text-accento-scuro flex items-center justify-center">
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
          className="h-11 rounded-lg bg-accento text-white font-semibold text-sm cursor-pointer">
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

const etichettaProposta: Record<string, string> = {
  in_attesa: 'in attesa', accettata: 'ha accettato', rifiutata: 'ha rifiutato', scaduta: 'scaduta', revocata: 'revocata',
}

function Storico({ e }: { e: EventoGestioneCompleto }) {
  if (!e.proposte.length) return null
  const proposte = [...e.proposte].sort((a, b) => b.creato_il.localeCompare(a.creato_il))
  return (
    <Card className="p-5 flex flex-col gap-3">
      <TitoloSezione className="text-[15px]">Storico proposte</TitoloSezione>
      {proposte.map((p) => (
        <div key={p.id} className="flex justify-between gap-3 text-sm">
          <span className="font-semibold">{p.operatore?.nome || 'Operatore'}{p.automatica && <span className="text-tenue font-medium">, automatica</span>}</span>
          <span className={cn('font-semibold', p.stato === 'rifiutata' ? 'text-urgente-testo' : p.stato === 'accettata' ? 'text-accento' : 'text-tenue')}>
            {etichettaProposta[p.stato]}
          </span>
        </div>
      ))}
    </Card>
  )
}

function OreEvento({ e }: { e: EventoGestioneCompleto }) {
  const profilo = useProfilo()
  const approva = useApprovaOre()
  const ore = e.ore.find((o) => o.check_out_il)
  const checkIn = e.ore.find((o) => o.partenza_il || o.check_in_il)

  if (!ore && !checkIn) return null

  return (
    <Card className="p-5 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <TitoloSezione>Ore e spese</TitoloSezione>
        {ore && (
          <span className={cn('text-xs font-semibold px-2.5 py-1.5 rounded-xl',
            ore.stato === 'approvato' ? 'bg-accento-tenue text-accento-scuro' : ore.stato === 'respinto' ? 'bg-urgente-tenue text-urgente-testo' : 'bg-avviso text-avviso-testo')}>
            {ore.stato === 'approvato' ? 'Approvate' : ore.stato === 'respinto' ? 'Respinte' : 'Da approvare'}
          </span>
        )}
      </div>
      {checkIn && (
        <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
          {([
            ['Partenza', checkIn.partenza_il, checkIn.partenza_lat, checkIn.partenza_lng],
            ['Arrivo', checkIn.check_in_il, checkIn.check_in_lat, checkIn.check_in_lng],
            ['Fine lavoro', checkIn.fine_il, null, null],
            ['Rientro', checkIn.rientro_il, checkIn.rientro_lat, checkIn.rientro_lng],
          ] as const).map(([etichetta, quando, lat, lng]) => (
            <div key={etichetta} className={cn('rounded-lg p-2.5', quando ? 'bg-accento-tenue/50' : 'bg-sfondo')}>
              <p className="text-xs font-semibold text-tenue">{etichetta}</p>
              <p className="font-semibold">{quando ? ora(quando) : '—'}</p>
              {lat != null && <a className="text-xs underline text-accento-scuro" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${lat},${lng}`}>posizione</a>}
            </div>
          ))}
        </div>
      )}
      {ore?.calcolo_automatico && <p className="text-xs font-semibold text-accento">Ore calcolate in automatico dalle tappe registrate dall'operatore</p>}
      {ore && (
        <>
          <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            <Dato etichetta="In location" valore={durata(ore.minuti_in_location)} />
            <Dato etichetta="Viaggio (a/r)" valore={durata(ore.minuti_viaggio)} />
            <Dato etichetta="Totale ore" valore={durata(ore.minuti_totali)} />
            <Dato etichetta="Compenso" valore={euro(ore.compenso)} evidenza />
          </div>
          {ore.nota_operatore && <p className="text-sm"><span className="font-semibold">Nota operatore: </span>{ore.nota_operatore}</p>}
          {approva.error && <Errore errore={approva.error} />}
          {ore.stato === 'inviato' && (
            <div className="flex gap-2 flex-wrap">
              <Pulsante variante="secondario" disabled={approva.isPending}
                onClick={() => approva.mutate({ oreId: ore.id, eventoId: e.id, approva: false, approvatoDa: profilo.id })}>
                Respingi
              </Pulsante>
              <Pulsante icona={<Check className="size-4" aria-hidden />} caricamento={approva.isPending}
                onClick={() => approva.mutate({ oreId: ore.id, eventoId: e.id, approva: true, approvatoDa: profilo.id })}>
                Approva ore e spese dell'operatore
              </Pulsante>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function Dato({ etichetta, valore, evidenza }: { etichetta: string; valore: string; evidenza?: boolean }) {
  return (
    <div className={cn('rounded-xl p-3', evidenza ? 'bg-accento-tenue text-accento-scuro' : 'bg-sfondo')}>
      <p className="text-xs font-semibold opacity-80">{etichetta}</p>
      <p className="text-lg font-semibold mt-0.5">{valore}</p>
    </div>
  )
}
