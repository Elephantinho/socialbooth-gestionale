import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarCheck, Archive, Pencil, Phone, MessageCircle, TrendingUp, Wallet } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useEventiDiOperatore, useOperatore } from '@/modules/anagrafiche/api'
import { FotoProfilo } from '@/modules/anagrafiche/components/FotoProfilo'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { minutiInLocationPrevisti, minutiViaggioPagati } from '@/modules/eventi/logic/orari'
import { riepilogoEconomico } from '@/modules/costi/logic/riepilogo'
import { dataBreve, durata, euro, meseCorrente, nomeCompleto, perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Numero } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'
import { ModificaOperatore } from './Operatori'

type EventoOp = NonNullable<ReturnType<typeof useEventiDiOperatore>['data']>[number]

/** Numeri economici di un evento per questo operatore */
function conti(e: EventoOp, operatoreId: string, tariffa: number | null) {
  const ore = e.ore.find((o) => o.operatore_id === operatoreId && o.check_out_il && o.stato !== 'respinto')
  const r = riepilogoEconomico({
    costi: e.costi,
    minutiPrevisti: minutiInLocationPrevisti(e.allestimento_il, e.smontaggio_il) + minutiViaggioPagati(e.viaggio_minuti),
    tariffa,
    compensoFinale: ore?.compenso ?? null,
    ricavo: e.fattura_importo ?? e.prezzo_cliente ?? null,
  })
  return { compenso: ore?.compenso ?? null, minuti: ore?.minuti_totali ?? null, margine: r.margineFinale ?? r.marginePrevisto, definitivo: r.margineFinale != null }
}

export function DettaglioOperatore() {
  const { id = '' } = useParams()
  const admin = useProfilo().ruolo === 'admin'
  const op = useOperatore(id)
  const eventi = useEventiDiOperatore(id)
  const [modifica, setModifica] = useState(false)
  const [scheda, setScheda] = useState<'mese' | 'prossimi' | 'archivio'>('mese')

  if (op.isPending) return <Caricamento />
  if (op.error) return <Errore errore={op.error} />
  const o = op.data
  const nome = nomeCompleto(o)
  const numero = o.telefono?.replace(/[^\d+]/g, '')

  const mese = meseCorrente()
  const tutti = (eventi.data ?? []).map((e) => ({ e, ...conti(e, o.id, o.tariffa_oraria) }))
  const delMese = tutti.filter(({ e }) => perCampoData(e.allestimento_il).slice(0, 7) === mese)
  const prossimi = tutti.filter(({ e }) => new Date(e.smontaggio_il) >= new Date() && e.stato !== 'completato').reverse()
  const archivio = tutti.filter(({ e }) => e.stato === 'completato')

  const compensoTotale = tutti.reduce((s, x) => s + (x.compenso ?? 0), 0)
  const compensoMese = delMese.reduce((s, x) => s + (x.compenso ?? 0), 0)
  const margineTotale = archivio.reduce((s, x) => s + (x.definitivo ? x.margine ?? 0 : 0), 0)
  const elenco = scheda === 'mese' ? delMese : scheda === 'prossimi' ? prossimi : archivio

  return (
    <div className="flex flex-col gap-6">
      <Link to="/gestione/operatori" className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro w-fit">
        <ArrowLeft className="size-4" aria-hidden /> Operatori
      </Link>

      {/* Profilo */}
      <Card className="p-5 md:p-7 flex flex-wrap gap-6 items-center -mt-3">
        {admin ? (
          <FotoProfilo utenteId={o.id} nome={nome} foto={o.foto} onCaricata={() => op.refetch()} />
        ) : (
          <Avatar nome={nome} foto={o.foto} taglia="xl" />
        )}
        <div className="flex-[1_1_260px] min-w-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{nome}</h1>
            {!o.attivo && <span className="text-xs font-bold bg-avviso text-avviso-testo px-2.5 py-1 rounded-full">In attesa di approvazione</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {o.zone?.length ? o.zone.map((z) => (
              <span key={z.regione} className="text-xs font-bold bg-accento-tenue text-accento-scuro px-2.5 py-1 rounded-full">{z.regione}</span>
            )) : <span className="text-xs font-bold text-urgente-testo">Nessuna regione</span>}
          </div>
          <p className="text-sm text-tenue flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-semibold text-inchiostro"><Building2 className="size-4" aria-hidden />{o.magazzino ? `${o.magazzino.nome} · ${o.magazzino.citta}` : 'Nessun magazzino'}</span>
            <span>{o.tariffa_oraria != null ? `${euro(o.tariffa_oraria)}/ora` : 'Tariffa da impostare'}</span>
            {o.telefono && <span>{o.telefono}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {numero && (
            <>
              <a href={`tel:${numero}`} className="h-11 px-4 rounded-xl border border-bordo-forte font-bold text-sm inline-flex items-center gap-2 hover:bg-sfondo"><Phone className="size-4" aria-hidden />Chiama</a>
              <a href={`https://wa.me/${numero.replace('+', '')}`} target="_blank" rel="noreferrer" className="h-11 px-4 rounded-xl border border-bordo-forte font-bold text-sm inline-flex items-center gap-2 hover:bg-sfondo"><MessageCircle className="size-4" aria-hidden />WhatsApp</a>
            </>
          )}
          {admin && <Pulsante variante={modifica ? 'scuro' : 'primario'} icona={<Pencil className="size-4" aria-hidden />} onClick={() => setModifica((m) => !m)}>{modifica ? 'Chiudi' : 'Modifica'}</Pulsante>}
        </div>
      </Card>

      {modifica && <Card className="overflow-hidden"><ModificaOperatore o={o} onFatto={() => { setModifica(false); op.refetch() }} /></Card>}

      {/* Numeri */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <Numero valore={delMese.length} etichetta="eventi questo mese" icona={<CalendarCheck className="size-5" aria-hidden />} />
        <Numero valore={archivio.length} etichetta="eventi archiviati" icona={<Archive className="size-5" aria-hidden />} />
        <Numero valore={euro(compensoMese)} etichetta="compensi del mese" tono="accento" icona={<Wallet className="size-5" aria-hidden />} />
        <Numero valore={euro(compensoTotale)} etichetta="compensi totali" tono="scuro" icona={<Wallet className="size-5" aria-hidden />} />
        <Numero valore={euro(margineTotale)} etichetta="margine generato" tono={margineTotale < 0 ? 'urgente' : 'chiaro'} icona={<TrendingUp className="size-5" aria-hidden />} />
      </div>

      {/* Eventi */}
      <Card className="overflow-hidden">
        <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-bordo">
          <TitoloSezione>Eventi</TitoloSezione>
          <div className="flex rounded-xl bg-sfondo p-1" role="tablist">
            {([['mese', `Questo mese · ${delMese.length}`], ['prossimi', `Prossimi · ${prossimi.length}`], ['archivio', `Archivio · ${archivio.length}`]] as const).map(([k, t]) => (
              <button key={k} role="tab" aria-selected={scheda === k} onClick={() => setScheda(k)}
                className={cn('h-9 px-3.5 rounded-[9px] text-sm font-bold cursor-pointer whitespace-nowrap transition', scheda === k ? 'bg-inchiostro text-white' : 'text-tenue hover:text-inchiostro')}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {eventi.isPending ? <Caricamento /> : eventi.error ? <div className="p-5"><Errore errore={eventi.error} /></div> : !elenco.length ? (
          <Vuoto titolo="Nessun evento qui" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-tenue">
                  {['Data', 'Evento', 'Stato', 'Ore', 'Compenso', 'Margine'].map((h) => <th key={h} className="px-5 py-3 font-bold whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {elenco.map(({ e, compenso, minuti, margine, definitivo }) => (
                  <tr key={e.id} className="border-t border-bordo hover:bg-sfondo/60 transition">
                    <td className="px-5 py-3 whitespace-nowrap font-semibold">{dataBreve(e.allestimento_il)}</td>
                    <td className="px-5 py-3 min-w-48">
                      <Link to={`/gestione/eventi/${e.id}`} className="font-bold hover:underline">{e.tipo_booth?.nome ?? 'Evento'} · {e.citta}</Link>
                      {e.cliente?.nome && <p className="text-xs text-tenue">{e.cliente.nome}</p>}
                    </td>
                    <td className="px-5 py-3"><StatoEvento stato={e.stato} /></td>
                    <td className="px-5 py-3 whitespace-nowrap">{minuti != null ? durata(minuti) : '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap font-bold">{compenso != null ? euro(compenso) : '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {margine == null ? <span className="text-tenue text-xs font-semibold">ricavo mancante</span> : (
                        <span className={cn('font-bold', margine < 0 ? 'text-urgente-testo' : 'text-accento')}>
                          {euro(margine)}{!definitivo && <span className="text-xs font-semibold text-tenue"> prev.</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
