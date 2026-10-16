import { useMemo, useState } from 'react'
import { Check, Loader2, MapPin, RotateCcw } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useClienti, useCreaCliente, useLocation, useMagazzini, useSalvaLocation, useTipiBooth } from '@/modules/anagrafiche/api'
import { useViaggio, messaggioViaggio } from '@/modules/viaggio/useViaggio'
import { useDintorni } from '@/modules/luogo/api'
import { costruisciOrari, minutiInLocationPrevisti, orarioRitiro } from '../logic/orari'
import type { BriefLetto } from '../logic/brief'
import { IncollaBrief } from './IncollaBrief'
import type { EventoGestioneCompleto } from '../types'
import { combinaDataOra, durata, ora, perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { REGIONI, type Enum, type Inserimento } from '@/shared/types/database'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { AreaTesto, Campo, Selezione, SiNo } from '@/shared/ui/Campo'
import { Errore } from '@/shared/ui/Stati'

type Valori = {
  clienteId: string; nuovoCliente: string; tipoBoothId: string
  locationId: string; indirizzo: string; citta: string; regione: Enum<'regione'>; noteAccesso: string
  ztl: boolean; wifi: boolean; hostess: boolean; salvaLocation: boolean
  data: string; allestimento: string; inizio: string; fine: string; smontaggio: string
  referenteNome: string; referenteTelefono: string; outfit: string; note: string
  magazzinoId: string; viaggioMinuti: string; viaggioManuale: boolean
}

const vuoto: Valori = {
  clienteId: '', nuovoCliente: '', tipoBoothId: '',
  locationId: '', indirizzo: '', citta: '', regione: 'Toscana', noteAccesso: '',
  ztl: false, wifi: false, hostess: false, salvaLocation: true,
  data: '', allestimento: '18:30', inizio: '20:00', fine: '23:30', smontaggio: '23:45',
  referenteNome: '', referenteTelefono: '', outfit: '', note: '',
  magazzinoId: '', viaggioMinuti: '', viaggioManuale: false,
}

function daEvento(e: EventoGestioneCompleto): Valori {
  return {
    clienteId: e.cliente_id ?? '', nuovoCliente: '', tipoBoothId: e.tipo_booth_id ?? '',
    locationId: e.location_id ?? '', indirizzo: e.indirizzo, citta: e.citta, regione: e.regione, noteAccesso: e.note_accesso ?? '',
    ztl: e.ztl, wifi: e.wifi, hostess: e.hostess, salvaLocation: false,
    data: perCampoData(e.allestimento_il), allestimento: ora(e.allestimento_il), inizio: ora(e.inizio_attivazione),
    fine: ora(e.fine_attivazione), smontaggio: ora(e.smontaggio_il),
    referenteNome: e.referente_nome ?? '', referenteTelefono: e.referente_telefono ?? '', outfit: e.outfit ?? '', note: e.note ?? '',
    magazzinoId: e.magazzino_id ?? '', viaggioMinuti: e.viaggio_minuti ? String(e.viaggio_minuti) : '', viaggioManuale: false,
  }
}

type Props = {
  evento?: EventoGestioneCompleto
  /** Evento da copiare (duplica): stessi dati, data da scegliere */
  modello?: EventoGestioneCompleto
  /** Riceve i dati pronti per il database; restituisce una Promise */
  onSalva: (dati: Omit<Inserimento<'eventi'>, 'project_id'>) => Promise<unknown>
  testoPulsante: string
  idModulo?: string
}

/** Modulo dell'evento, usato sia per creare sia per modificare. */
export function ModuloEvento({ evento, modello, onSalva, testoPulsante, idModulo = 'modulo-evento' }: Props) {
  const profilo = useProfilo()
  const [m, setM] = useState<Valori>(() => (evento ? daEvento(evento) : modello ? { ...daEvento(modello), data: '' } : vuoto))
  const imposta = <K extends keyof Valori>(k: K, v: Valori[K]) => setM((p) => ({ ...p, [k]: v }))
  const testo = (k: keyof Valori) => ({ value: m[k] as string, onChange: (e: { target: { value: string } }) => imposta(k, e.target.value as never) })

  const tipi = useTipiBooth()
  const clienti = useClienti()
  const locations = useLocation()
  const magazzini = useMagazzini()
  const creaCliente = useCreaCliente()
  const salvaLocation = useSalvaLocation()
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<unknown>()

  // Magazzino: quello scelto, altrimenti il primo della regione dell'evento
  const magazzinoScelto = m.magazzinoId || (magazzini.data ?? []).find((g) => g.regione === m.regione)?.id || ''
  const magazzino = magazzini.data?.find((g) => g.id === magazzinoScelto)
  const puntoMagazzino = magazzino?.lat != null && magazzino?.lng != null ? { lat: magazzino.lat, lng: magazzino.lng } : null

  // Viaggio calcolato in automatico (si può sovrascrivere a mano)
  const viaggio = useViaggio(m.indirizzo, m.citta, puntoMagazzino)
  // Controllo automatico della ZTL sull'indirizzo trovato
  const ztlRilevata = useDintorni(viaggio.punto).data?.ztl
  const minutiViaggio = m.viaggioManuale ? Number(m.viaggioMinuti) || 0 : viaggio.minuti ?? (Number(m.viaggioMinuti) || 0)

  const calcolo = useMemo(() => {
    if (!m.data) return null
    const [allestimento, inizio, fine, smontaggio] = costruisciOrari(m.data, [m.allestimento, m.inizio, m.fine, m.smontaggio], combinaDataOra)
    return {
      allestimento, inizio, fine, smontaggio,
      ritiro: minutiViaggio ? orarioRitiro(allestimento, minutiViaggio) : null,
      minuti: minutiInLocationPrevisti(allestimento, smontaggio),
    }
  }, [m.data, m.allestimento, m.inizio, m.fine, m.smontaggio, minutiViaggio])

  function scegliLocation(id: string) {
    const l = locations.data?.find((x) => x.id === id)
    if (!l) return imposta('locationId', '')
    setM((p) => ({
      ...p, locationId: l.id, indirizzo: l.indirizzo, citta: l.citta, regione: l.regione,
      noteAccesso: l.note_accesso ?? '', ztl: !!l.ztl, wifi: !!l.wifi, salvaLocation: false,
    }))
  }

  /** Riempie il modulo con quello che è stato letto dal brief (senza cancellare il resto) */
  function daBrief(b: BriefLetto) {
    const salvata = b.indirizzo ? locations.data?.find((l) => l.indirizzo.toLowerCase() === b.indirizzo!.toLowerCase()) : undefined
    setM((p) => ({
      ...p,
      ...(b.tipoBoothId && { tipoBoothId: b.tipoBoothId }),
      ...(b.clienteId && { clienteId: b.clienteId }),
      ...(b.nuovoCliente && { clienteId: 'nuovo', nuovoCliente: b.nuovoCliente }),
      ...(b.data && { data: b.data }),
      ...(b.allestimento && { allestimento: b.allestimento }),
      ...(b.inizio && { inizio: b.inizio }),
      ...(b.fine && { fine: b.fine }),
      ...(b.smontaggio && { smontaggio: b.smontaggio }),
      ...(b.indirizzo && { indirizzo: b.indirizzo, locationId: '' }),
      ...(b.citta && { citta: b.citta }),
      ...(b.regione && { regione: b.regione }),
      ...(b.referenteNome && { referenteNome: b.referenteNome }),
      ...(b.referenteTelefono && { referenteTelefono: b.referenteTelefono }),
      ...(b.hostess != null && { hostess: b.hostess }),
      ...(b.wifi != null && { wifi: b.wifi }),
      ...(b.ztl != null && { ztl: b.ztl }),
      ...(b.outfit && { outfit: b.outfit }),
      ...(b.noteAccesso && { noteAccesso: b.noteAccesso }),
      ...(b.note && { note: [p.note, b.note].filter(Boolean).join('\n') }),
    }))
    if (salvata) scegliLocation(salvata.id)
  }

  async function invia(e: React.FormEvent) {
    e.preventDefault()
    if (!calcolo) return
    if (!evento && new Date(calcolo.allestimento).getTime() < Date.now()) {
      setErrore(new Error("La data dell'allestimento è già passata: controlla giorno e orari."))
      return
    }
    setInvio(true)
    setErrore(undefined)
    try {
      let clienteId: string | null = m.clienteId || null
      if (m.clienteId === 'nuovo') {
        clienteId = m.nuovoCliente.trim()
          ? (await creaCliente.mutateAsync({ nome: m.nuovoCliente.trim(), project_id: profilo.id })).id
          : null
      }
      let locationId = m.locationId || null
      if (!locationId && m.salvaLocation) {
        locationId = (await salvaLocation.mutateAsync({
          indirizzo: m.indirizzo, citta: m.citta, regione: m.regione, note_accesso: m.noteAccesso || null,
          ztl: m.ztl, wifi: m.wifi, lat: viaggio.punto?.lat ?? null, lng: viaggio.punto?.lng ?? null,
        })).id
      }
      await onSalva({
        cliente_id: clienteId, tipo_booth_id: m.tipoBoothId || null,
        location_id: locationId, indirizzo: m.indirizzo, citta: m.citta, regione: m.regione, note_accesso: m.noteAccesso || null,
        lat: viaggio.punto?.lat ?? evento?.lat ?? null, lng: viaggio.punto?.lng ?? evento?.lng ?? null,
        ztl: m.ztl, wifi: m.wifi, hostess: m.hostess,
        allestimento_il: calcolo.allestimento, inizio_attivazione: calcolo.inizio, fine_attivazione: calcolo.fine, smontaggio_il: calcolo.smontaggio,
        referente_nome: m.referenteNome || null, referente_telefono: m.referenteTelefono || null,
        outfit: m.outfit || null, note: m.note || null,
        magazzino_id: magazzinoScelto || null, viaggio_minuti: minutiViaggio || null, ritiro_magazzino_il: calcolo.ritiro,
      })
    } catch (err) {
      setErrore(err)
    } finally {
      setInvio(false)
    }
  }

  return (
    <form id={idModulo} onSubmit={invia} className="flex flex-col gap-6">
      {errore != null && <Errore errore={errore} />}

      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-4">
          {!evento && <IncollaBrief tipi={tipi.data ?? []} clienti={clienti.data ?? []} onCompila={daBrief} />}
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
                {[...new Set(tipi.data?.map((t) => t.linea))].map((linea) => (
                  <optgroup key={linea} label={linea}>
                    {tipi.data?.filter((t) => t.linea === linea).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </optgroup>
                ))}
              </Selezione>
            </Griglia>
          </Sezione>

          <Sezione titolo="Location" extra={m.locationId ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accento-scuro bg-accento-tenue px-2.5 py-1.5 rounded-xl">
              <Check className="size-3.5" aria-hidden /> Location salvata: dati compilati
            </span>
          ) : null}>
            {!!locations.data?.length && (
              <Selezione etichetta="Usa una location salvata" value={m.locationId} onChange={(e) => scegliLocation(e.target.value)}>
                <option value="">— Nuova location —</option>
                {locations.data.map((l) => <option key={l.id} value={l.id}>{l.nome ? `${l.nome}, ` : ''}{l.indirizzo}, {l.citta}</option>)}
              </Selezione>
            )}
            <Campo etichetta="Indirizzo" required placeholder="Via Gusciana, 27" {...testo('indirizzo')} />
            <Griglia>
              <Campo etichetta="Città" required {...testo('citta')} />
              <Selezione etichetta="Regione" required value={m.regione}
                onChange={(e) => setM((p) => ({ ...p, regione: e.target.value as Enum<'regione'>, magazzinoId: '' }))}>
                {REGIONI.map((r) => <option key={r}>{r}</option>)}
              </Selezione>
            </Griglia>
            <AreaTesto etichetta="Accessibilità e scarico" rows={3} placeholder="Scarico, scale, sosta del mezzo…" {...testo('noteAccesso')} />
            {ztlRilevata && ztlRilevata.stato !== 'non_rilevata' && !m.ztl && (
              <div className="rounded-xl bg-avviso p-3.5 flex flex-wrap items-center gap-3 text-sm text-avviso-testo">
                <span className="flex-1 min-w-48"><strong className="text-avviso-titolo">{ztlRilevata.stato === 'dentro' ? 'Questo indirizzo sembra dentro una ZTL' : 'C\'è una ZTL vicino'}</strong>{ztlRilevata.dettaglio && `, ${ztlRilevata.dettaglio}`}</span>
                <button type="button" onClick={() => imposta('ztl', true)} className="h-9 px-3 rounded-lg bg-accento text-white font-semibold cursor-pointer">Imposta ZTL: Sì</button>
              </div>
            )}
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
            <p className="text-xs text-tenue">Se un orario è dopo mezzanotte (es. smontaggio 00:30) viene considerato il giorno dopo.</p>
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
            <TitoloSezione>Logistica</TitoloSezione>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-su-scuro-tenue">
              Magazzino di partenza
              <select value={magazzinoScelto} onChange={(e) => imposta('magazzinoId', e.target.value)}
                className="h-11 rounded-lg bg-superficie border border-bordo-forte px-3 text-inchiostro text-[15px] focus:outline-none focus:border-accento-chiaro">
                <option value="">— Nessuno —</option>
                {(magazzini.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.nome}, {g.citta}</option>)}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-su-scuro-tenue">Viaggio dal magazzino (minuti)</span>
              <div className="flex gap-2">
                <input type="number" min={0} inputMode="numeric" aria-label="Minuti di viaggio"
                  value={m.viaggioManuale ? m.viaggioMinuti : String(minutiViaggio || '')}
                  onChange={(e) => setM((p) => ({ ...p, viaggioMinuti: e.target.value, viaggioManuale: true }))}
                  className="h-11 flex-1 min-w-0 rounded-lg bg-superficie border border-bordo-forte px-3 text-inchiostro text-[15px] focus:outline-none focus:border-accento-chiaro" />
                {m.viaggioManuale && (
                  <button type="button" onClick={() => imposta('viaggioManuale', false)} aria-label="Torna al calcolo automatico"
                    className="h-11 px-3 rounded-lg bg-scuro-3 text-accento-scuro cursor-pointer">
                    <RotateCcw className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              <p className={cn('text-xs font-semibold flex items-center gap-1.5',
                viaggio.stato === 'fatto' && !m.viaggioManuale ? 'text-accento' : 'text-su-scuro-tenue')}>
                {viaggio.stato === 'calcolo' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
                {m.viaggioManuale ? 'Inserito a mano' : messaggioViaggio[viaggio.stato]}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Riquadro etichetta="Ritiro suggerito" valore={calcolo?.ritiro ? ora(calcolo.ritiro) : '—'} />
              <Riquadro etichetta="Ore in location" valore={calcolo ? durata(calcolo.minuti) : '—'} />
            </div>
            <p className="text-xs text-su-scuro-tenue leading-relaxed">
              Il ritiro lascia 20 minuti di margine prima dell'allestimento. Il viaggio (andata e ritorno) viene pagato all'operatore.
            </p>
          </Card>

          {(!m.wifi || m.ztl || m.noteAccesso) && (
            <Card tono="avviso" className="p-4 flex flex-col gap-2">
              <TitoloSezione className="text-[15px] text-avviso-titolo">Avvisi per l'operatore</TitoloSezione>
              {!m.wifi && <p className="text-sm">· Nessun Wi‑Fi: "hotspot" aggiunto alla sua checklist</p>}
              {m.ztl && <p className="text-sm">· ZTL: gli ricordiamo di verificare il permesso</p>}
              {m.noteAccesso && <p className="text-sm">· Note di accesso evidenziate nella scheda</p>}
            </Card>
          )}

          <button type="submit" disabled={invio || !calcolo}
            className="h-14 rounded-xl bg-accento text-white font-semibold text-[17px] flex items-center justify-center gap-2 cursor-pointer hover:bg-accento-scuro disabled:opacity-50 transition">
            {invio && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {testoPulsante}
          </button>
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
    <div className="bg-superficie border border-evidenza-bordo rounded-lg p-3">
      <p className="text-xs font-semibold text-su-scuro-tenue">{etichetta}</p>
      <p className="text-xl font-semibold mt-0.5">{valore}</p>
    </div>
  )
}
