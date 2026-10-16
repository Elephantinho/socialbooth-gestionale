import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useChiudiEvento } from '@/modules/eventi/api'
import { costruisciOrari, minutiViaggioPagati } from '@/modules/eventi/logic/orari'
import type { EventoDettaglio } from '@/modules/eventi/types'
import { combinaDataOra, durata, euro, ora, perCampoData } from '@/shared/lib/formato'
import { AreaTesto, Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'

const tipiSpesa = ['carburante', 'pedaggio', 'parcheggio', 'altro']

/** Foglio a scomparsa per chiudere l'evento: ore precompilate, l'operatore conferma o corregge. */
export function ChiudiEvento({ e, onChiudi }: { e: EventoDettaglio; onChiudi: () => void }) {
  const profilo = useProfilo()
  const chiudi = useChiudiEvento()
  const [inizio, setInizio] = useState(ora(e.allestimento_il))
  const [fine, setFine] = useState(ora(e.smontaggio_il))
  const [viaggio, setViaggio] = useState(String(minutiViaggioPagati(e.viaggio_minuti)))
  const [nota, setNota] = useState('')
  const [spese, setSpese] = useState<{ tipo: string; importo: string }[]>([])

  const [inizioIso, fineIso] = costruisciOrari(perCampoData(e.allestimento_il), [inizio, fine], combinaDataOra)
  const minutiLocation = Math.max(0, Math.round((new Date(fineIso).getTime() - new Date(inizioIso).getTime()) / 60_000))
  const minutiViaggio = Number(viaggio) || 0
  const cambiato = inizio !== ora(e.allestimento_il) || fine !== ora(e.smontaggio_il) || minutiViaggio !== minutiViaggioPagati(e.viaggio_minuti)
  const totaleSpese = spese.reduce((s, x) => s + (Number(x.importo.replace(',', '.')) || 0), 0)

  function invia(ev: React.FormEvent) {
    ev.preventDefault()
    chiudi.mutate({
      eventoId: e.id, operatoreId: profilo.id, minutiLocation, minutiViaggio, nota: nota.trim(),
      spese: spese.filter((s) => Number(s.importo.replace(',', '.')) > 0).map((s) => ({ tipo: s.tipo, importo: Number(s.importo.replace(',', '.')) })),
    }, { onSuccess: onChiudi })
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onChiudi}>
      <motion.form
        onSubmit={invia}
        onClick={(ev) => ev.stopPropagation()}
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md max-h-[92dvh] overflow-y-auto bg-sfondo rounded-t-[28px] px-5 pt-5 pb-sicura flex flex-col gap-4"
        aria-label="Chiudi evento"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Chiudi evento</h2>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="size-10 rounded-full bg-superficie border border-bordo flex items-center justify-center cursor-pointer">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p className="text-sm text-tenue -mt-2">Controlla gli orari: sono quelli previsti. Correggili se hai iniziato o finito a un'ora diversa.</p>

        <div className="grid grid-cols-2 gap-3">
          <Campo etichetta="Inizio lavoro" type="time" required value={inizio} onChange={(ev) => setInizio(ev.target.value)} />
          <Campo etichetta="Fine lavoro" type="time" required value={fine} onChange={(ev) => setFine(ev.target.value)} />
        </div>
        <Campo etichetta="Viaggio andata + ritorno (minuti)" type="number" min={0} inputMode="numeric" value={viaggio} onChange={(ev) => setViaggio(ev.target.value)} />

        <div className="rounded-2xl bg-inchiostro text-white p-4 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-xs text-su-scuro-tenue">Location</p><p className="font-bold">{durata(minutiLocation)}</p></div>
          <div><p className="text-xs text-su-scuro-tenue">Viaggio</p><p className="font-bold">{durata(minutiViaggio)}</p></div>
          <div><p className="text-xs text-accento-chiaro">Totale</p><p className="font-bold text-accento-chiaro">{durata(minutiLocation + minutiViaggio)}</p></div>
        </div>

        {cambiato && (
          <AreaTesto etichetta="Perché sono cambiati gli orari?" required rows={2} placeholder="Es. il cliente ha prolungato di mezz'ora"
            value={nota} onChange={(ev) => setNota(ev.target.value)} />
        )}

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#3F4047]">Spese da rimborsare {totaleSpese > 0 && `· ${euro(totaleSpese)}`}</span>
            <button type="button" onClick={() => setSpese((s) => [...s, { tipo: 'carburante', importo: '' }])}
              className="text-sm font-bold text-accento inline-flex items-center gap-1 cursor-pointer">
              <Plus className="size-4" aria-hidden /> Aggiungi
            </button>
          </div>
          {spese.map((s, i) => (
            <div key={i} className="flex gap-2 items-end">
              <Selezione etichetta="Tipo" className="flex-1" value={s.tipo}
                onChange={(ev) => setSpese((l) => l.map((x, j) => (j === i ? { ...x, tipo: ev.target.value } : x)))}>
                {tipiSpesa.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </Selezione>
              <Campo etichetta="Importo €" inputMode="decimal" className="w-28" value={s.importo}
                onChange={(ev) => setSpese((l) => l.map((x, j) => (j === i ? { ...x, importo: ev.target.value } : x)))} />
              <button type="button" aria-label="Togli spesa" onClick={() => setSpese((l) => l.filter((_, j) => j !== i))}
                className="size-12 rounded-xl border border-bordo flex items-center justify-center cursor-pointer shrink-0">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>

        {chiudi.error && <Errore errore={chiudi.error} />}
        <Pulsante type="submit" taglia="xl" pieno caricamento={chiudi.isPending}>Invia ore</Pulsante>
        <p className="text-center text-xs text-tenue -mt-2">Le ore vanno al project per l'approvazione.</p>
      </motion.form>
    </motion.div>
  )
}
