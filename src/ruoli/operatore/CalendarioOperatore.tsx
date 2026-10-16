import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarOff, Plus, Trash2 } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useCalendarioOperatore } from '@/modules/eventi/api'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { useAggiungiIndisponibilita, useEliminaIndisponibilita, useIndisponibilita } from '@/modules/anagrafiche/api'
import { dataBreve, ora } from '@/shared/lib/formato'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Campo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

export function CalendarioOperatore() {
  const profilo = useProfilo()
  const { data, isPending, error } = useCalendarioOperatore(profilo.id)
  const [mostraPassati, setMostraPassati] = useState(false)

  const ora_ = Date.now()
  const futuri = (data ?? []).filter((e) => new Date(e.smontaggio_il).getTime() >= ora_).reverse()
  const passati = (data ?? []).filter((e) => new Date(e.smontaggio_il).getTime() < ora_)
  const elenco = mostraPassati ? passati : futuri

  // Raggruppa per mese: "ottobre 2026"
  const gruppi = elenco.reduce<Record<string, typeof elenco>>((acc, e) => {
    const k = new Date(e.allestimento_il).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    ;(acc[k] ??= []).push(e)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5 px-5 pt-sicura pb-6">
      <h1 className="font-display text-[30px] font-bold tracking-tight pt-2">Calendario</h1>

      <div className="flex rounded-xl bg-superficie border border-bordo p-1" role="tablist">
        {[false, true].map((p) => (
          <button key={String(p)} role="tab" aria-selected={mostraPassati === p} onClick={() => setMostraPassati(p)}
            className={`flex-1 h-10 rounded-[9px] text-sm font-bold cursor-pointer ${mostraPassati === p ? 'bg-inchiostro text-white' : 'text-tenue'}`}>
            {p ? 'Passati' : 'In programma'}
          </button>
        ))}
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : elenco.length === 0 ? (
        <Card><Vuoto titolo={mostraPassati ? 'Nessun evento passato' : 'Nessun evento in programma'} /></Card>
      ) : Object.entries(gruppi).map(([mese, eventi]) => (
        <section key={mese} className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-tenue uppercase tracking-wider">{mese}</h2>
          {eventi.map((e) => (
            <Link key={e.id} to={`/operatore/eventi/${e.id}`}>
              <Card className="p-4 flex items-center gap-3 active:scale-[0.99] transition">
                <div className="w-14 text-center shrink-0">
                  <p className="font-display text-2xl font-bold leading-none">{new Date(e.allestimento_il).getDate()}</p>
                  <p className="text-xs font-bold text-tenue uppercase">{new Date(e.allestimento_il).toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{e.tipo_booth?.nome ?? 'Evento'} · {e.citta}</p>
                  <p className="text-sm text-tenue">{ora(e.allestimento_il)} – {ora(e.smontaggio_il)}</p>
                </div>
                {e.stato === 'completato' ? <StatoEvento stato={e.stato} /> : <ArrowRight className="size-5 text-tenue" aria-hidden />}
              </Card>
            </Link>
          ))}
        </section>
      ))}

      <Indisponibilita />
    </div>
  )
}

/** Giorni in cui l'operatore non è disponibile: l'assegnazione automatica li salta. */
function Indisponibilita() {
  const profilo = useProfilo()
  const { data } = useIndisponibilita(profilo.id)
  const aggiungi = useAggiungiIndisponibilita()
  const elimina = useEliminaIndisponibilita()
  const [aperto, setAperto] = useState(false)
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [motivo, setMotivo] = useState('')

  return (
    <Card className="p-4 flex flex-col gap-3 mt-2">
      <div className="flex items-center justify-between">
        <TitoloSezione className="text-[15px] flex items-center gap-2"><CalendarOff className="size-4" aria-hidden /> Giorni non disponibile</TitoloSezione>
        {!aperto && (
          <button onClick={() => setAperto(true)} className="text-sm font-bold text-accento inline-flex items-center gap-1 cursor-pointer">
            <Plus className="size-4" aria-hidden /> Aggiungi
          </button>
        )}
      </div>
      <p className="text-xs text-tenue -mt-1">In questi giorni non ti verranno proposti eventi.</p>

      {aperto && (
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault()
          aggiungi.mutate({ operatore_id: profilo.id, dal, al: al || dal, motivo: motivo || null }, {
            onSuccess: () => { setAperto(false); setDal(''); setAl(''); setMotivo('') },
          })
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Campo etichetta="Dal" type="date" required value={dal} onChange={(e) => setDal(e.target.value)} />
            <Campo etichetta="Al" type="date" min={dal} value={al} onChange={(e) => setAl(e.target.value)} />
          </div>
          <Campo etichetta="Motivo (facoltativo)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          {aggiungi.error && <Errore errore={aggiungi.error} />}
          <div className="flex gap-2">
            <Pulsante type="submit" caricamento={aggiungi.isPending}>Salva</Pulsante>
            <Pulsante type="button" variante="secondario" onClick={() => setAperto(false)}>Annulla</Pulsante>
          </div>
        </form>
      )}

      {data?.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-sfondo px-3 py-2.5">
          <div>
            <p className="font-bold text-sm">{i.dal === i.al ? dataBreve(i.dal) : `${dataBreve(i.dal)} → ${dataBreve(i.al)}`}</p>
            {i.motivo && <p className="text-xs text-tenue">{i.motivo}</p>}
          </div>
          <button aria-label="Elimina" onClick={() => elimina.mutate(i.id)} className="size-9 rounded-lg flex items-center justify-center text-tenue cursor-pointer">
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </Card>
  )
}
