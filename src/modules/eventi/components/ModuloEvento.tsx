import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTipiBooth } from '@/modules/anagrafiche/api'
import { costruisciOrari } from '../logic/orari'
import type { EventoGestioneCompleto } from '../types'
import { combinaDataOra, ora } from '@/shared/lib/formato'
import { giornoRoma } from '@/shared/lib/date'
import { REGIONI, type Enum, type Inserimento } from '@/shared/types/database'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { AreaTesto, Campo, Selezione, SiNo } from '@/shared/ui/Campo'
import { Errore } from '@/shared/ui/Stati'
import { leggiImporto } from '@/modules/conti/conti'

type Valori = {
  nome: string
  prezzo: string
  tipoBoothId: string
  indirizzo: string; citta: string; regione: Enum<'regione'>; noteAccesso: string
  ztl: boolean; wifi: boolean; hostess: boolean
  data: string; allestimento: string; inizio: string; fine: string; smontaggio: string
  referenteNome: string; referenteTelefono: string; outfit: string; note: string
}

const vuoto: Valori = {
  nome: '',
  prezzo: '',
  tipoBoothId: '',
  indirizzo: '', citta: '', regione: 'Toscana', noteAccesso: '',
  ztl: false, wifi: false, hostess: false,
  data: '', allestimento: '18:30', inizio: '20:00', fine: '23:30', smontaggio: '23:45',
  referenteNome: '', referenteTelefono: '', outfit: '', note: '',
}

function daEvento(e: EventoGestioneCompleto): Valori {
  return {
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

type Props = {
  evento?: EventoGestioneCompleto
  /** Con il prezzo al cliente (obbligatorio): solo alla creazione, poi si cambia nei conti dell'evento */
  conPrezzo?: boolean
  onSalva: (dati: Omit<Inserimento<'eventi'>, 'project_id'>, prezzo: number | null) => Promise<unknown>
  testoPulsante: string
}

/** Modulo dell'evento, usato sia per creare sia per modificare. */
export function ModuloEvento({ evento, conPrezzo, onSalva, testoPulsante }: Props) {
  const [m, setM] = useState<Valori>(() => (evento ? daEvento(evento) : vuoto))
  const imposta = <K extends keyof Valori>(k: K, v: Valori[K]) => setM((p) => ({ ...p, [k]: v }))
  const testo = (k: keyof Valori) => ({ value: m[k] as string, onChange: (e: { target: { value: string } }) => imposta(k, e.target.value as never) })

  const tipi = useTipiBooth()
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<unknown>()

  const orari = useMemo(() => {
    if (!m.data) return null
    const [allestimento, inizio, fine, smontaggio] = costruisciOrari(m.data, [m.allestimento, m.inizio, m.fine, m.smontaggio], combinaDataOra)
    return { allestimento, inizio, fine, smontaggio }
  }, [m.data, m.allestimento, m.inizio, m.fine, m.smontaggio])

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (!orari) return
    if (!evento && new Date(orari.allestimento).getTime() < Date.now()) {
      setErrore(new Error("La data dell'allestimento è già passata: controlla giorno e orari."))
      return
    }
    const prezzo = conPrezzo ? leggiImporto(m.prezzo) : null
    if (conPrezzo && !prezzo) {
      setErrore(new Error('Scrivi il prezzo al cliente in euro, per esempio 1.200'))
      return
    }
    setInvio(true)
    setErrore(undefined)
    try {
      await onSalva({
        nome: m.nome.trim(),
        tipo_booth_id: m.tipoBoothId || null,
        indirizzo: m.indirizzo, citta: m.citta, regione: m.regione, note_accesso: m.noteAccesso || null,
        // "hostess" nel database = l'operatore fa anche da steward
        ztl: m.ztl, wifi: m.wifi, hostess: m.hostess,
        allestimento_il: orari.allestimento, inizio_attivazione: orari.inizio, fine_attivazione: orari.fine, smontaggio_il: orari.smontaggio,
        referente_nome: m.referenteNome || null, referente_telefono: m.referenteTelefono || null,
        outfit: m.hostess ? m.outfit.trim() || null : null, note: m.note || null,
      }, prezzo)
    } catch (err) {
      setErrore(err)
    } finally {
      setInvio(false)
    }
  }

  return (
    <form onSubmit={invia} className="flex flex-col gap-4 max-w-3xl">
      {errore != null && <Errore errore={errore} />}

      <Sezione titolo="Evento">
        <Campo etichetta="Nome dell'evento" required maxLength={120} placeholder="Matrimonio Rossi" {...testo('nome')} />
        <Selezione etichetta="Tipo di booth" required {...testo('tipoBoothId')} className="max-w-sm">
          <option value="">Scegli…</option>
          {[...new Set(tipi.data?.map((t) => t.linea))].map((linea) => (
            <optgroup key={linea} label={linea}>
              {tipi.data?.filter((t) => t.linea === linea).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </optgroup>
          ))}
        </Selezione>
        {conPrezzo && (
          <Campo etichetta="Prezzo al cliente (€)" required inputMode="decimal" placeholder="1.200" {...testo('prezzo')} className="max-w-60" />
        )}
      </Sezione>

      <Sezione titolo="Data e orari">
        <Campo etichetta="Data" type="date" required {...testo('data')} className="max-w-60" />
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
          <Campo etichetta="Allestimento" type="time" required {...testo('allestimento')} />
          <Campo etichetta="Inizio attivazione" type="time" required {...testo('inizio')} />
          <Campo etichetta="Fine attivazione" type="time" required {...testo('fine')} />
          <Campo etichetta="Smontaggio" type="time" required {...testo('smontaggio')} />
        </div>
      </Sezione>

      <Sezione titolo="Luogo">
        <Campo etichetta="Indirizzo" required placeholder="Via Gusciana, 27" {...testo('indirizzo')} />
        <Griglia>
          <Campo etichetta="Città" required {...testo('citta')} />
          <Selezione etichetta="Regione" required {...testo('regione')}>
            {REGIONI.map((r) => <option key={r}>{r}</option>)}
          </Selezione>
        </Griglia>
        <AreaTesto etichetta="Accesso e scarico" rows={2} placeholder="Scarico, scale, sosta del mezzo…" {...testo('noteAccesso')} />
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
          <SiNo etichetta="ZTL" valore={m.ztl} onChange={(v) => imposta('ztl', v)} />
          <SiNo etichetta="Wi‑Fi" valore={m.wifi} onChange={(v) => imposta('wifi', v)} />
        </div>
      </Sezione>

      <Sezione titolo="Operatore">
        <div className="max-w-sm"><SiNo etichetta="Fa anche da steward" valore={m.hostess} onChange={(v) => imposta('hostess', v)} /></div>
        {m.hostess && <Campo etichetta="Outfit" required placeholder="Total black con giacca" {...testo('outfit')} className="max-w-xl" />}
      </Sezione>

      <Sezione titolo="Referente e note">
        <Griglia>
          <Campo etichetta="Referente in loco" {...testo('referenteNome')} />
          <Campo etichetta="Telefono referente" type="tel" placeholder="+39…" {...testo('referenteTelefono')} />
        </Griglia>
        <AreaTesto etichetta="Note per l'operatore" rows={2} {...testo('note')} />
      </Sezione>

      <button type="submit" disabled={invio || !orari}
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
