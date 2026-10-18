import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTipiBooth } from '@/modules/anagrafiche/api'
import { leggiImporto } from '@/modules/conti/conti'
import { costruisciOrari } from '../logic/orari'
import type { EventoGestioneCompleto } from '../types'
import { combinaDataOra, ora } from '@/shared/lib/formato'
import { giornoRoma } from '@/shared/lib/date'
import { useAdesso } from '@/shared/lib/tempo'
import { REGIONI, type Enum, type Inserimento } from '@/shared/types/database'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { AreaTesto, Campo, Selezione, SiNo } from '@/shared/ui/Campo'
import { SceltaData, SceltaOra } from '@/shared/ui/SceltaData'
import { Errore } from '@/shared/ui/Stati'
import { SceltaCliente } from '@/modules/clienti/SceltaCliente'

type Valori = {
  clienteId: string
  nome: string
  prezzo: string
  tipoBoothId: string
  indirizzo: string; citta: string; regione: Enum<'regione'>; noteAccesso: string
  ztl: boolean | null; wifi: boolean | null; hostess: boolean
  data: string; allestimento: string; inizio: string; fine: string; smontaggio: string
  referenteNome: string; referenteTelefono: string; outfit: string; note: string
}

const vuoto: Valori = {
  clienteId: '',
  nome: '',
  prezzo: '',
  tipoBoothId: '',
  indirizzo: '', citta: '', regione: 'Toscana', noteAccesso: '',
  // ZTL e Wi‑Fi vanno scelti: un "no" messo da noi potrebbe non essere vero
  ztl: null, wifi: null, hostess: false,
  data: '', allestimento: '18:30', inizio: '20:00', fine: '23:30', smontaggio: '23:45',
  referenteNome: '', referenteTelefono: '', outfit: '', note: '',
}

function daEvento(e: EventoGestioneCompleto): Valori {
  return {
    clienteId: e.cliente_id ?? '',
    nome: e.nome ?? '',
    prezzo: '',
    tipoBoothId: e.tipo_booth_id ?? '',
    indirizzo: e.indirizzo, citta: e.citta, regione: e.regione, noteAccesso: e.note_accesso ?? '',
    ztl: e.ztl, wifi: e.wifi, hostess: e.hostess,
    data: giornoRoma(e.allestimento_il), allestimento: ora(e.allestimento_il), inizio: ora(e.inizio_attivazione),
    fine: ora(e.fine_attivazione), smontaggio: ora(e.smontaggio_il),
    referenteNome: e.referente_nome ?? '', referenteTelefono: e.referente_telefono ?? '', outfit: e.outfit ?? '', note: e.note ?? '',
  }
}

const pieno = (t: string) => t.trim().length > 0

/** Cosa manca o è sbagliato, campo per campo. Facoltativi solo "steward" e le note per l'operatore. */
function controlla(m: Valori, conPrezzo: boolean, clienteObbligatorio: boolean): Partial<Record<keyof Valori, string>> {
  const errori: Partial<Record<keyof Valori, string>> = {}
  if (clienteObbligatorio && !m.clienteId) errori.clienteId = 'Scegli il cliente o creane uno nuovo'
  if (!pieno(m.nome)) errori.nome = "Scrivi il nome dell'evento"
  if (!m.tipoBoothId) errori.tipoBoothId = 'Scegli il tipo di booth'
  if (conPrezzo && !leggiImporto(m.prezzo)) errori.prezzo = 'Scrivi il prezzo, per esempio 1.200'
  if (!m.data) errori.data = 'Scegli il giorno'
  if (!pieno(m.indirizzo)) errori.indirizzo = "Scrivi l'indirizzo"
  if (!pieno(m.citta)) errori.citta = 'Scrivi la città'
  if (!pieno(m.noteAccesso)) errori.noteAccesso = "Spiega come si arriva e dove si scarica"
  if (m.ztl === null) errori.ztl = 'Scegli sì o no'
  if (m.wifi === null) errori.wifi = 'Scegli sì o no'
  if (m.hostess && !pieno(m.outfit)) errori.outfit = "Scrivi l'outfit"
  if (!pieno(m.referenteNome)) errori.referenteNome = 'Scrivi chi è il referente'
  if (m.referenteTelefono.replace(/\D/g, '').length < 6) errori.referenteTelefono = 'Scrivi un numero di telefono'
  return errori
}

const NOMI_CAMPI: Partial<Record<keyof Valori, string>> = {
  clienteId: 'cliente', nome: 'nome', tipoBoothId: 'tipo di booth', prezzo: 'prezzo', data: 'giorno', indirizzo: 'indirizzo', citta: 'città',
  noteAccesso: 'accesso e scarico', ztl: 'ZTL', wifi: 'Wi‑Fi', outfit: 'outfit', referenteNome: 'referente', referenteTelefono: 'telefono del referente',
}

type Props = {
  evento?: EventoGestioneCompleto
  /** Con il prezzo al cliente (obbligatorio): solo alla creazione, poi si cambia nei conti dell'evento */
  conPrezzo?: boolean
  /** Con la scelta del cliente (chi può vedere i clienti); obbligatorio quando si crea l'evento */
  conCliente?: boolean
  onSalva: (dati: Omit<Inserimento<'eventi'>, 'project_id'>, prezzo: number | null) => Promise<unknown>
  testoPulsante: string
}

/** Modulo dell'evento, usato sia per creare sia per modificare. */
export function ModuloEvento({ evento, conPrezzo = false, conCliente = false, onSalva, testoPulsante }: Props) {
  const clienteObbligatorio = conCliente && !evento
  const [m, setM] = useState<Valori>(() => (evento ? daEvento(evento) : vuoto))
  const imposta = <K extends keyof Valori>(k: K, v: Valori[K]) => setM((p) => ({ ...p, [k]: v }))
  // Gli errori dei campi si mostrano dopo il primo tentativo di salvare, e si aggiornano mentre si corregge
  const [provato, setProvato] = useState(false)
  const errori = provato ? controlla(m, conPrezzo, clienteObbligatorio) : {}
  const testo = (k: keyof Valori) => ({ value: m[k] as string, errore: errori[k], onChange: (e: { target: { value: string } }) => imposta(k, e.target.value as never) })

  const tipi = useTipiBooth()
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<unknown>()
  const oggi = giornoRoma(useAdesso())

  const orari = useMemo(() => {
    if (!m.data) return null
    const [allestimento, inizio, fine, smontaggio] = costruisciOrari(m.data, [m.allestimento, m.inizio, m.fine, m.smontaggio], combinaDataOra)
    return { allestimento, inizio, fine, smontaggio }
  }, [m.data, m.allestimento, m.inizio, m.fine, m.smontaggio])

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    setProvato(true)
    const mancano = Object.keys(controlla(m, conPrezzo, clienteObbligatorio)) as (keyof Valori)[]
    if (mancano.length > 0 || !orari) {
      setErrore(new Error(`Mancano ${mancano.length === 1 ? 'un dato' : `${mancano.length} dati`}: ${mancano.map((k) => NOMI_CAMPI[k]).join(', ')}.`))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!evento && new Date(orari.allestimento).getTime() < Date.now()) {
      setErrore(new Error("L'allestimento è già passato: controlla giorno e orari."))
      return
    }
    setInvio(true)
    setErrore(undefined)
    try {
      await onSalva({
        // Il cliente si tocca solo se si vede: chi non vede i clienti non lo cancella modificando l'evento
        ...(conCliente && { cliente_id: m.clienteId || null }),
        nome: m.nome.trim(),
        tipo_booth_id: m.tipoBoothId || null,
        indirizzo: m.indirizzo.trim(), citta: m.citta.trim(), regione: m.regione, note_accesso: m.noteAccesso.trim(),
        // "hostess" nel database = l'operatore fa anche da steward
        ztl: m.ztl ?? false, wifi: m.wifi ?? false, hostess: m.hostess,
        allestimento_il: orari.allestimento, inizio_attivazione: orari.inizio, fine_attivazione: orari.fine, smontaggio_il: orari.smontaggio,
        referente_nome: m.referenteNome.trim(), referente_telefono: m.referenteTelefono.trim(),
        outfit: m.hostess ? m.outfit.trim() : null, note: m.note.trim() || null,
      }, conPrezzo ? leggiImporto(m.prezzo) : null)
    } catch (err) {
      setErrore(err)
    } finally {
      setInvio(false)
    }
  }

  return (
    <form onSubmit={invia} noValidate className="flex flex-col gap-4 max-w-3xl">
      {errore != null && <Errore errore={errore} />}

      <Sezione titolo="Evento">
        {conCliente && <SceltaCliente valore={m.clienteId} onChange={(id) => imposta('clienteId', id)} errore={errori.clienteId} />}
        <Campo etichetta="Nome dell'evento" maxLength={120} placeholder="Matrimonio Rossi" {...testo('nome')} />
        <Griglia>
          <Selezione etichetta="Tipo di booth" {...testo('tipoBoothId')}>
            <option value="">Scegli…</option>
            {[...new Set(tipi.data?.map((t) => t.linea))].map((linea) => (
              <optgroup key={linea} label={linea}>
                {tipi.data?.filter((t) => t.linea === linea).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </optgroup>
            ))}
          </Selezione>
          {conPrezzo && <Campo etichetta="Prezzo al cliente (€)" inputMode="decimal" placeholder="1.200" {...testo('prezzo')} />}
        </Griglia>
      </Sezione>

      <Sezione titolo="Data e orari">
        <SceltaData etichetta="Giorno" valore={m.data} onChange={(g) => imposta('data', g)} min={evento ? undefined : oggi}
          errore={errori.data} className="max-w-sm" />
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
          <SceltaOra etichetta="Allestimento" valore={m.allestimento} onChange={(v) => imposta('allestimento', v)} />
          <SceltaOra etichetta="Inizio attivazione" valore={m.inizio} onChange={(v) => imposta('inizio', v)} />
          <SceltaOra etichetta="Fine attivazione" valore={m.fine} onChange={(v) => imposta('fine', v)} />
          <SceltaOra etichetta="Smontaggio" valore={m.smontaggio} onChange={(v) => imposta('smontaggio', v)} />
        </div>
      </Sezione>

      <Sezione titolo="Luogo">
        <Campo etichetta="Indirizzo" placeholder="Via Gusciana, 27" {...testo('indirizzo')} />
        <Griglia>
          <Campo etichetta="Città" {...testo('citta')} />
          <Selezione etichetta="Regione" {...testo('regione')}>
            {REGIONI.map((r) => <option key={r}>{r}</option>)}
          </Selezione>
        </Griglia>
        <AreaTesto etichetta="Accesso e scarico" rows={2} placeholder="Scarico, scale, sosta del mezzo…" {...testo('noteAccesso')} />
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
          <SiNo etichetta="ZTL" valore={m.ztl} onChange={(v) => imposta('ztl', v)} errore={errori.ztl} />
          <SiNo etichetta="Wi‑Fi" valore={m.wifi} onChange={(v) => imposta('wifi', v)} errore={errori.wifi} />
        </div>
      </Sezione>

      <Sezione titolo="Operatore">
        <div className="max-w-sm"><SiNo etichetta="Fa anche da steward" valore={m.hostess} onChange={(v) => imposta('hostess', v)} /></div>
        {m.hostess && <Campo etichetta="Outfit" placeholder="Total black con giacca" {...testo('outfit')} className="max-w-xl" />}
      </Sezione>

      <Sezione titolo="Referente e note">
        <Griglia>
          <Campo etichetta="Referente in loco" {...testo('referenteNome')} />
          <Campo etichetta="Telefono referente" type="tel" placeholder="+39…" {...testo('referenteTelefono')} />
        </Griglia>
        <AreaTesto etichetta="Note per l'operatore (facoltative)" rows={2} {...testo('note')} />
      </Sezione>

      <button type="submit" disabled={invio}
        className="h-12 px-6 self-start rounded-lg bg-accento text-su-accento font-semibold flex items-center gap-2 cursor-pointer hover:bg-accento-hover disabled:opacity-50">
        {invio && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {testoPulsante}
      </button>
    </form>
  )
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <TitoloSezione>{titolo}</TitoloSezione>
      {children}
    </Card>
  )
}

const Griglia = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">{children}</div>
)
