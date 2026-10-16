import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarCheck, CircleDollarSign, Hourglass, ListChecks, TrendingUp, UserX } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useEventiGestione, useReportOre } from '@/modules/eventi/api'
import { useMagazzini, useOperatori } from '@/modules/anagrafiche/api'
import { useEconomiaPeriodo } from '@/modules/costi/api'
import { contiEvento, contiPer, totaleConti } from '@/modules/costi/logic/perRegione'
import { GraficoAndamento } from '@/modules/costi/components/GraficoAndamento'
import { TabellaRegioni } from '@/modules/costi/components/TabellaRegioni'
import { useAttivita } from '@/modules/attivita/api'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { dataBreve, euro, meseCorrente, nomeCompleto, ora, perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Intestazione, Numero } from '@/shared/ui/Intestazione'
import { Mappa, type Segnaposto } from '@/shared/ui/Mappa'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const coloriMappa: Record<string, { colore: string; etichetta: string }> = {
  da_assegnare: { colore: '#D9480F', etichetta: 'Da assegnare' },
  proposto: { colore: '#E8A33D', etichetta: 'In attesa' },
  confermato: { colore: '#00897B', etichetta: 'Confermato' },
  in_corso: { colore: '#15161A', etichetta: 'In corso' },
  magazzino: { colore: '#5A5FC4', etichetta: 'Magazzino' },
}

export function Panoramica() {
  const profilo = useProfilo()
  const naviga = useNavigate()
  const eventi = useEventiGestione()
  const operatori = useOperatori()
  const magazzini = useMagazzini()
  const ore = useReportOre(meseCorrente())
  const economia = useEconomiaPeriodo(6)
  const attivita = useAttivita()
  const [vistaMappa, setVistaMappa] = useState<'prossimi' | 'tutti'>('prossimi')

  const mese = meseCorrente()
  const tutti = useMemo(() => (eventi.data ?? []).filter((e) => e.stato !== 'annullato'), [eventi.data])
  const futuri = useMemo(() => tutti.filter((e) => new Date(e.smontaggio_il) >= new Date()), [tutti])
  const daAssegnare = futuri.filter((e) => e.stato === 'da_assegnare')
  const inAttesa = futuri.filter((e) => e.stato === 'proposto')
  const prossimi7 = futuri.filter((e) => new Date(e.allestimento_il).getTime() - Date.now() < 7 * 86_400_000).slice(0, 8)
  const oreDaApprovare = (ore.data ?? []).filter((r) => r.stato === 'inviato').length
  const attivitaAperte = (attivita.data ?? []).filter((a) => a.stato !== 'fatto')
  const attivitaScadute = attivitaAperte.filter((a) => a.scadenza && a.scadenza < perCampoData(new Date().toISOString()))

  // Economia: mese corrente e ultimi 6 mesi
  const ev6 = useMemo(() => economia.data ?? [], [economia.data])
  const delMese = ev6.filter((e) => perCampoData(e.allestimento_il).slice(0, 7) === mese)
  const contiMese = totaleConti(delMese.map(contiEvento))
  const andamento = useMemo(() => {
    const perMese = contiPer(ev6, (e) => perCampoData(e.allestimento_il).slice(0, 7))
    const oggi = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - 5 + i, 1)
      const k = d.toLocaleDateString('sv-SE').slice(0, 7)
      const c = perMese.get(k)
      return {
        mese: d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''),
        ricavi: Math.round(c?.ricavi ?? 0), costi: Math.round(c?.costiTotali ?? 0), margine: Math.round(c?.margine ?? 0),
      }
    })
  }, [ev6])

  // Classifiche del mese
  const perOperatore = [...contiPer(delMese.filter((e) => e.operatore), (e) => e.operatore!.id).entries()]
    .map(([id, c]) => ({ op: delMese.find((e) => e.operatore?.id === id)!.operatore!, ...c }))
    .sort((a, b) => b.eventi - a.eventi || b.margine - a.margine).slice(0, 5)
  const perCliente = [...contiPer(delMese.filter((e) => e.cliente), (e) => e.cliente!.id).entries()]
    .map(([id, c]) => ({ nome: delMese.find((e) => e.cliente?.id === id)!.cliente!.nome, ...c }))
    .sort((a, b) => b.ricavi - a.ricavi).slice(0, 5)

  // Zone senza operatori attivi
  const regioniCoperte = new Set((operatori.data ?? []).filter((o) => o.attivo).flatMap((o) => o.zone.map((z) => z.regione as string)))
  const scoperte = [...new Set(futuri.map((e) => e.regione))].filter((r) => !regioniCoperte.has(r))

  // Mappa: eventi + magazzini
  const segnaposti = useMemo<Segnaposto[]>(() => {
    const lista = vistaMappa === 'prossimi' ? futuri : tutti
    const s: Segnaposto[] = lista.filter((e) => e.lat != null && e.lng != null && coloriMappa[e.stato]).map((e) => ({
      id: e.id, lat: e.lat!, lng: e.lng!, colore: coloriMappa[e.stato].colore, raggio: 8,
      etichetta: `${dataBreve(e.allestimento_il)} · ${e.tipo_booth?.nome ?? 'Evento'} · ${e.citta}`,
      onClick: () => naviga(`/gestione/eventi/${e.id}`),
    }))
    for (const m of magazzini.data ?? []) {
      if (m.lat != null && m.lng != null) s.push({ id: `m${m.id}`, lat: m.lat, lng: m.lng, colore: coloriMappa.magazzino.colore, raggio: 6, etichetta: m.nome })
    }
    return s
  }, [futuri, tutti, magazzini.data, vistaMappa, naviga])

  if (eventi.isPending) return <Caricamento />
  if (eventi.error) return <Errore errore={eventi.error} />

  return (
    <div className="flex flex-col gap-6">
      <Intestazione
        sopra={new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase())}
        titolo={`Ciao, ${profilo.nome || 'benvenuto'}`}
        descrizione="Cosa assegnare, cosa approvare, dove state lavorando e come vanno i conti."
      />

      {/* Da fare subito */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <Link to="/gestione" className="hover:opacity-90"><Numero valore={daAssegnare.length} etichetta="eventi da assegnare" tono={daAssegnare.length ? 'urgente' : 'chiaro'} icona={<UserX className="size-5" aria-hidden />} /></Link>
        <Numero valore={inAttesa.length} etichetta="in attesa di risposta" icona={<Hourglass className="size-5" aria-hidden />} />
        <Link to="/gestione/report" className="hover:opacity-90"><Numero valore={oreDaApprovare} etichetta="chiusure da approvare" tono={oreDaApprovare ? 'urgente' : 'chiaro'} icona={<CalendarCheck className="size-5" aria-hidden />} /></Link>
        <Link to="/gestione/attivita" className="hover:opacity-90"><Numero valore={attivitaAperte.length} etichetta={attivitaScadute.length ? `attività aperte · ${attivitaScadute.length} scadute` : 'attività aperte'} tono={attivitaScadute.length ? 'urgente' : 'chiaro'} icona={<ListChecks className="size-5" aria-hidden />} /></Link>
      </div>

      <Adesso eventi={tutti} />

      {scoperte.length > 0 && (
        <Card tono="avviso" className="p-4 flex gap-3">
          <AlertTriangle className="size-5 text-avviso-titolo shrink-0" aria-hidden />
          <p className="text-sm"><strong className="text-avviso-titolo">Zone scoperte:</strong> ci sono eventi in {scoperte.join(', ')} ma nessun operatore attivo. <Link to="/gestione/operatori" className="font-bold underline">Vai agli operatori</Link></p>
        </Card>
      )}

      {/* Mappa */}
      <Card className="overflow-hidden">
        <div className="p-4 md:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-bordo">
          <TitoloSezione>Dove lavorate</TitoloSezione>
          <div className="flex rounded-xl bg-sfondo p-1" role="tablist">
            {([['prossimi', 'In programma'], ['tutti', 'Tutti']] as const).map(([k, t]) => (
              <button key={k} role="tab" aria-selected={vistaMappa === k} onClick={() => setVistaMappa(k)}
                className={cn('h-8 px-3 rounded-[9px] text-xs font-bold cursor-pointer', vistaMappa === k ? 'bg-inchiostro text-white' : 'text-tenue')}>{t}</button>
            ))}
          </div>
        </div>
        <Mappa punti={segnaposti} altezza={360} zoomMax={12} />
        <div className="px-4 md:px-5 py-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-bordo">
          {Object.values(coloriMappa).map((c) => (
            <span key={c.etichetta} className="inline-flex items-center gap-1.5 text-xs font-semibold text-tenue">
              <span className="size-2.5 rounded-full" style={{ background: c.colore }} aria-hidden />{c.etichetta}
            </span>
          ))}
          <span className="text-xs text-tenue ml-auto">Clicca su un evento per aprirlo</span>
        </div>
      </Card>

      {/* Conti */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <Numero valore={contiMese.eventi} etichetta="eventi questo mese" icona={<CalendarCheck className="size-5" aria-hidden />} />
        <Numero valore={euro(Math.round(contiMese.ricavi))} etichetta="ricavi del mese" tono="accento" icona={<CircleDollarSign className="size-5" aria-hidden />} />
        <Numero valore={euro(Math.round(contiMese.costiTotali))} etichetta="costi del mese" icona={<CircleDollarSign className="size-5" aria-hidden />} />
        <Numero valore={euro(Math.round(contiMese.margine))} etichetta="margine del mese" tono={contiMese.margine < 0 ? 'urgente' : 'scuro'} icona={<TrendingUp className="size-5" aria-hidden />} />
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <Card className="flex-[2_1_480px] min-w-0 p-5 flex flex-col gap-3">
          <div>
            <TitoloSezione>Ricavi e costi, ultimi 6 mesi</TitoloSezione>
            <p className="text-sm text-tenue">Eventi chiusi con i valori finali, gli altri con quelli previsti.</p>
          </div>
          {economia.isPending ? <Caricamento className="py-10" /> : <GraficoAndamento dati={andamento} />}
        </Card>

        <Card className="flex-[1_1_300px] min-w-0 p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <TitoloSezione>Prossimi 7 giorni</TitoloSezione>
            <Link to="/gestione/calendario" className="text-sm font-bold text-accento inline-flex items-center gap-1">Calendario <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          {prossimi7.length === 0 ? <p className="text-sm text-tenue py-4">Nessun evento nei prossimi 7 giorni.</p> : prossimi7.map((e) => (
            <Link key={e.id} to={`/gestione/eventi/${e.id}`} className="flex items-center gap-3 py-2 border-b border-bordo last:border-0 hover:opacity-80">
              <div className="w-16 shrink-0">
                <p className="font-bold text-sm">{dataBreve(e.allestimento_il).split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-xs text-tenue">{ora(e.allestimento_il)}</p>
              </div>
              <p className="flex-1 min-w-0 text-sm font-semibold truncate">{e.tipo_booth?.nome ?? 'Evento'} · {e.citta}</p>
              <StatoEvento stato={e.stato} className="text-[11px] px-2 py-1" />
            </Link>
          ))}
        </Card>
      </div>

      <TabellaRegioni mese={mese} />

      {/* Classifiche */}
      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        <Card className="p-5 flex flex-col gap-3">
          <TitoloSezione>Operatori del mese</TitoloSezione>
          {perOperatore.length === 0 ? <p className="text-sm text-tenue">Nessun evento assegnato questo mese.</p> : perOperatore.map((r, i) => (
            <Link key={r.op.id} to={`/gestione/operatori/${r.op.id}`} className="flex items-center gap-3 hover:opacity-80">
              <span className="w-5 text-sm font-bold text-tenue">{i + 1}</span>
              <Avatar nome={nomeCompleto(r.op)} foto={r.op.foto} taglia="sm" />
              <span className="flex-1 min-w-0 font-semibold truncate">{nomeCompleto(r.op)}</span>
              <span className="text-sm text-tenue">{r.eventi} eventi</span>
              <span className={cn('text-sm font-bold w-24 text-right', r.margine < 0 ? 'text-urgente-testo' : 'text-accento')}>{euro(Math.round(r.margine))}</span>
            </Link>
          ))}
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <TitoloSezione>Clienti del mese</TitoloSezione>
          {perCliente.length === 0 ? <p className="text-sm text-tenue">Nessun cliente indicato negli eventi di questo mese.</p> : perCliente.map((r, i) => (
            <div key={r.nome} className="flex items-center gap-3">
              <span className="w-5 text-sm font-bold text-tenue">{i + 1}</span>
              <span className="flex-1 min-w-0 font-semibold truncate">{r.nome}</span>
              <span className="text-sm text-tenue">{r.eventi} eventi</span>
              <span className="text-sm font-bold w-24 text-right">{euro(Math.round(r.ricavi))}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

type EventoLista = NonNullable<ReturnType<typeof useEventiGestione>['data']>[number]

/** Chi sta lavorando adesso e a che punto è (dalle tappe registrate) */
function Adesso({ eventi }: { eventi: EventoLista[] }) {
  const oggi = perCampoData(new Date().toISOString())
  const lista = eventi
    .filter((e) => e.stato === 'in_corso' || (e.stato === 'confermato' && perCampoData(e.allestimento_il) === oggi))
    .sort((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))
  const fase = (e: EventoLista) => {
    const t = e.ore?.[0]
    if (t?.rientro_il) return { testo: 'Rientrato', stile: 'bg-sfondo text-tenue' }
    if (t?.fine_il) return { testo: `Finito alle ${ora(t.fine_il)}, in rientro`, stile: 'bg-accento-tenue text-accento-scuro' }
    if (t?.check_in_il) return { testo: `In location dalle ${ora(t.check_in_il)}`, stile: 'bg-inchiostro text-white' }
    if (t?.partenza_il) return { testo: `In viaggio dalle ${ora(t.partenza_il)}`, stile: 'bg-avviso text-avviso-testo' }
    return { testo: `Parte alle ${ora(e.ritiro_magazzino_il ?? e.allestimento_il)}`, stile: 'bg-sfondo text-tenue' }
  }
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5" aria-hidden>
          {lista.length > 0 && <span className="absolute inline-flex size-full rounded-full bg-accento opacity-60 animate-ping" />}
          <span className="relative inline-flex size-2.5 rounded-full bg-accento" />
        </span>
        <TitoloSezione>In questo momento</TitoloSezione>
        <span className="text-sm text-tenue font-semibold">{lista.length ? `${lista.length} ${lista.length === 1 ? 'evento' : 'eventi'} oggi` : ''}</span>
      </div>
      {lista.length === 0 ? <p className="text-sm text-tenue">Nessun operatore al lavoro oggi.</p> : (
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {lista.map((e) => {
            const f = fase(e)
            return (
              <Link key={e.id} to={`/gestione/eventi/${e.id}`} className="rounded-2xl border border-bordo p-3 flex items-center gap-3 hover:border-bordo-forte transition">
                {e.operatore ? <Avatar nome={nomeCompleto(e.operatore)} foto={e.operatore.foto} /> : <span className="size-11 rounded-full bg-sfondo" />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{e.operatore ? nomeCompleto(e.operatore) : 'Nessun operatore'}</p>
                  <p className="text-xs text-tenue truncate">{e.tipo_booth?.nome ?? 'Evento'} · {e.citta}</p>
                </div>
                <span className={cn('text-[11px] font-bold px-2 py-1 rounded-lg text-right', f.stile)}>{f.testo}</span>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
