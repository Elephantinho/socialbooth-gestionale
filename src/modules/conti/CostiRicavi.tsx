import { useEffect, useState } from 'react'
import { Camera, Receipt, X } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Campo, Selezione, SiNo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'
import { apriScontrino, useAggiungiSpesa, useConti, useSalvaConti, useSpese, useTogliSpesa } from './api'
import { PAGATA_CON, VOCI, bilancio, etichettaVoce, euro, leggiImporto, type PagataCon, type Voce } from './conti'

/** Ricavo (prezzo e fattura), spese e margine di un evento. Solo per chi vede i soldi. */
export function CostiRicavi({ eventoId, operatoreId }: { eventoId: string; operatoreId: string | null }) {
  const conti = useConti(eventoId)
  const spese = useSpese(eventoId)
  if (conti.isPending || spese.isPending) return <Card className="p-5"><Caricamento /></Card>
  if (conti.error || spese.error) return <Card className="p-5"><Errore errore={conti.error ?? spese.error} /></Card>
  const b = bilancio(conti.data, spese.data)

  return (
    <Card className="p-5 md:p-6 flex flex-col gap-5">
      <TitoloSezione>Costi e ricavi</TitoloSezione>

      <div className="grid grid-cols-3 gap-2">
        <Cifra etichetta="Ricavo" valore={euro(b.ricavo)} nota={conti.data?.fattura_importo != null ? 'da fattura' : b.ricavo != null ? 'prezzo concordato' : 'da inserire'} />
        <Cifra etichetta="Costi" valore={euro(b.costi)} nota={`${spese.data.length} ${spese.data.length === 1 ? 'spesa' : 'spese'}`} />
        <Cifra etichetta="Margine" valore={euro(b.margine)} nota={b.percentuale != null ? `${b.percentuale}%` : undefined}
          tono={b.margine == null ? undefined : b.margine >= 0 ? 'ok' : 'male'} />
      </div>

      <Ricavo eventoId={eventoId} conti={conti.data} />
      <Spese eventoId={eventoId} operatoreId={operatoreId} spese={spese.data} />
    </Card>
  )
}

function Cifra({ etichetta, valore, nota, tono }: { etichetta: string; valore: string; nota?: string; tono?: 'ok' | 'male' }) {
  return (
    <div className={cn('rounded-xl border px-3 py-2.5', tono === 'ok' ? 'bg-ok-tenue border-ok/20' : tono === 'male' ? 'bg-urgente-tenue border-urgente/20' : 'bg-sfondo border-bordo')}>
      <p className="text-xs font-semibold text-tenue">{etichetta}</p>
      <p className={cn('text-lg font-semibold tabular-nums mt-0.5', tono === 'ok' && 'text-ok', tono === 'male' && 'text-urgente-testo')}>{valore}</p>
      {nota && <p className="text-xs text-tenue">{nota}</p>}
    </div>
  )
}

type Conti = NonNullable<ReturnType<typeof useConti>['data']>

function Ricavo({ eventoId, conti }: { eventoId: string; conti: Conti | null }) {
  const salva = useSalvaConti()
  const iniziale = () => ({
    prezzo: conti?.prezzo != null ? String(conti.prezzo).replace('.', ',') : '',
    numero: conti?.fattura_numero ?? '',
    data: conti?.fattura_data ?? '',
    importo: conti?.fattura_importo != null ? String(conti.fattura_importo).replace('.', ',') : '',
    incassata: conti?.incassata ?? false,
  })
  const [v, setV] = useState(iniziale)
  const [fatto, setFatto] = useState(false)
  useEffect(() => { setV(iniziale()) }, [conti]) // eslint-disable-line react-hooks/exhaustive-deps

  const prezzo = v.prezzo ? leggiImporto(v.prezzo) : null
  const importo = v.importo ? leggiImporto(v.importo) : null
  const sbagliato = (v.prezzo && prezzo == null) || (v.importo && importo == null)

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault()
      if (sbagliato) return
      setFatto(false)
      salva.mutate({ eventoId, modifiche: {
        prezzo, fattura_numero: v.numero.trim() || null, fattura_data: v.data || null, fattura_importo: importo, incassata: v.incassata,
      } }, { onSuccess: () => setFatto(true) })
    }}>
      <p className="text-sm font-semibold">Ricavo</p>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <Campo etichetta="Prezzo concordato (€)" inputMode="decimal" placeholder="1.200,00" value={v.prezzo} onChange={(e) => setV({ ...v, prezzo: e.target.value })} />
        <Campo etichetta="Fattura n." placeholder="12/2026" value={v.numero} onChange={(e) => setV({ ...v, numero: e.target.value })} />
        <Campo etichetta="Data fattura" type="date" value={v.data} onChange={(e) => setV({ ...v, data: e.target.value })} />
        <Campo etichetta="Importo fattura (€)" inputMode="decimal" placeholder="1.200,00" value={v.importo} onChange={(e) => setV({ ...v, importo: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="w-56"><SiNo etichetta="Incassata" valore={v.incassata} onChange={(x) => setV({ ...v, incassata: x })} /></div>
        <div className="flex items-center gap-3">
          {conti?.incassata_il && <span className="text-xs text-tenue">incassata il {new Date(conti.incassata_il).toLocaleDateString('it-IT')}</span>}
          <Pulsante type="submit" variante="secondario" caricamento={salva.isPending} disabled={!!sbagliato}>{fatto ? 'Salvato' : 'Salva ricavo'}</Pulsante>
        </div>
      </div>
      {sbagliato && <p className="text-sm text-urgente-testo">Controlla gli importi: scrivili come 1200 o 1.200,50</p>}
      {salva.error && <Errore errore={salva.error} />}
    </form>
  )
}

type Spesa = NonNullable<ReturnType<typeof useSpese>['data']>[number]

function Spese({ eventoId, operatoreId, spese }: { eventoId: string; operatoreId: string | null; spese: Spesa[] }) {
  const togli = useTogliSpesa()
  const [nuova, setNuova] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Spese</p>
        {!nuova && <Pulsante variante="secondario" onClick={() => setNuova(true)}>Aggiungi spesa</Pulsante>}
      </div>
      {nuova && <NuovaSpesa eventoId={eventoId} operatoreId={operatoreId} onFatto={() => setNuova(false)} />}
      {spese.length === 0 ? (
        <p className="text-sm text-tenue py-2">Nessuna spesa. Quelle che l'operatore segna dall'app compaiono qui.</p>
      ) : (
        <ul className="divide-y divide-bordo border border-bordo rounded-xl">
          {spese.map((s) => (
            <li key={s.id} className="px-3 py-2.5 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {etichettaVoce(s.voce)}{s.descrizione ? `, ${s.descrizione}` : ''}
                  {s.fonte === 'revolut' && <span className="ml-2 text-[11px] font-semibold text-tenue bg-sfondo border border-bordo rounded px-1.5 py-px align-middle">Revolut</span>}
                </p>
                <p className="text-xs text-tenue truncate">
                  {PAGATA_CON[s.pagata_con]}{s.operatore ? `, ${nomeCompleto(s.operatore)}` : ''}, {new Date(s.creato_il).toLocaleDateString('it-IT')}
                </p>
              </div>
              {s.scontrino && (
                <button onClick={() => apriScontrino(s.scontrino!)} title="Scontrino" aria-label="Apri lo scontrino"
                  className="size-8 rounded-lg text-tenue hover:text-inchiostro hover:bg-sfondo flex items-center justify-center cursor-pointer">
                  <Receipt className="size-4" aria-hidden />
                </button>
              )}
              <span className="font-semibold tabular-nums">{euro(s.importo)}</span>
              {s.fonte === 'revolut' ? <span className="size-8" aria-hidden /> : (
                <button onClick={() => { if (confirm('Togliere questa spesa?')) togli.mutate(s.id) }} title="Togli" aria-label="Togli la spesa"
                  className="size-8 rounded-lg text-tenue hover:text-urgente-testo hover:bg-urgente-tenue flex items-center justify-center cursor-pointer">
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {togli.error && <Errore errore={togli.error} />}
    </div>
  )
}

/** Modulo per una spesa: usato dall'ufficio e (in versione semplice) dall'operatore */
export function NuovaSpesa({ eventoId, operatoreId, onFatto, daOperatore }: {
  eventoId: string; operatoreId: string | null; onFatto: () => void; daOperatore?: boolean
}) {
  const profilo = useProfilo()
  const aggiungi = useAggiungiSpesa()
  const [voce, setVoce] = useState<Voce>('carburante')
  const [importo, setImporto] = useState('')
  const [pagataCon, setPagataCon] = useState<PagataCon>('carta_aziendale')
  const [descrizione, setDescrizione] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const valore = leggiImporto(importo)

  return (
    <form className="rounded-xl border border-bordo bg-sfondo/60 p-3 flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault()
      if (valore == null || valore <= 0) return
      aggiungi.mutate({
        eventoId, voce, importo: valore, pagataCon, descrizione, foto, autoreId: profilo.id,
        // Carta aziendale o di tasca: la spesa è dell'operatore dell'evento
        operatoreId: pagataCon === 'azienda' ? null : operatoreId,
      }, { onSuccess: onFatto })
    }}>
      <div className="grid gap-3 grid-cols-2">
        <Selezione etichetta="Cosa" value={voce} onChange={(e) => setVoce(e.target.value as Voce)}>
          {VOCI.map((x) => <option key={x.id} value={x.id}>{x.etichetta}</option>)}
        </Selezione>
        <Campo etichetta="Importo (€)" inputMode="decimal" required placeholder="45,50" value={importo} onChange={(e) => setImporto(e.target.value)} />
      </div>
      <Selezione etichetta="Pagata con" value={pagataCon} onChange={(e) => setPagataCon(e.target.value as PagataCon)}>
        <option value="carta_aziendale">{PAGATA_CON.carta_aziendale}</option>
        <option value="operatore">{daOperatore ? 'Di tasca mia' : PAGATA_CON.operatore}</option>
        {!daOperatore && <option value="azienda">{PAGATA_CON.azienda}</option>}
      </Selezione>
      <Campo etichetta="Nota (facoltativa)" placeholder="Pieno andata, casello A1…" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
      <label className="h-11 rounded-lg border border-dashed border-bordo-forte bg-superficie flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer hover:bg-sfondo">
        <Camera className="size-4" aria-hidden />
        {foto ? 'Foto dello scontrino pronta' : 'Foto dello scontrino'}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
      </label>
      {importo && valore == null && <p className="text-sm text-urgente-testo">Scrivi l'importo come 45 o 45,50</p>}
      {aggiungi.error && <Errore errore={aggiungi.error} />}
      <div className="flex gap-2 justify-end">
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
        <Pulsante type="submit" caricamento={aggiungi.isPending} disabled={valore == null}>Salva spesa</Pulsante>
      </div>
    </form>
  )
}

