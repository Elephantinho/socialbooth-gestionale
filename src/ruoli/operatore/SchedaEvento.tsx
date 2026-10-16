import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, MessageCircle, Phone } from 'lucide-react'
import { TappeLavoro } from './TappeLavoro'
import { InfoLuogo } from '@/modules/luogo/components/InfoLuogo'
import { AllegatiEvento } from '@/modules/comunicazione/components/AllegatiEvento'
import { ChatEvento } from '@/modules/comunicazione/components/ChatEvento'
import { useAttrezzaturaEvento } from '@/modules/attrezzatura/api'
import { useEvento } from '@/modules/eventi/api'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import type { EventoDettaglio } from '@/modules/eventi/types'
import { dataLunga, ora, iniziali } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'

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
        <p className="text-[13px] font-bold tracking-wider uppercase text-tenue">Evento #{String(e.codice).padStart(4, '0')}</p>
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-[1.05] mt-1">{e.tipo_booth?.nome ?? 'Evento'}</h1>
        <p className="text-base font-medium text-[#3F4047] mt-1.5">{dataLunga(e.allestimento_il)} · {e.citta}</p>
      </div>

      <div className="flex flex-col gap-3.5 p-5">
        <Programma e={e} />

        <InfoLuogo indirizzo={e.indirizzo} citta={e.citta} lat={e.lat} lng={e.lng} data={e.allestimento_il}
          magazzino={e.magazzino} ztlDichiarata={e.ztl} compatto />

        {e.note_accesso && (
          <Card tono="avviso" className="p-4 flex gap-3">
            <AlertTriangle className="size-[22px] text-avviso-titolo shrink-0" aria-hidden />
            <div>
              <p className="font-bold text-[15px] text-avviso-titolo">Accesso e scarico</p>
              <p className="text-sm leading-relaxed mt-1 whitespace-pre-line">{e.note_accesso}</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Info etichetta="ZTL" valore={e.ztl ? 'Sì' : 'No'} nota={e.ztl ? 'Verifica il permesso' : undefined} />
          <Info etichetta="Wi‑Fi" valore={e.wifi ? 'Sì' : 'No'} nota={e.wifi ? undefined : "Porta l'hotspot"} />
          <Info etichetta="Hostess / steward" valore={e.hostess ? 'Sì' : 'No'} />
          <Info etichetta="Outfit" valore={e.outfit || '—'} piccolo />
        </div>

        {e.referente_nome && (
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-accento-tenue text-accento-scuro font-bold flex items-center justify-center">{iniziali(e.referente_nome)}</div>
              <div>
                <p className="text-xs font-bold text-tenue">Referente in loco</p>
                <p className="font-bold text-[16px]">{e.referente_nome}</p>
              </div>
            </div>
            {numero && (
              <div className="flex gap-2">
                <a href={`tel:${numero}`} className="flex-1 h-11 rounded-xl border border-bordo font-bold text-sm flex items-center justify-center gap-2">
                  <Phone className="size-4" aria-hidden /> Chiama
                </a>
                <a href={`https://wa.me/${numero.replace('+', '')}`} target="_blank" rel="noreferrer" className="flex-1 h-11 rounded-xl border border-bordo font-bold text-sm flex items-center justify-center gap-2">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              </div>
            )}
          </Card>
        )}

        {e.note && (
          <Card className="p-4">
            <p className="text-xs font-bold text-tenue mb-1">Note</p>
            <p className="text-[15px] whitespace-pre-line">{e.note}</p>
          </Card>
        )}

        <Checklist eventoId={e.id} wifi={e.wifi} />
        <AllegatiEvento eventoId={e.id} fotoSet={e.stato === 'in_corso' || e.stato === 'confermato'} />
        <ChatEvento eventoId={e.id} />
      </div>

      {['confermato', 'in_corso', 'completato'].includes(e.stato) && <div className="px-5 flex flex-col gap-3.5 pb-0"><TappeLavoro e={e} /></div>}
    </>
  )
}

function Programma({ e }: { e: EventoDettaglio }) {
  const passi = [
    e.ritiro_magazzino_il && {
      ora: e.ritiro_magazzino_il, titolo: 'Ritiro al magazzino',
      nota: [e.magazzino?.nome, e.viaggio_minuti && `~${e.viaggio_minuti} min di viaggio`].filter(Boolean).join(' · '),
      stile: 'border-[3px] border-accento',
    },
    { ora: e.allestimento_il, titolo: 'Allestimento', stile: 'bg-accento' },
    { ora: e.inizio_attivazione, titolo: 'Attivazione', nota: `fino alle ${ora(e.fine_attivazione)}`, stile: 'bg-inchiostro' },
    { ora: e.smontaggio_il, titolo: 'Smontaggio', stile: 'border-[3px] border-inchiostro' },
  ].filter(Boolean) as { ora: string; titolo: string; nota?: string; stile: string }[]

  return (
    <Card className="p-4">
      <TitoloSezione className="text-[15px] mb-3.5">Programma</TitoloSezione>
      <ol>
        {passi.map((p, i) => (
          <li key={p.titolo} className="flex gap-3.5">
            <span className="w-12 font-bold text-[15px]">{ora(p.ora)}</span>
            <span className="flex flex-col items-center" aria-hidden>
              <span className={cn('size-3 rounded-full mt-1 box-border', p.stile)} />
              {i < passi.length - 1 && <span className="w-0.5 flex-1 bg-bordo" />}
            </span>
            <div className={cn('flex-1', i < passi.length - 1 && 'pb-4')}>
              <p className="font-bold text-[15px]">{p.titolo}</p>
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
    <Card className="rounded-2xl p-3.5">
      <p className="text-xs font-bold text-tenue">{etichetta}</p>
      <p className={cn('font-bold mt-1', piccolo ? 'text-[15px] leading-snug' : 'text-[17px]')}>{valore}</p>
      {nota && <p className="text-xs font-bold text-urgente-testo mt-0.5">{nota}</p>}
    </Card>
  )
}

/**
 * Checklist attrezzatura: quella assegnata dal project in magazzino,
 * altrimenti una lista base. Le spunte restano sul telefono durante l'uso.
 */
function Checklist({ eventoId, wifi }: { eventoId: string; wifi: boolean }) {
  const assegnata = useAttrezzaturaEvento(eventoId).data ?? []
  const base = assegnata.length
    ? assegnata.map((a) => `${a.quantita > 1 ? `${a.quantita}× ` : ''}${a.articolo?.nome ?? 'Articolo'}${a.articolo?.codice ? ` (${a.articolo.codice})` : ''}`)
    : ['Booth e cavalletto', 'Stampante e carta', 'Props e fondale']
  const voci = [...base, ...(wifi ? [] : ['Hotspot carico'])]
  const [fatte, setFatte] = useState<string[]>([])
  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex justify-between items-center mb-1">
        <TitoloSezione className="text-[15px]">Checklist attrezzatura</TitoloSezione>
        <span className="text-xs font-bold text-tenue">{fatte.length}/{voci.length}</span>
      </div>
      {voci.map((v) => (
        <label key={v} className="flex items-center gap-3 text-[15px] min-h-11 cursor-pointer">
          <input
            type="checkbox"
            className="size-[22px] accent-accento"
            checked={fatte.includes(v)}
            onChange={(ev) => setFatte((f) => (ev.target.checked ? [...f, v] : f.filter((x) => x !== v)))}
          />
          <span className={cn(fatte.includes(v) && 'text-tenue line-through')}>{v}</span>
        </label>
      ))}
    </Card>
  )
}
