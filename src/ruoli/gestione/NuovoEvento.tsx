import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useClienti, useCreaCliente, useLocation, useMagazzini, useSalvaLocation, useTipiBooth } from '@/modules/anagrafiche/api'
import { useCreaEvento } from '@/modules/eventi/api'
import { costruisciOrari, minutiInLocationPrevisti, orarioRitiro } from '@/modules/eventi/logic/orari'
import { AssegnaOperatore } from '@/modules/assegnazione/AssegnaOperatore'
import { combinaDataOra, durata, ora } from '@/shared/lib/formato'
import { REGIONI, type Enum } from '@/shared/types/database'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { AreaTesto, Campo, Selezione, SiNo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'

type Modulo = {
  clienteId: string; nuovoCliente: string; tipoBoothId: string
  locationId: string; indirizzo: string; citta: string; regione: Enum<'regione'>; noteAccesso: string
  ztl: boolean; wifi: boolean; hostess: boolean; salvaLocation: boolean
  data: string; allestimento: string; inizio: string; fine: string; smontaggio: string
  referenteNome: string; referenteTelefono: string; outfit: string; note: string
  magazzinoId: string; viaggioMinuti: string
}

const vuoto: Modulo = {
  clienteId: '', nuovoCliente: '', tipoBoothId: '',
  locationId: '', indirizzo: '', citta: '', regione: 'Toscana', noteAccesso: '',
  ztl: false, wifi: false, hostess: false, salvaLocation: true,
  data: '', allestimento: '18:30', inizio: '20:00', fine: '23:30', smontaggio: '23:45',
  referenteNome: '', referenteTelefono: '', outfit: '', note: '',
  magazzinoId: '', viaggioMinuti: '',
}

export function NuovoEvento() {
  const profilo = useProfilo()
  const naviga = useNavigate()
  const [m, setM] = useState<Modulo>(vuoto)
  const imposta = <K extends keyof Modulo>(k: K, v: Modulo[K]) => setM((p) => ({ ...p, [k]: v }))
  const testo = (k: keyof Modulo) => ({ value: m[k] as string, onChange: (e: { target: { value: string } }) => imposta(k, e.target.value as never) })

  const tipi = useTipiBooth()
  const clienti = useClienti()
  const locations = useLocation()
  const magazzini = useMagazzini()
  const creaCliente = useCreaCliente()
  const salvaLocation = useSalvaLocation()
  const creaEvento = useCreaEvento()
  const [creato, setCreato] = useState<{ id: string; automatico: boolean }>()

  const magazziniRegione = (magazzini.data ?? []).filter((g) => g.regione === m.regione)
  const magazzinoScelto = m.magazzinoId || magazziniRegione[0]?.id || ''

  // Orari calcolati, aggiornati a ogni modifica
  const calcolo = useMemo(() => {
    if (!m.data) return null
    const [allestimento, inizio, fine, smontaggio] = costruisciOrari(m.data, [m.allestimento, m.inizio, m.fine, m.smontaggio], combinaDataOra)
    const viaggio = Number(m.viaggioMinuti) || 0
    return {
      allestimento, inizio, fine, smontaggio,
      ritiro: viaggio ? orarioRitiro(allestimento, viaggio) : null,
      minuti: minutiInLocationPrevisti(allestimento, smontaggio),
    }
  }, [m.data, m.allestimento, m.inizio, m.fine, m.smontaggio, m.viaggioMinuti])

  function scegliLocation(id: string) {
    const l = locations.data?.find((x) => x.id === id)
    if (!l) return imposta('locationId', '')
    setM((p) => ({
      ...p, locationId: l.id, indirizzo: l.indirizzo, citta: l.citta, regione: l.regione,
      noteAccesso: l.note_accesso ?? '', ztl: !!l.ztl, wifi: !!l.wifi, salvaLocation: false,
    }))
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (!calcolo) return
    let clienteId = m.clienteId || null
    if (m.clienteId === 'nuovo' && m.nuovoCliente.trim()) {
      clienteId = (await creaCliente.mutateAsync({ nome: m.nuovoCliente.trim(), project_id: profilo.id })).id
    }
    let locationId = m.locationId || null
    if (!locationId && m.salvaLocation) {
      locationId = (await salvaLocation.mutateAsync({
        indirizzo: m.indirizzo, citta: m.citta, regione: m.regione, note_accesso: m.noteAccesso || null, ztl: m.ztl, wifi: m.wifi,
      })).id
    }
    const viaggio = Number(m.viaggioMinuti) || null
    const risultato = await creaEvento.mutateAsync({
      project_id: profilo.id, cliente_id: clienteId === 'nuovo' ? null : clienteId, tipo_booth_id: m.tipoBoothId || null,
      location_id: locationId, indirizzo: m.indirizzo, citta: m.citta, regione: m.regione, note_accesso: m.noteAccesso || null,
      ztl: m.ztl, wifi: m.wifi, hostess: m.hostess,
      allestimento_il: calcolo.allestimento, inizio_attivazione: calcolo.inizio, fine_attivazione: calcolo.fine, smontaggio_il: calcolo.smontaggio,
      referente_nome: m.referenteNome || null, referente_telefono: m.referenteTelefono || null,
      outfit: m.outfit || null, note: m.note || null,
      magazzino_id: magazzinoScelto || null, viaggio_minuti: viaggio, ritiro_magazzino_il: calcolo.ritiro,
      stato: 'da_assegnare',
    })
    setCreato({ id: risultato.id, automatico: !!risultato.operatore_id })
  }

  const inInvio = creaEvento.isPending || creaCliente.isPending || salvaLocation.isPending
  const erroreInvio = creaEvento.error ?? creaCliente.error ?? salvaLocation.error

  if (creato) return <EventoCreato {...creato} onAltro={() => { setCreato(undefined); setM(vuoto) }} onFine={() => naviga('/gestione')} />

  return (
    <form onSubmit={invia} className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <Link to="/gestione" className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro">
            <ArrowLeft className="size-4" aria-hidden /> Eventi
          </Link>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Nuovo evento</h1>
        </div>
        <Pulsante type="submit" taglia="lg" caricamento={inInvio} disabled={!calcolo}>Crea e assegna</Pulsante>
      </div>

      {erroreInvio && <Errore errore={erroreInvio} />}

      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-4">
          <Sezione titolo="Cliente e servizio">
            <Griglia>
              <Selezione etichetta="Azienda cliente" {...testo('clienteId')}>
                <option value="">— Nessuno —</option>
                {clienti.data?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                <option value="nuovo">+ Nuovo cliente…</option>
              </Selezione>
              {m.clienteId === 'nuovo' && <Campo etichetta="Nome nuovo cliente" required {...testo('nuovoCliente')} />}
              <Selezione etichetta="Tipo di booth" required {...testo('tipoBoothId')}>
                <option value="">Scegli…</option>
                {tipi.data?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Selezione>
            </Griglia>
          </Sezione>

          <Sezione titolo="Location" extra={m.locationId ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accento-scuro bg-accento-tenue px-2.5 py-1.5 rounded-[10px]">
              <Check className="size-3.5" aria-hidden /> Location salvata: dati compilati
            </span>
          ) : null}>
            {!!locations.data?.length && (
              <Selezione etichetta="Usa una location salvata" value={m.locationId} onChange={(e) => scegliLocation(e.target.value)}>
                <option value="">— Nuova location —</option>
                {locations.data.map((l) => <option key={l.id} value={l.id}>{l.nome ? `${l.nome} · ` : ''}{l.indirizzo}, {l.citta}</option>)}
              </Selezione>
            )}
            <Campo etichetta="Indirizzo" required placeholder="Via Gusciana, 27" {...testo('indirizzo')} />
            <Griglia>
              <Campo etichetta="Città" required {...testo('citta')} />
              <Selezione etichetta="Regione" required value={m.regione} onChange={(e) => setM((p) => ({ ...p, regione: e.target.value as Enum<'regione'>, magazzinoId: '' }))}>
                {REGIONI.map((r) => <option key={r}>{r}</option>)}
              </Selezione>
            </Griglia>
            <AreaTesto etichetta="Accessibilità e scarico" rows={3} placeholder="Scarico, scale, sosta del mezzo…" {...testo('noteAccesso')} />
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
              <SiNo etichetta="ZTL" valore={m.ztl} onChange={(v) => imposta('ztl', v)} />
              <SiNo etichetta="Wi‑Fi" valore={m.wifi} onChange={(v) => imposta('wifi', v)} />
              <SiNo etichetta="Hostess / steward" valore={m.hostess} onChange={(v) => imposta('hostess', v)} />
            </div>
            {!m.locationId && (
              <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                <input type="checkbox" className="size-5 accent-accento" checked={m.salvaLocation} onChange={(e) => imposta('salvaLocation', e.target.checked)} />
                Salva questa location per i prossimi eventi
              </label>
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

          <Sezione titolo="Referente e dress code">
            <Griglia>
              <Campo etichetta="Referente in loco" {...testo('referenteNome')} />
              <Campo etichetta="Telefono referente" type="tel" placeholder="+39…" {...testo('referenteTelefono')} />
            </Griglia>
            <Campo etichetta="Outfit" placeholder="Total black con giacca" {...testo('outfit')} />
            <AreaTesto etichetta="Note per l'operatore" rows={2} {...testo('note')} />
          </Sezione>
        </div>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-4 lg:sticky lg:top-8">
          <Card tono="scuro" className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <TitoloSezione>Logistica</TitoloSezione>
              <span className="text-xs font-bold text-inchiostro bg-accento-chiaro px-2.5 py-1 rounded-[10px]">Automatica</span>
            </div>
            <p className="text-sm text-[#C9CAD1] leading-relaxed">
              Se in <strong className="text-white">{m.regione}</strong> c'è un solo operatore libero, l'evento gli viene proposto subito.
              Altrimenti scegli tu dopo la creazione.
            </p>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold text-su-scuro-tenue">
              Magazzino di partenza
              <select value={magazzinoScelto} onChange={(e) => imposta('magazzinoId', e.target.value)}
                className="h-11 rounded-xl bg-scuro-2 border border-scuro-3 px-3 text-white text-[15px] focus:outline-none focus:border-accento-chiaro">
                <option value="">— Nessuno —</option>
                {(magazzini.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold text-su-scuro-tenue">
              Viaggio dal magazzino (minuti)
              <input type="number" min={0} inputMode="numeric" {...testo('viaggioMinuti')}
                className="h-11 rounded-xl bg-scuro-2 border border-scuro-3 px-3 text-white text-[15px] focus:outline-none focus:border-accento-chiaro" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Riquadro etichetta="Ritiro suggerito" valore={calcolo?.ritiro ? ora(calcolo.ritiro) : '—'} />
              <Riquadro etichetta="Ore in location" valore={calcolo ? durata(calcolo.minuti) : '—'} />
            </div>
          </Card>

          {(!m.wifi || m.ztl || m.noteAccesso) && (
            <Card tono="avviso" className="p-4 flex flex-col gap-2">
              <TitoloSezione className="text-[15px] text-avviso-titolo">Avvisi per l'operatore</TitoloSezione>
              {!m.wifi && <p className="text-sm">· Nessun Wi‑Fi: "hotspot" aggiunto alla sua checklist</p>}
              {m.ztl && <p className="text-sm">· ZTL: gli ricordiamo di verificare il permesso</p>}
              {m.noteAccesso && <p className="text-sm">· Note di accesso evidenziate nella scheda</p>}
            </Card>
          )}
        </aside>
      </div>
    </form>
  )
}

function Sezione({ titolo, extra, children }: { titolo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5 md:p-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TitoloSezione>{titolo}</TitoloSezione>
        {extra}
      </div>
      {children}
    </Card>
  )
}

const Griglia = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">{children}</div>
)

function Riquadro({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="bg-scuro-2 rounded-[14px] p-3">
      <p className="text-xs font-semibold text-su-scuro-tenue">{etichetta}</p>
      <p className="text-xl font-bold mt-0.5">{valore}</p>
    </div>
  )
}

function EventoCreato({ id, automatico, onAltro, onFine }: { id: string; automatico: boolean; onAltro: () => void; onFine: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto flex flex-col gap-5 py-6">
      <div className="size-14 rounded-2xl bg-accento text-white flex items-center justify-center">
        {automatico ? <Sparkles className="size-7" aria-hidden /> : <Check className="size-7" aria-hidden />}
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Evento creato</h1>
        <p className="text-tenue mt-2">
          {automatico
            ? "C'era un solo operatore libero in zona: l'evento gli è stato proposto in automatico. Riceverà la richiesta da accettare."
            : 'Scegli a quale operatore proporlo.'}
        </p>
      </div>
      {!automatico && <AssegnaOperatore eventoId={id} onFatto={onFine} />}
      <div className="flex gap-2 flex-wrap">
        <Pulsante variante="secondario" onClick={onAltro}>Crea un altro evento</Pulsante>
        <Pulsante variante="scuro" onClick={onFine}>Torna agli eventi</Pulsante>
      </div>
    </motion.div>
  )
}
