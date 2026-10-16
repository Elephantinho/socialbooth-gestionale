import { useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, CreditCard, Plus, Trash2, Wallet, X } from 'lucide-react'
import { caricaFileEvento } from '@/modules/comunicazione/api'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useChiudiEvento } from '@/modules/eventi/api'
import { useMiaCarta } from '@/modules/costi/api'
import { CATEGORIE_COSTO } from '@/modules/costi/costanti'
import { costruisciOrari, minutiViaggioPagati } from '@/modules/eventi/logic/orari'
import type { EventoDettaglio } from '@/modules/eventi/types'
import { combinaDataOra, durata, euro, ora, perCampoData } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import type { Enum } from '@/shared/types/database'
import { AreaTesto, Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'

type RigaSpesa = { categoria: Enum<'categoria_costo'>; importo: string; descrizione: string; conCarta: boolean; foto?: File }

const numero = (s: string) => Number(s.replace(',', '.')) || 0

/** Foglio a scomparsa per chiudere l'evento: ore precompilate, stampe, spese con carta aziendale o anticipate. */
export function ChiudiEvento({ e, onChiudi, soloSpese }: { e: EventoDettaglio; onChiudi: () => void; soloSpese?: boolean }) {
  const profilo = useProfilo()
  const chiudi = useChiudiEvento()
  const carta = useMiaCarta(profilo.id).data
  const [inizio, setInizio] = useState(ora(e.allestimento_il))
  const [fine, setFine] = useState(ora(e.smontaggio_il))
  const [viaggio, setViaggio] = useState(String(minutiViaggioPagati(e.viaggio_minuti)))
  const [stampe, setStampe] = useState('')
  const [nota, setNota] = useState('')
  const [spese, setSpese] = useState<RigaSpesa[]>(() => (soloSpese ? [{ categoria: 'carburante', importo: '', descrizione: '', conCarta: false }] : []))

  const [inizioIso, fineIso] = costruisciOrari(perCampoData(e.allestimento_il), [inizio, fine], combinaDataOra)
  const minutiLocation = Math.max(0, Math.round((new Date(fineIso).getTime() - new Date(inizioIso).getTime()) / 60_000))
  const minutiViaggio = Number(viaggio) || 0
  const cambiato = inizio !== ora(e.allestimento_il) || fine !== ora(e.smontaggio_il) || minutiViaggio !== minutiViaggioPagati(e.viaggio_minuti)
  const daRimborsare = spese.filter((s) => !s.conCarta).reduce((t, s) => t + numero(s.importo), 0)
  const conCarta = spese.filter((s) => s.conCarta).reduce((t, s) => t + numero(s.importo), 0)

  const aggiorna = (i: number, campi: Partial<RigaSpesa>) => setSpese((l) => l.map((x, j) => (j === i ? { ...x, ...campi } : x)))

  const [caricoFoto, setCaricoFoto] = useState(false)
  const [erroreFoto, setErroreFoto] = useState<unknown>()

  async function invia(ev: React.FormEvent) {
    ev.preventDefault()
    // Prima carica le foto degli scontrini nell'archivio privato dell'evento
    setErroreFoto(undefined)
    setCaricoFoto(true)
    let percorsi: (string | null)[]
    try {
      percorsi = await Promise.all(spese.map((s) => (s.foto && numero(s.importo) > 0 ? caricaFileEvento(e.id, s.foto, s.foto.name || 'scontrino.jpg', 'scontrini') : Promise.resolve(null))))
    } catch (err) {
      setErroreFoto(err)
      setCaricoFoto(false)
      return
    }
    setCaricoFoto(false)
    const righe = spese.map((s, i) => ({ s, scontrino: percorsi[i] })).filter(({ s }) => numero(s.importo) > 0).map(({ s, scontrino }) => ({
      scontrino,
      categoria: s.categoria, quantita: 1, costo_unitario: numero(s.importo), descrizione: s.descrizione || undefined,
      pagato_con: (s.conCarta && carta ? 'carta_aziendale' : 'operatore') as Enum<'pagamento'>,
      carta_id: s.conCarta && carta ? carta.id : null,
    }))
    // Le stampe sono un costo (carta) con quantità: il prezzo unitario lo mette il project
    if (Number(stampe) > 0) {
      righe.push({ scontrino: null, categoria: 'carta_stampe', quantita: Number(stampe), costo_unitario: 0, descrizione: 'Stampe effettuate', pagato_con: 'azienda', carta_id: null })
    }
    chiudi.mutate({ eventoId: e.id, operatoreId: profilo.id, minutiLocation, minutiViaggio, nota: nota.trim(), spese: righe, soloSpese }, { onSuccess: onChiudi })
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
          <h2 className="font-display text-2xl font-bold">{soloSpese ? 'Aggiungi spese' : 'Ore a mano'}</h2>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="size-10 rounded-full bg-superficie border border-bordo flex items-center justify-center cursor-pointer">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {soloSpese ? (
          <div className="grid grid-cols-2 gap-3">
            <Campo etichetta="Stampe effettuate" type="number" min={0} inputMode="numeric" placeholder="0" value={stampe} onChange={(ev) => setStampe(ev.target.value)} />
          </div>
        ) : <>
        <p className="text-sm text-tenue -mt-2">Usa questo modulo solo se non hai registrato le tappe. Gli orari sono quelli previsti: correggili se serve.</p>

        <div className="grid grid-cols-2 gap-3">
          <Campo etichetta="Inizio lavoro" type="time" required value={inizio} onChange={(ev) => setInizio(ev.target.value)} />
          <Campo etichetta="Fine lavoro" type="time" required value={fine} onChange={(ev) => setFine(ev.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo etichetta="Viaggio a/r (minuti)" type="number" min={0} inputMode="numeric" value={viaggio} onChange={(ev) => setViaggio(ev.target.value)} />
          <Campo etichetta="Stampe effettuate" type="number" min={0} inputMode="numeric" placeholder="0" value={stampe} onChange={(ev) => setStampe(ev.target.value)} />
        </div>

        <div className="rounded-2xl bg-inchiostro text-white p-4 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-xs text-su-scuro-tenue">Location</p><p className="font-bold">{durata(minutiLocation)}</p></div>
          <div><p className="text-xs text-su-scuro-tenue">Viaggio</p><p className="font-bold">{durata(minutiViaggio)}</p></div>
          <div><p className="text-xs text-accento-chiaro">Totale</p><p className="font-bold text-accento-chiaro">{durata(minutiLocation + minutiViaggio)}</p></div>
        </div>

        {cambiato && (
          <AreaTesto etichetta="Perché sono cambiati gli orari?" required rows={2} placeholder="Es. il cliente ha prolungato di mezz'ora"
            value={nota} onChange={(ev) => setNota(ev.target.value)} />
        )}
        </>}

        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#3F4047]">Spese sostenute</span>
            <button type="button" onClick={() => setSpese((s) => [...s, { categoria: 'carburante', importo: '', descrizione: '', conCarta: !!carta }])}
              className="text-sm font-bold text-accento inline-flex items-center gap-1 cursor-pointer">
              <Plus className="size-4" aria-hidden /> Aggiungi
            </button>
          </div>
          {carta && <p className="text-xs text-tenue -mt-1">Hai la carta aziendale <strong>{carta.nome} ···· {carta.ultime_cifre}</strong>.</p>}

          {spese.map((s, i) => (
            <div key={i} className="rounded-2xl bg-superficie border border-bordo p-3 flex flex-col gap-2.5">
              <div className="flex gap-2 items-end">
                <Selezione etichetta="Tipo" className="flex-1" value={s.categoria} onChange={(ev) => aggiorna(i, { categoria: ev.target.value as Enum<'categoria_costo'> })}>
                  {CATEGORIE_COSTO.map((c) => <option key={c.id} value={c.id}>{c.etichetta}</option>)}
                </Selezione>
                <Campo etichetta="Importo €" inputMode="decimal" className="w-28" value={s.importo} onChange={(ev) => aggiorna(i, { importo: ev.target.value })} />
                <button type="button" aria-label="Togli spesa" onClick={() => setSpese((l) => l.filter((_, j) => j !== i))}
                  className="size-12 rounded-xl border border-bordo flex items-center justify-center cursor-pointer shrink-0">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              <Campo etichetta="Descrizione (facoltativa)" placeholder="Es. caffè per il cliente" value={s.descrizione} onChange={(ev) => aggiorna(i, { descrizione: ev.target.value })} />
              <label className={cn('h-11 rounded-xl border border-dashed text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer',
                s.foto ? 'border-accento text-accento bg-accento-tenue/40' : 'border-bordo-forte text-tenue')}>
                <Camera className="size-4" aria-hidden /> {s.foto ? 'Foto scontrino aggiunta ✓' : 'Fotografa lo scontrino'}
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(ev) => ev.target.files?.[0] && aggiorna(i, { foto: ev.target.files[0] })} />
              </label>
              <div className="flex rounded-xl bg-sfondo p-1" role="group" aria-label="Come hai pagato">
                {carta && (
                  <button type="button" aria-pressed={s.conCarta} onClick={() => aggiorna(i, { conCarta: true })}
                    className={cn('flex-1 h-10 rounded-[9px] text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer', s.conCarta ? 'bg-superficie shadow-sm' : 'text-tenue')}>
                    <CreditCard className="size-4" aria-hidden /> Carta aziendale
                  </button>
                )}
                <button type="button" aria-pressed={!s.conCarta} onClick={() => aggiorna(i, { conCarta: false })}
                  className={cn('flex-1 h-10 rounded-[9px] text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer', !s.conCarta ? 'bg-superficie shadow-sm' : 'text-tenue')}>
                  <Wallet className="size-4" aria-hidden /> Pagato da me
                </button>
              </div>
            </div>
          ))}
          {spese.length > 0 && (
            <p className="text-sm text-tenue">
              {conCarta > 0 && <>Con carta: <strong className="text-inchiostro">{euro(conCarta)}</strong> · </>}
              Da rimborsarti: <strong className="text-inchiostro">{euro(daRimborsare)}</strong>
            </p>
          )}
        </div>

        {(chiudi.error || erroreFoto != null) && <Errore errore={chiudi.error ?? erroreFoto} />}
        <Pulsante type="submit" taglia="xl" pieno caricamento={chiudi.isPending || caricoFoto}>{soloSpese ? 'Salva spese' : 'Invia ore e spese'}</Pulsante>
        <p className="text-center text-xs text-tenue -mt-2">Vanno al project per l'approvazione.</p>
      </motion.form>
    </motion.div>
  )
}
