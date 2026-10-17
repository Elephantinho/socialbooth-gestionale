import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { useOperatori } from '@/modules/anagrafiche/api'
import { useCarte, useEliminaCarta, useMovimentiCarte, useSalvaCarta } from '@/modules/costi/api'
import { etichettaCategoria } from '@/modules/costi/costanti'
import { dataBreve, euro, meseCorrente } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Carta = NonNullable<ReturnType<typeof useCarte>['data']>[number]

export function CarteAziendali() {
  const carte = useCarte()
  const admin = usePuo()('carte')
  const [nuova, setNuova] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 justify-between items-end">
        <div>
          <h1 className="font-display text-[26px] font-semibold leading-tight">Carte aziendali</h1>
          <p className="text-tenue mt-2 max-w-2xl">
            Assegna una carta a ogni operatore: quando registra una spesa sceglie "carta aziendale" e la trovi qui sotto, pronta da confrontare con l'estratto conto.
          </p>
        </div>
        {admin && !nuova && <Pulsante taglia="lg" icona={<Plus className="size-[18px]" aria-hidden />} onClick={() => setNuova(true)}>Nuova carta</Pulsante>}
      </div>

      {nuova && <Card className="p-5"><ModuloCarta onFatto={() => setNuova(false)} /></Card>}

      {carte.isPending ? <Caricamento /> : carte.error ? <Errore errore={carte.error} /> : !carte.data.length ? (
        <Card><Vuoto titolo="Nessuna carta" testo="Registra le carte aziendali con le ultime 4 cifre e assegnale agli operatori." /></Card>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {carte.data.map((c) => <SchedaCarta key={c.id} c={c} admin={admin} />)}
        </div>
      )}

      <Movimenti />

      <p className="text-xs text-tenue max-w-2xl">
        Per sicurezza l'app salva solo le ultime 4 cifre della carta, mai il numero completo. Il collegamento diretto ai movimenti
        della banca si può aggiungere in futuro con le API del circuito o della banca (es. carte prepagate aziendali che offrono un'integrazione).
      </p>
    </div>
  )
}

function SchedaCarta({ c, admin }: { c: Carta; admin: boolean }) {
  const [modifica, setModifica] = useState(false)
  const elimina = useEliminaCarta()
  if (modifica) return <Card className="p-5"><ModuloCarta c={c} onFatto={() => setModifica(false)} /></Card>

  return (
    <div className={cn('rounded-xl p-5 flex flex-col gap-6 text-white', c.attiva ? 'bg-gradient-to-br from-accento-scuro to-accento' : 'bg-tenue')}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-[16px]">{c.nome}</p>
          <p className="text-xs text-white/75">{c.circuito ?? 'Carta'}{!c.attiva && ', disattivata'}</p>
        </div>
        <CreditCard className="size-6 text-accento-scuro" aria-hidden />
      </div>
      <p className="font-display text-2xl tracking-[0.2em]">···· {c.ultime_cifre}</p>
      <div className="flex justify-between items-end gap-2">
        <div>
          <p className="text-[11px] text-white/75">Assegnata a</p>
          <p className="font-semibold">{c.operatore?.nome ?? 'Nessuno'}</p>
        </div>
        {admin && (
          <div className="flex gap-1">
            <button aria-label="Modifica carta" onClick={() => setModifica(true)} className="size-9 rounded-lg bg-white/10 flex items-center justify-center cursor-pointer">
              <Pencil className="size-4" aria-hidden />
            </button>
            <button aria-label="Elimina carta" onClick={() => confirm(`Eliminare ${c.nome}?`) && elimina.mutate(c.id)} className="size-9 rounded-lg bg-white/10 flex items-center justify-center cursor-pointer">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ModuloCarta({ c, onFatto }: { c?: Carta; onFatto: () => void }) {
  const salva = useSalvaCarta()
  const operatori = useOperatori()
  const [nome, setNome] = useState(c?.nome ?? '')
  const [cifre, setCifre] = useState(c?.ultime_cifre ?? '')
  const [circuito, setCircuito] = useState(c?.circuito ?? 'Visa')
  const [operatoreId, setOperatoreId] = useState(c?.operatore_id ?? '')
  const [attiva, setAttiva] = useState(c?.attiva ?? true)

  return (
    <form className="flex flex-col gap-3.5" onSubmit={(e) => {
      e.preventDefault()
      salva.mutate({ id: c?.id, nome, ultime_cifre: cifre, circuito, operatore_id: operatoreId || null, attiva }, { onSuccess: onFatto })
    }}>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <Campo etichetta="Nome carta" required placeholder="Carta Toscana 1" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Campo etichetta="Ultime 4 cifre" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={cifre}
          onChange={(e) => setCifre(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        <Selezione etichetta="Circuito" value={circuito} onChange={(e) => setCircuito(e.target.value)}>
          {['Visa', 'Mastercard', 'American Express', 'Altro'].map((x) => <option key={x}>{x}</option>)}
        </Selezione>
        <Selezione etichetta="Assegnata a" value={operatoreId} onChange={(e) => setOperatoreId(e.target.value)}>
          <option value="">— Nessuno —</option>
          {operatori.data?.filter((o) => o.attivo).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </Selezione>
        <Selezione etichetta="Stato" value={attiva ? 'si' : 'no'} onChange={(e) => setAttiva(e.target.value === 'si')}>
          <option value="si">Attiva</option>
          <option value="no">Disattivata</option>
        </Selezione>
      </div>
      {salva.error && <Errore errore={salva.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={salva.isPending}>Salva</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}

/** Spese pagate con le carte nel mese: da confrontare con l'estratto conto */
function Movimenti() {
  const [mese, setMese] = useState(meseCorrente())
  const movimenti = useMovimentiCarte(mese)
  const totale = (movimenti.data ?? []).filter((m) => m.stato !== 'respinto').reduce((s, m) => s + Number(m.importo ?? 0), 0)

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <TitoloSezione>Spese con carta aziendale</TitoloSezione>
          <p className="text-sm text-tenue">Totale del mese: <strong className="text-inchiostro">{euro(totale)}</strong></p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-tenue">
          Mese
          <input type="month" value={mese} onChange={(e) => setMese(e.target.value)} className="h-11 rounded-lg border border-bordo-forte bg-superficie px-3 text-[15px]" />
        </label>
      </div>
      {movimenti.isPending ? <Caricamento className="py-6" /> : movimenti.error ? <Errore errore={movimenti.error} /> : !movimenti.data.length ? (
        <p className="text-sm text-tenue py-2">Nessuna spesa con carta in questo mese.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-tenue border-b border-bordo">
                {['Data', 'Carta', 'Operatore', 'Spesa', 'Evento', 'Importo', 'Stato'].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {movimenti.data.map((m) => (
                <tr key={m.id} className="border-b border-bordo last:border-0">
                  <td className="px-3 py-2.5 whitespace-nowrap">{dataBreve(m.creato_il)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{m.carta ? `${m.carta.nome} ****${m.carta.ultime_cifre}` : '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{m.operatore?.nome ?? '—'}</td>
                  <td className="px-3 py-2.5">{etichettaCategoria(m.categoria)}{m.descrizione && <span className="text-tenue">, {m.descrizione}</span>}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {m.evento ? <Link className="hover:underline" to={`/gestione/eventi/${m.evento.id}`}>{m.evento.citta}, {dataBreve(m.evento.allestimento_il)}</Link> : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{euro(m.importo)}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{m.stato === 'approvato' ? 'Approvata' : m.stato === 'respinto' ? 'Respinta' : 'Da approvare'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
