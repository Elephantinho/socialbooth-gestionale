import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAggiornaEvento } from '@/modules/eventi/api'
import { minutiInLocationPrevisti, minutiViaggioPagati } from '@/modules/eventi/logic/orari'
import type { EventoGestioneCompleto } from '@/modules/eventi/types'
import { useAggiornaCosto, useAggiungiCosto, useCarte, useCostiEvento, useEliminaCosto } from '../api'
import { CATEGORIE_COSTO, PAGAMENTI, etichettaCategoria, etichettaPagamento } from '../costanti'
import { riepilogoEconomico } from '../logic/riepilogo'
import { euro } from '@/shared/lib/formato'
import { apriFile } from '@/modules/comunicazione/api'
import { cn } from '@/shared/lib/cn'
import type { Enum } from '@/shared/types/database'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

const numero = (s: string) => Number(s.replace(',', '.')) || 0

/** Preventivo e consuntivo dell'evento, ricavo, fattura e margine. */
export function CostiEvento({ e }: { e: EventoGestioneCompleto }) {
  const costi = useCostiEvento(e.id)
  const [aggiungi, setAggiungi] = useState(false)

  if (costi.isPending) return <Card className="p-5"><Caricamento className="py-6" /></Card>
  if (costi.error) return <Errore errore={costi.error} />

  const oreChiuse = e.ore.find((o) => o.check_out_il && o.stato !== 'respinto')
  const r = riepilogoEconomico({
    costi: costi.data,
    minutiPrevisti: minutiInLocationPrevisti(e.allestimento_il, e.smontaggio_il) + minutiViaggioPagati(e.viaggio_minuti),
    tariffa: e.operatore?.tariffa_oraria ?? null,
    compensoFinale: oreChiuse?.compenso ?? null,
    ricavo: e.fattura_importo ?? e.prezzo_cliente ?? null,
  })

  return (
    <Card className="p-5 md:p-6 flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <TitoloSezione>Costi e margine</TitoloSezione>
          <p className="text-sm text-tenue mt-0.5">Compenso dell'operatore e carta si calcolano da soli. Aggiungi solo gli extra.</p>
        </div>
        {!aggiungi && <Pulsante variante="secondario" icona={<Plus className="size-4" aria-hidden />} onClick={() => setAggiungi(true)}>Aggiungi extra</Pulsante>}
      </div>

      {aggiungi && <NuovoCosto eventoId={e.id} fase={['in_corso', 'completato'].includes(e.stato) ? 'finale' : 'previsto'} onFatto={() => setAggiungi(false)} />}

      {/* Tabella previsto / finale */}
      <div className="overflow-x-auto rounded-2xl border border-bordo">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sfondo text-left text-xs text-tenue">
              <th className="px-4 py-2.5 font-bold">Voce</th>
              <th className="px-4 py-2.5 font-bold text-right">Previsto</th>
              <th className="px-4 py-2.5 font-bold text-right">Finale</th>
            </tr>
          </thead>
          <tbody>
            <Riga voce={`Operatore${e.operatore?.tariffa_oraria == null ? ' (tariffa mancante)' : ''}`} previsto={r.operatoriPrevisto} finale={r.operatoriFinale} />
            {r.perCategoria.map((c) => <Riga key={c.categoria} voce={etichettaCategoria(c.categoria)} previsto={c.previsto} finale={c.finale} />)}
            <tr className="border-t-2 border-inchiostro font-bold">
              <td className="px-4 py-3">Totale costi</td>
              <td className="px-4 py-3 text-right">{euro(r.totalePrevisto)}</td>
              <td className="px-4 py-3 text-right">{euro(r.totaleFinale)}</td>
            </tr>
            <tr className="font-bold">
              <td className="px-4 py-3">Ricavo</td>
              <td className="px-4 py-3 text-right" colSpan={2}>{r.ricavo == null ? <span className="text-tenue font-semibold">da inserire</span> : euro(r.ricavo)}</td>
            </tr>
            <tr className="bg-inchiostro text-white font-bold">
              <td className="px-4 py-3">Margine</td>
              <td className={cn('px-4 py-3 text-right', (r.marginePrevisto ?? 0) < 0 && 'text-[#FF9C7A]')}>{r.marginePrevisto == null ? '—' : euro(r.marginePrevisto)}</td>
              <td className={cn('px-4 py-3 text-right', (r.margineFinale ?? 0) < 0 && 'text-[#FF9C7A]')}>{r.margineFinale == null ? '—' : euro(r.margineFinale)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {costi.data.length > 0 && (
        <details className="group flex flex-col gap-2" open={costi.data.some((c) => c.stato === 'inviato' || Number(c.costo_unitario) === 0)}>
          <summary className="text-sm font-bold cursor-pointer select-none mb-2">Dettaglio voci · {costi.data.length}</summary>
          <div className="flex flex-col gap-2">{costi.data.map((c) => <VoceCosto key={c.id} c={c} />)}</div>
        </details>
      )}

      <RicavoFattura e={e} />
    </Card>
  )
}

function Riga({ voce, previsto, finale }: { voce: string; previsto: number; finale: number | null }) {
  return (
    <tr className="border-t border-bordo">
      <td className="px-4 py-2.5 font-semibold">{voce}</td>
      <td className="px-4 py-2.5 text-right">{euro(previsto)}</td>
      <td className="px-4 py-2.5 text-right">{finale == null ? <span className="text-tenue">—</span> : euro(finale)}</td>
    </tr>
  )
}

type Voce = NonNullable<ReturnType<typeof useCostiEvento>['data']>[number]

function VoceCosto({ c }: { c: Voce }) {
  const elimina = useEliminaCosto()
  const aggiorna = useAggiornaCosto()
  const [prezzo, setPrezzo] = useState('')
  const senzaPrezzo = Number(c.costo_unitario) === 0

  return (
    <div className={cn('rounded-xl border border-bordo p-3 flex flex-wrap items-center gap-3', c.stato === 'respinto' && 'opacity-50')}>
      <span className={cn('text-[11px] font-bold uppercase px-2 py-1 rounded-md', c.fase === 'previsto' ? 'bg-sfondo text-tenue' : 'bg-accento-tenue text-accento-scuro')}>
        {c.fase}
      </span>
      <div className="flex-[1_1_200px] min-w-0">
        <p className="font-semibold text-sm">{etichettaCategoria(c.categoria)}{c.descrizione && <span className="text-tenue font-medium"> · {c.descrizione}</span>}</p>
        <p className="text-xs text-tenue">
          {Number(c.quantita) !== 1 && `${Number(c.quantita)} × ${euro(Number(c.costo_unitario))} · `}
          {etichettaPagamento(c.pagato_con)}{c.carta && ` (${c.carta.nome} ···· ${c.carta.ultime_cifre})`}
          {c.operatore?.nome && ` · ${c.operatore.nome}`}
          {c.stato === 'inviato' && c.operatore_id && <span className="text-avviso-testo font-bold"> · da approvare</span>}
          {c.scontrino && <> · <button type="button" onClick={() => apriFile(c.scontrino!)} className="font-bold text-accento underline cursor-pointer">vedi scontrino</button></>}
        </p>
      </div>
      {senzaPrezzo ? (
        <form className="flex gap-1.5 items-center" onSubmit={(ev) => { ev.preventDefault(); aggiorna.mutate({ id: c.id, modifiche: { costo_unitario: numero(prezzo) } }) }}>
          <input aria-label="Prezzo unitario" placeholder="€ cad." inputMode="decimal" value={prezzo} onChange={(ev) => setPrezzo(ev.target.value)}
            className="h-9 w-24 rounded-lg border border-bordo-forte px-2 text-sm" />
          <Pulsante type="submit" caricamento={aggiorna.isPending}>OK</Pulsante>
        </form>
      ) : (
        <p className="font-bold">{euro(c.importo)}</p>
      )}
      <button aria-label="Elimina voce" onClick={() => confirm('Eliminare questa voce?') && elimina.mutate(c.id)}
        className="size-9 rounded-lg flex items-center justify-center text-tenue hover:bg-sfondo cursor-pointer">
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  )
}

/** Un costo extra: previsto prima dell'evento, finale da quando è iniziato */
function NuovoCosto({ eventoId, fase, onFatto }: { eventoId: string; fase: Enum<'fase_costo'>; onFatto: () => void }) {
  const aggiungi = useAggiungiCosto()
  const carte = useCarte()
  const [categoria, setCategoria] = useState<Enum<'categoria_costo'>>('noleggio_veicolo')
  const [descrizione, setDescrizione] = useState('')
  const [quantita, setQuantita] = useState('1')
  const [unitario, setUnitario] = useState('')
  const [pagato, setPagato] = useState<Enum<'pagamento'>>('azienda')
  const [cartaId, setCartaId] = useState('')
  const unita = CATEGORIE_COSTO.find((c) => c.id === categoria)?.unita

  return (
    <form className="rounded-2xl bg-sfondo p-4 flex flex-col gap-3.5" onSubmit={(ev) => {
      ev.preventDefault()
      const carta = carte.data?.find((c) => c.id === cartaId)
      aggiungi.mutate({
        evento_id: eventoId, fase, categoria, descrizione: descrizione || null,
        quantita: numero(quantita) || 1, costo_unitario: numero(unitario),
        pagato_con: pagato, carta_id: pagato === 'carta_aziendale' ? cartaId || null : null,
        operatore_id: pagato === 'carta_aziendale' ? carta?.operatore_id ?? null : null,
        stato: 'approvato',
      }, { onSuccess: onFatto })
    }}>
      <p className="text-sm text-tenue">{fase === 'previsto' ? 'Costo previsto: entra nella previsione.' : 'Costo reale: entra nel consuntivo.'}</p>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
        <Selezione etichetta="Categoria" value={categoria} onChange={(ev) => setCategoria(ev.target.value as Enum<'categoria_costo'>)}>
          {CATEGORIE_COSTO.filter((c) => c.id !== 'carta_stampe').map((c) => <option key={c.id} value={c.id}>{c.etichetta}</option>)}
        </Selezione>
        <Campo etichetta="Descrizione" placeholder="Es. Furgone Hertz" value={descrizione} onChange={(ev) => setDescrizione(ev.target.value)} />
        <Campo etichetta={`Quantità${unita ? ` (${unita})` : ''}`} inputMode="decimal" value={quantita} onChange={(ev) => setQuantita(ev.target.value)} />
        <Campo etichetta="Costo unitario €" inputMode="decimal" required value={unitario} onChange={(ev) => setUnitario(ev.target.value)} />
        <Selezione etichetta="Pagato con" value={pagato} onChange={(ev) => setPagato(ev.target.value as Enum<'pagamento'>)}>
          {PAGAMENTI.map((p) => <option key={p.id} value={p.id}>{p.etichetta}</option>)}
        </Selezione>
        {pagato === 'carta_aziendale' && (
          <Selezione etichetta="Carta" value={cartaId} onChange={(ev) => setCartaId(ev.target.value)}>
            <option value="">— Scegli —</option>
            {carte.data?.map((c) => <option key={c.id} value={c.id}>{c.nome} ···· {c.ultime_cifre}</option>)}
          </Selezione>
        )}
      </div>
      {numero(unitario) > 0 && <p className="text-sm">Totale voce: <strong>{euro((numero(quantita) || 1) * numero(unitario))}</strong></p>}
      {aggiungi.error && <Errore errore={aggiungi.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={aggiungi.isPending}>Aggiungi</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}

function RicavoFattura({ e }: { e: EventoGestioneCompleto }) {
  const aggiorna = useAggiornaEvento()
  const [prezzo, setPrezzo] = useState(e.prezzo_cliente != null ? String(e.prezzo_cliente) : '')
  const [numeroFattura, setNumeroFattura] = useState(e.fattura_numero ?? '')
  const [data, setData] = useState(e.fattura_data ?? '')
  const [importo, setImporto] = useState(e.fattura_importo != null ? String(e.fattura_importo) : '')
  const [pagata, setPagata] = useState(e.fattura_pagata)
  const [salvato, setSalvato] = useState(false)

  return (
    <form className="flex flex-col gap-3.5 border-t border-bordo pt-5" onSubmit={(ev) => {
      ev.preventDefault()
      setSalvato(false)
      aggiorna.mutate({
        id: e.id,
        modifiche: {
          prezzo_cliente: prezzo ? numero(prezzo) : null, fattura_numero: numeroFattura || null,
          fattura_data: data || null, fattura_importo: importo ? numero(importo) : null, fattura_pagata: pagata,
        },
      }, { onSuccess: () => setSalvato(true) })
    }}>
      <p className="text-sm font-bold">Ricavo e fattura al cliente</p>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        <Campo etichetta="Prezzo concordato €" inputMode="decimal" value={prezzo} onChange={(ev) => setPrezzo(ev.target.value)} />
        <Campo etichetta="N° fattura" value={numeroFattura} onChange={(ev) => setNumeroFattura(ev.target.value)} />
        <Campo etichetta="Data fattura" type="date" value={data} onChange={(ev) => setData(ev.target.value)} />
        <Campo etichetta="Importo fattura €" inputMode="decimal" value={importo} onChange={(ev) => setImporto(ev.target.value)} />
      </div>
      <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
        <input type="checkbox" className="size-5 accent-accento" checked={pagata} onChange={(ev) => setPagata(ev.target.checked)} />
        Fattura incassata
      </label>
      {aggiorna.error && <Errore errore={aggiorna.error} />}
      <div className="flex items-center gap-3">
        <Pulsante type="submit" variante="scuro" caricamento={aggiorna.isPending}>Salva ricavo</Pulsante>
        {salvato && <span className="text-sm font-bold text-accento" role="status">Salvato</span>}
      </div>
      <p className="text-xs text-tenue">Il margine usa l'importo della fattura se c'è, altrimenti il prezzo concordato.</p>
    </form>
  )
}
