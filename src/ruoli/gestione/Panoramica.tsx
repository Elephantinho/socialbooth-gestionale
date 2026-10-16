import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useEventiGestione, useReportOre } from '@/modules/eventi/api'
import { useOperatori } from '@/modules/anagrafiche/api'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { dataBreve, euro, meseCorrente, ora, perCampoData } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'

export function Panoramica() {
  const eventi = useEventiGestione()
  const operatori = useOperatori()
  const ore = useReportOre(meseCorrente())

  if (eventi.isPending) return <Caricamento />
  if (eventi.error) return <Errore errore={eventi.error} />

  const tutti = eventi.data.filter((e) => e.stato !== 'annullato')
  const mese = meseCorrente()
  const delMese = tutti.filter((e) => perCampoData(e.allestimento_il).slice(0, 7) === mese)
  const futuri = tutti.filter((e) => new Date(e.smontaggio_il) >= new Date())
  const daAssegnare = futuri.filter((e) => e.stato === 'da_assegnare')
  const inAttesa = futuri.filter((e) => e.stato === 'proposto')
  const prossimi7 = futuri.filter((e) => new Date(e.allestimento_il).getTime() - Date.now() < 7 * 86_400_000).slice(0, 8)
  const oreDaApprovare = (ore.data ?? []).filter((r) => r.stato === 'inviato').length
  const compensiMese = (ore.data ?? []).filter((r) => r.stato !== 'respinto').reduce((s, r) => s + (r.compenso ?? 0), 0)

  // Eventi per regione e regioni senza operatori attivi
  const perRegione = Object.entries(futuri.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.regione]: (acc[e.regione] ?? 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
  const regioniCoperte = new Set((operatori.data ?? []).filter((o) => o.attivo).flatMap((o) => o.zone.map((z) => z.regione as string)))
  const scoperte = perRegione.filter(([r]) => !regioniCoperte.has(r))
  const massimo = Math.max(1, ...perRegione.map(([, n]) => n))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-tenue">Gestione</p>
        <h1 className="font-display text-4xl font-bold tracking-tight mt-1">Panoramica</h1>
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        <Numero valore={delMese.length} etichetta="eventi questo mese" />
        <Numero valore={daAssegnare.length} etichetta="da assegnare" urgente={daAssegnare.length > 0} a="/gestione" />
        <Numero valore={inAttesa.length} etichetta="in attesa di risposta" />
        <Numero valore={oreDaApprovare} etichetta="chiusure da approvare" urgente={oreDaApprovare > 0} a="/gestione/report" />
        <Numero valore={euro(compensiMese)} etichetta="compensi del mese" scuro />
      </div>

      {scoperte.length > 0 && (
        <Card tono="avviso" className="p-4 flex gap-3">
          <AlertTriangle className="size-5 text-avviso-titolo shrink-0" aria-hidden />
          <p className="text-sm"><strong className="text-avviso-titolo">Zone scoperte:</strong> ci sono eventi in {scoperte.map(([r]) => r).join(', ')} ma nessun operatore attivo in quella regione.</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-6 items-start">
        <Card className="flex-[2_1_480px] min-w-0 p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <TitoloSezione>Prossimi 7 giorni</TitoloSezione>
            <Link to="/gestione" className="text-sm font-bold text-accento inline-flex items-center gap-1">Tutti gli eventi <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          {prossimi7.length === 0 ? <p className="text-sm text-tenue py-4">Nessun evento nei prossimi 7 giorni.</p> : prossimi7.map((e) => (
            <Link key={e.id} to={`/gestione/eventi/${e.id}`} className="flex items-center gap-3 py-2 border-b border-bordo last:border-0 hover:opacity-80">
              <div className="w-28 shrink-0">
                <p className="font-bold text-sm">{dataBreve(e.allestimento_il)}</p>
                <p className="text-xs text-tenue">{ora(e.allestimento_il)}</p>
              </div>
              <p className="flex-1 min-w-0 text-sm font-semibold truncate">{e.tipo_booth?.nome ?? 'Evento'} · {e.citta}<span className="text-tenue font-medium"> · {e.operatore?.nome ?? 'nessun operatore'}</span></p>
              <StatoEvento stato={e.stato} />
            </Link>
          ))}
        </Card>

        <Card className="flex-[1_1_300px] min-w-0 p-5 flex flex-col gap-3">
          <TitoloSezione>Eventi in arrivo per regione</TitoloSezione>
          {perRegione.length === 0 ? <p className="text-sm text-tenue">Nessun evento in programma.</p> : perRegione.map(([r, n]) => (
            <div key={r} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm"><span className="font-semibold">{r}</span><span className="font-bold">{n}</span></div>
              <div className="h-2 rounded-full bg-sfondo overflow-hidden">
                <div className="h-full rounded-full bg-accento" style={{ width: `${(n / massimo) * 100}%` }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

function Numero({ valore, etichetta, urgente, scuro, a }: { valore: number | string; etichetta: string; urgente?: boolean; scuro?: boolean; a?: string }) {
  const contenuto = (
    <Card tono={scuro ? 'scuro' : 'chiaro'} className={urgente ? 'p-5 h-full border-urgente/40 bg-urgente-tenue' : 'p-5 h-full'}>
      <p className={urgente ? 'font-display text-3xl font-bold text-urgente-testo' : 'font-display text-3xl font-bold'}>{valore}</p>
      <p className={scuro ? 'text-sm font-semibold text-su-scuro-tenue' : 'text-sm font-semibold text-tenue'}>{etichetta}</p>
    </Card>
  )
  return a ? <Link to={a} className="hover:opacity-90">{contenuto}</Link> : contenuto
}
