import { Link } from 'react-router-dom'
import { Check, Clock } from 'lucide-react'
import { AssegnaRapido } from '@/modules/eventi/components/RigaEvento'
import { giaPassato } from '@/modules/eventi/logic/archivio'
import { giornoRoma } from '@/modules/eventi/logic/filtri'
import { nomeEvento } from '@/modules/eventi/logic/nome'
import type { EventoGestione } from '@/modules/eventi/types'
import { PASSAGGI, passaggiFatti } from '@/modules/passaggi/passaggi'
import { ritardo } from '@/modules/passaggi/ritardi'
import { ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'

/** "2026-10-17" + n giorni */
export function piuGiorni(g: string, n: number) {
  const d = new Date(`${g}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const da = (g: string, opz: Intl.DateTimeFormatOptions) => new Date(`${g}T12:00:00Z`).toLocaleDateString('it-IT', { timeZone: 'UTC', ...opz })

/** Sette colonne, una per giorno a partire da "inizio"; ogni evento è una schedina. */
export function SettimanaEventi({ eventi, inizio, assegna }: { eventi: EventoGestione[]; inizio: string; assegna: boolean }) {
  const giorni = Array.from({ length: 7 }, (_, i) => piuGiorni(inizio, i))
  const perGiorno = new Map<string, EventoGestione[]>(giorni.map((g) => [g, []]))
  for (const e of eventi) perGiorno.get(giornoRoma(e.allestimento_il))?.push(e)
  for (const l of perGiorno.values()) l.sort((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))
  const oggi = giornoRoma(new Date().toISOString())

  return (
    <div className="overflow-x-auto -mx-4 px-4 scroll-px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
      <div className="grid grid-cols-[repeat(7,minmax(240px,1fr))] md:grid-cols-7 gap-2 min-w-max md:min-w-0">
        {giorni.map((g, i) => {
          const lista = perGiorno.get(g) ?? []
          const daSistemare = lista.filter((e) => ritardo(e) || e.stato === 'da_assegnare' || e.stato === 'bozza').length
          return (
            <section key={g} className="snap-start flex flex-col gap-1.5 min-w-0">
              <header className={cn('rounded-lg px-2.5 py-2 flex items-baseline justify-between gap-2 sticky top-0 z-10',
                g === oggi ? 'bg-inchiostro text-white' : 'bg-superficie border border-bordo')}>
                <span className="text-sm font-semibold capitalize truncate">
                  {g === oggi ? 'Oggi' : da(g, { weekday: 'short' }).replace('.', '')} {da(g, { day: 'numeric' })}
                  <span className={cn('font-medium ml-1', g === oggi ? 'text-white/60' : 'text-tenue')}>{da(g, { month: 'short' }).replace('.', '')}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
                  {daSistemare > 0 && <span className="size-2 rounded-full bg-urgente" title={`${daSistemare} da sistemare`} />}
                  <span className={g === oggi ? 'text-white/80' : 'text-tenue'}>{lista.length}</span>
                </span>
              </header>
              {lista.length === 0
                ? <p className="text-xs text-tenue/70 text-center py-4">Nessun evento</p>
                : lista.map((e) => <Schedina key={e.id} e={e} assegna={assegna} destra={i >= 4} />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Schedina({ e, assegna, destra }: { e: EventoGestione; assegna: boolean; destra: boolean }) {
  const manca = ritardo(e)
  const daAssegnare = e.stato === 'da_assegnare' || e.stato === 'bozza'
  const barra = manca || daAssegnare ? 'bg-urgente' : e.stato === 'proposto' ? 'bg-avviso-icona' : 'bg-ok'
  const n = passaggiFatti(e.ultimo_passaggio)

  return (
    <div className="relative bg-superficie border border-bordo rounded-lg pl-3 pr-2 py-2 hover:border-bordo-forte hover:shadow-sm transition">
      <span className={cn('absolute left-0 inset-y-0 w-1 rounded-l-lg', barra)} aria-hidden />
      <Link to={`/gestione/eventi/${e.id}`} className="block">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs font-semibold tabular-nums">{ora(e.allestimento_il)}</span>
          {manca ? <span className="text-[10px] font-semibold text-white bg-urgente rounded px-1.5 py-px truncate">{manca}</span>
            : e.stato === 'in_corso' ? <span className="text-[10px] font-semibold text-white bg-ok rounded px-1.5 py-px">{n ? PASSAGGI[n - 1].fatto.split(',')[0] : 'In corso'} {n}/6</span>
            : e.stato === 'confermato' ? <Check className="size-3.5 text-ok" strokeWidth={3} aria-label="Confermato" />
            : e.stato === 'proposto' ? <Clock className="size-3.5 text-avviso-icona" aria-label="In attesa" />
            : null}
        </div>
        <p className="text-[13px] font-semibold leading-snug line-clamp-2 mt-0.5">{nomeEvento(e)}</p>
        <p className="text-[11px] text-tenue truncate">{e.citta}{e.project ? `, ${e.project.nome}` : ''}</p>
      </Link>
      <div className="mt-1.5">
        {e.operatore ? (
          <p className="text-[11px] font-medium truncate">{e.operatore.nome} {e.operatore.cognome}</p>
        ) : assegna && e.stato === 'da_assegnare' && !giaPassato(e) ? (
          <AssegnaRapido eventoId={e.id} destra={destra} piccolo />
        ) : (
          <p className="text-[11px] font-semibold text-urgente-testo">Nessun operatore</p>
        )}
      </div>
    </div>
  )
}

const statoEsteso: Record<string, string> = {
  confermato: 'Confermato', proposto: 'In attesa di risposta', da_assegnare: 'Da assegnare', bozza: 'Da assegnare',
  completato: 'Completato', annullato: 'Annullato',
}

/** Per chi ha pochi eventi (il project): la settimana a schede grandi, giorno per giorno. */
export function SettimanaGrande({ eventi, inizio, assegna }: { eventi: EventoGestione[]; inizio: string; assegna: boolean }) {
  const giorni = Array.from({ length: 7 }, (_, i) => piuGiorni(inizio, i))
  const oggi = giornoRoma(new Date().toISOString())
  const conEventi = giorni
    .map((g) => [g, eventi.filter((e) => giornoRoma(e.allestimento_il) === g).sort((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))] as const)
    .filter(([, l]) => l.length > 0)
  if (!conEventi.length) return <p className="text-tenue py-10 text-center">Nessun evento in questa settimana.</p>

  return (
    <div className="flex flex-col gap-6">
      {conEventi.map(([g, lista]) => (
        <section key={g} className="flex flex-col gap-3">
          <h2 className={cn('font-semibold text-lg', g !== oggi && 'text-tenue')}>
            {g === oggi ? `Oggi, ${da(g, { weekday: 'long', day: 'numeric', month: 'long' })}` : (() => { const t = da(g, { weekday: 'long', day: 'numeric', month: 'long' }); return t[0].toUpperCase() + t.slice(1) })()}
          </h2>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
            {lista.map((e) => <SchedaGrande key={e.id} e={e} assegna={assegna} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function SchedaGrande({ e, assegna }: { e: EventoGestione; assegna: boolean }) {
  const manca = ritardo(e)
  const daAssegnare = e.stato === 'da_assegnare' || e.stato === 'bozza'
  const barra = manca || daAssegnare ? 'bg-urgente' : e.stato === 'proposto' ? 'bg-avviso-icona' : 'bg-ok'
  const n = passaggiFatti(e.ultimo_passaggio)
  const stato = manca ?? (e.stato === 'in_corso' ? `${n ? PASSAGGI[n - 1].fatto.split(',')[0] : 'In corso'}, ${n} di 6` : statoEsteso[e.stato] ?? e.stato)
  const tonoStato = manca || daAssegnare ? 'bg-urgente-tenue text-urgente-testo' : e.stato === 'proposto' ? 'bg-avviso text-avviso-testo' : 'bg-ok-tenue text-ok'

  return (
    <div className="relative bg-superficie border border-bordo rounded-xl pl-5 pr-4 py-4 flex flex-col gap-3 hover:border-bordo-forte hover:shadow-sm transition">
      <span className={cn('absolute left-0 inset-y-0 w-1.5 rounded-l-xl', barra)} aria-hidden />
      <Link to={`/gestione/eventi/${e.id}`} className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-semibold tabular-nums text-tenue">{ora(e.allestimento_il)} – {ora(e.smontaggio_il)}</p>
          <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap', tonoStato)}>{stato}</span>
        </div>
        <p className="text-xl font-semibold leading-tight">{nomeEvento(e)}</p>
        <p className="text-sm text-tenue">{e.nome && e.tipo_booth ? `${e.tipo_booth.nome}, ` : ''}{e.indirizzo}, {e.citta}</p>
      </Link>
      <div className="pt-3 border-t border-bordo flex items-center gap-2.5 min-h-10">
        {e.operatore ? (
          <>
            <span className="size-8 rounded-full bg-sfondo flex items-center justify-center text-xs font-semibold">{e.operatore.nome[0]}{e.operatore.cognome?.[0] ?? ''}</span>
            <span className="font-medium">{e.operatore.nome} {e.operatore.cognome}</span>
          </>
        ) : assegna && e.stato === 'da_assegnare' && !giaPassato(e) ? (
          <AssegnaRapido eventoId={e.id} />
        ) : (
          <span className="font-semibold text-urgente-testo">Nessun operatore</span>
        )}
      </div>
    </div>
  )
}
