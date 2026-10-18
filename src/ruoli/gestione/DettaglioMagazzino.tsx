import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { useAttivaMagazzino, useCaricaCarta, useMagazzini } from '@/modules/magazzino/api'
import { IndicatoreCarta } from '@/modules/magazzino/Carta'
import { STAMPE_PER_ROTOLO, cartaBassa } from '@/modules/magazzino/magazzino'
import { ModuloMagazzino } from '@/modules/magazzino/ModuloMagazzino'
import { Strumenti } from '@/modules/magazzino/Strumenti'
import { nomeCompleto } from '@/shared/lib/formato'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

export function DettaglioMagazzino() {
  const { id = '' } = useParams()
  const { data, isPending, error } = useMagazzini()
  const gestisce = usePuo()('magazzino')
  const attiva = useAttivaMagazzino()
  const [modifica, setModifica] = useState(false)

  if (isPending) return <Caricamento />
  if (error) return <Errore errore={error} />
  const m = data.find((x) => x.id === id)
  if (!m) return <Card><Vuoto titolo="Magazzino non trovato" /></Card>
  const operatori = m.operatori.filter((o) => o.attivo).length

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo={m.nome} indietro={{ a: '/gestione/magazzini', testo: 'Magazzini' }}
        extra={!m.attivo && <span className="text-xs font-semibold text-tenue bg-superficie border border-bordo rounded-full px-2.5 py-1">Chiuso</span>}
        azioni={gestisce && !modifica && (
          <>
            <Pulsante variante="secondario" caricamento={attiva.isPending}
              onClick={() => { if (!m.attivo || confirm('Chiudere il magazzino? Resta nell\'elenco ma non conta più.')) attiva.mutate({ id: m.id, attivo: !m.attivo }) }}>
              {m.attivo ? 'Chiudi magazzino' : 'Riapri magazzino'}
            </Pulsante>
            <Pulsante onClick={() => setModifica(true)}>Modifica</Pulsante>
          </>
        )} />
      <p className="text-tenue font-medium -mt-4">{m.indirizzo}, {m.citta} ({m.regione})</p>

      {modifica ? (
        <Card className="p-5 md:p-6 max-w-3xl">
          <ModuloMagazzino magazzino={m} onSalvato={() => setModifica(false)} onAnnulla={() => setModifica(false)} />
        </Card>
      ) : (
        <div className="flex flex-wrap gap-6 items-start">
          <Card className="flex-[999_1_520px] min-w-0 p-5 md:p-6 flex flex-col gap-4">
            <TitoloSezione>Strumenti</TitoloSezione>
            <Strumenti magazzinoId={m.id} articoli={m.articoli} modificabile={gestisce} />
          </Card>
          <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-4">
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <TitoloSezione>Carta</TitoloSezione>
                {cartaBassa(m) && <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-avviso text-avviso-testo">Da ricaricare</span>}
              </div>
              <IndicatoreCarta stampe={m.carta_stampe} minima={m.carta_minima} grande />
              <p className="text-sm text-tenue">Scorta minima {m.carta_minima.toLocaleString('it-IT')} stampe</p>
              {gestisce && <CaricaCarta magazzinoId={m.id} />}
            </Card>
            <Card className="p-5 flex flex-col gap-3">
              <TitoloSezione>Responsabile</TitoloSezione>
              {m.responsabile ? (
                <div className="flex items-center gap-3">
                  <Avatar nome={nomeCompleto(m.responsabile)} foto={m.responsabile.foto} taglia="sm" />
                  <span className="font-semibold">{nomeCompleto(m.responsabile)}</span>
                </div>
              ) : <p className="text-tenue">Nessuno</p>}
              <p className="text-sm text-tenue">{operatori === 1 ? '1 operatore parte da qui' : `${operatori} operatori partono da qui`}</p>
            </Card>
            {m.note && <Card className="p-5 text-sm whitespace-pre-line"><span className="font-semibold">Note: </span>{m.note}</Card>}
          </aside>
        </div>
      )}
    </div>
  )
}

/** Carico e scarico di carta: a rotoli interi con i pulsanti, oppure un numero di stampe preciso */
function CaricaCarta({ magazzinoId }: { magazzinoId: string }) {
  const carica = useCaricaCarta()
  const [stampe, setStampe] = useState('')
  const n = /^\d+$/.test(stampe.trim()) ? Number(stampe) : null
  const muovi = (variazione: number) => carica.mutate({ magazzino: magazzinoId, stampe: variazione }, { onSuccess: () => setStampe('') })

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-bordo">
      <div className="grid grid-cols-2 gap-2">
        <Pulsante variante="secondario" onClick={() => muovi(-STAMPE_PER_ROTOLO)} disabled={carica.isPending}><Minus className="size-4" aria-hidden /> 1 rotolo</Pulsante>
        <Pulsante variante="secondario" onClick={() => muovi(STAMPE_PER_ROTOLO)} disabled={carica.isPending}><Plus className="size-4" aria-hidden /> 1 rotolo</Pulsante>
      </div>
      <div className="flex gap-2 items-end">
        <label className="flex-1 flex flex-col gap-1.5 text-[13px] font-medium text-tenue">
          Stampe
          <input value={stampe} onChange={(e) => setStampe(e.target.value)} inputMode="numeric" placeholder="es. 120"
            className="w-full h-10 rounded-lg border border-bordo-forte bg-superficie px-3 text-[15px] text-inchiostro placeholder:text-tenue/70 focus:outline-none focus:border-accento" />
        </label>
        <Pulsante variante="secondario" disabled={!n || carica.isPending} onClick={() => n && muovi(-n)} aria-label="Togli stampe"><Minus className="size-4" aria-hidden /></Pulsante>
        <Pulsante variante="secondario" disabled={!n || carica.isPending} onClick={() => n && muovi(n)} aria-label="Aggiungi stampe"><Plus className="size-4" aria-hidden /></Pulsante>
      </div>
      {carica.error && <Errore errore={carica.error} />}
    </div>
  )
}
