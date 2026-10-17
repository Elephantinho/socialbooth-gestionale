import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, MessageCircle, Navigation, Phone } from 'lucide-react'
import { useEvento, useProposteInAttesa, useRispondiProposta } from '@/modules/eventi/api'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { Pulsante } from '@/shared/ui/Pulsante'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import type { EventoDettaglio } from '@/modules/eventi/types'
import { dataLunga, ora, iniziali } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import { PassaggiOperatore } from '@/modules/passaggi/PassaggiOperatore'
import { SpeseOperatore } from '@/modules/conti/SpeseOperatore'

export function SchedaEvento() {
  const { id = '' } = useParams()
  const { data: e, isPending, error } = useEvento(id)

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-5 pt-sicura pb-1">
        <Link to="/operatore" aria-label="Indietro" className="size-11 rounded-full border border-bordo bg-superficie flex items-center justify-center">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        {e && <StatoEvento stato={e.stato} />}
      </header>

      {isPending ? <Caricamento /> : error ? <div className="p-5"><Errore errore={error} /></div> : <Contenuto e={e} />}
    </div>
  )
}

function Contenuto({ e }: { e: EventoDettaglio }) {
  const numero = e.referente_telefono?.replace(/[^\d+]/g, '') ?? ''

  return (
    <>
      <div className="px-5 pt-4">
        <p className="text-[13px] font-semibold text-tenue">{e.tipo_booth?.nome ?? 'Evento'}, #{String(e.codice).padStart(4, '0')}</p>
        <h1 className="font-display text-[28px] font-semibold leading-tight mt-1">{nomeEvento(e)}</h1>
        <p className="text-base font-medium text-tenue mt-1.5">{dataLunga(e.allestimento_il)}, {e.citta}</p>
      </div>

      <div className="flex flex-col gap-3.5 p-5">
        {e.stato === 'proposto' && <Risposta eventoId={e.id} />}
        <PassaggiOperatore e={e} />
        <SpeseOperatore e={e} />
        <Programma e={e} />

        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-[16px]">{e.indirizzo}</p>
            <p className="text-sm text-tenue">{e.citta}</p>
          </div>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${e.indirizzo}, ${e.citta}`)}`} target="_blank" rel="noreferrer"
            className="h-11 px-4 rounded-lg bg-inchiostro text-white font-semibold text-sm inline-flex items-center gap-2 shrink-0">
            <Navigation className="size-4" aria-hidden /> Naviga
          </a>
        </Card>

        {e.note_accesso && (
          <Card tono="avviso" className="p-4 flex gap-3">
            <AlertTriangle className="size-[22px] text-avviso-titolo shrink-0" aria-hidden />
            <div>
              <p className="font-semibold text-[15px] text-avviso-titolo">Accesso e scarico</p>
              <p className="text-sm leading-relaxed mt-1 whitespace-pre-line">{e.note_accesso}</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Info etichetta="ZTL" valore={e.ztl ? 'Sì' : 'No'} nota={e.ztl ? 'Verifica il permesso' : undefined} />
          <Info etichetta="Wi‑Fi" valore={e.wifi ? 'Sì' : 'No'} nota={e.wifi ? undefined : "Porta l'hotspot"} />
        </div>

        {e.hostess && (
          <Card tono="avviso" className="p-4">
            <p className="font-semibold text-[15px] text-avviso-titolo">Fai anche da steward</p>
            <p className="text-sm mt-1">Outfit: <span className="font-semibold">{e.outfit || 'chiedi al project'}</span></p>
          </Card>
        )}

        {e.referente_nome && (
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-accento-tenue text-accento-scuro font-semibold flex items-center justify-center">{iniziali(e.referente_nome)}</div>
              <div>
                <p className="text-xs font-semibold text-tenue">Referente in loco</p>
                <p className="font-semibold text-[16px]">{e.referente_nome}</p>
              </div>
            </div>
            {numero && (
              <div className="flex gap-2">
                <a href={`tel:${numero}`} className="flex-1 h-11 rounded-lg border border-bordo font-semibold text-sm flex items-center justify-center gap-2">
                  <Phone className="size-4" aria-hidden /> Chiama
                </a>
                <a href={`https://wa.me/${numero.replace('+', '')}`} target="_blank" rel="noreferrer" className="flex-1 h-11 rounded-lg border border-bordo font-semibold text-sm flex items-center justify-center gap-2">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              </div>
            )}
          </Card>
        )}

        {e.note && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-tenue mb-1">Note</p>
            <p className="text-[15px] whitespace-pre-line">{e.note}</p>
          </Card>
        )}
      </div>
    </>
  )
}

function Programma({ e }: { e: EventoDettaglio }) {
  const passi = [
    { ora: e.allestimento_il, titolo: 'Allestimento', stile: 'border-[3px] border-inchiostro' },
    { ora: e.inizio_attivazione, titolo: 'Attivazione', nota: `fino alle ${ora(e.fine_attivazione)}`, stile: 'bg-inchiostro' },
    { ora: e.smontaggio_il, titolo: 'Smontaggio', stile: 'border-[3px] border-inchiostro' },
  ]

  return (
    <Card className="p-4">
      <TitoloSezione className="text-[15px] mb-3.5">Programma</TitoloSezione>
      <ol>
        {passi.map((p, i) => (
          <li key={p.titolo} className="flex gap-3.5">
            <span className="w-12 font-semibold text-[15px]">{ora(p.ora)}</span>
            <span className="flex flex-col items-center" aria-hidden>
              <span className={cn('size-3 rounded-full mt-1 box-border', p.stile)} />
              {i < passi.length - 1 && <span className="w-0.5 flex-1 bg-bordo" />}
            </span>
            <div className={cn('flex-1', i < passi.length - 1 && 'pb-4')}>
              <p className="font-semibold text-[15px]">{p.titolo}</p>
              {p.nota && <p className="text-[13px] text-tenue mt-0.5">{p.nota}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Info({ etichetta, valore, nota, piccolo }: { etichetta: string; valore: string; nota?: string; piccolo?: boolean }) {
  return (
    <Card className="rounded-xl p-3.5">
      <p className="text-xs font-semibold text-tenue">{etichetta}</p>
      <p className={cn('font-semibold mt-1', piccolo ? 'text-[15px] leading-snug' : 'text-[17px]')}>{valore}</p>
      {nota && <p className="text-xs font-semibold text-urgente-testo mt-0.5">{nota}</p>}
    </Card>
  )
}


/** Accetta o rifiuta l'evento proposto */
function Risposta({ eventoId }: { eventoId: string }) {
  const profilo = useProfilo()
  const proposta = useProposteInAttesa(profilo.id).data?.find((p) => p.evento?.id === eventoId)
  const rispondi = useRispondiProposta()
  if (!proposta) return null
  return (
    <Card className="p-4 flex flex-col gap-3">
      <p className="font-semibold">Ti è stato proposto questo evento</p>
      {rispondi.error && <Errore errore={rispondi.error} />}
      <div className="flex gap-2">
        <Pulsante variante="secondario" className="flex-1" disabled={rispondi.isPending}
          onClick={() => rispondi.mutate({ propostaId: proposta.id, accetta: false })}>Rifiuta</Pulsante>
        <Pulsante className="flex-[2]" caricamento={rispondi.isPending && rispondi.variables?.accetta}
          onClick={() => rispondi.mutate({ propostaId: proposta.id, accetta: true })}>Accetta</Pulsante>
      </div>
    </Card>
  )
}
