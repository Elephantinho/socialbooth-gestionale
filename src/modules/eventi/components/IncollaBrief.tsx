import { useState } from 'react'
import { ClipboardPaste, Sparkles, X } from 'lucide-react'
import { leggiBrief, type BriefLetto, type Riconosciuto } from '../logic/brief'
import { Pulsante } from '@/shared/ui/Pulsante'

/**
 * Incolla il messaggio del cliente (WhatsApp, email…): i campi dell'evento si compilano da soli.
 * Poi si controlla e si corregge nel modulo.
 */
export function IncollaBrief({ tipi, clienti, onCompila }: {
  tipi: { id: string; nome: string }[]
  clienti: { id: string; nome: string }[]
  onCompila: (dati: BriefLetto) => void
}) {
  const [testo, setTesto] = useState('')
  const [letti, setLetti] = useState<Riconosciuto[]>()

  function compila() {
    const { dati, riconosciuti } = leggiBrief(testo, { tipi, clienti })
    onCompila(dati)
    setLetti(riconosciuti)
  }

  return (
    <section className="rounded-xl border-2 border-dashed border-accento/40 bg-accento-tenue/40 p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-lg bg-accento text-white flex items-center justify-center shrink-0"><ClipboardPaste className="size-5" aria-hidden /></div>
        <div>
          <h2 className="font-semibold">Hai il brief del cliente?</h2>
          <p className="text-sm text-tenue">Incollalo qui: data, orari, indirizzo, referente e note si compilano da soli. Poi controlli.</p>
        </div>
      </div>
      <textarea value={testo} onChange={(e) => { setTesto(e.target.value); setLetti(undefined) }} rows={testo ? 7 : 3}
        aria-label="Testo del brief"
        placeholder={'Es.\nPHOTOBOOTH 28/10 Firenze\nVia Gusciana 27\nAllestimento 17:30, evento 19-23\nReferente Marco 333 1234567'}
        className="w-full rounded-xl border border-bordo-forte bg-superficie px-4 py-3 text-sm leading-relaxed resize-y" />
      <div className="flex flex-wrap items-center gap-2">
        <Pulsante type="button" icona={<Sparkles className="size-4" aria-hidden />} disabled={testo.trim().length < 10} onClick={compila}>Compila il modulo</Pulsante>
        {testo && <Pulsante type="button" variante="fantasma" icona={<X className="size-4" aria-hidden />} onClick={() => { setTesto(''); setLetti(undefined) }}>Svuota</Pulsante>}
      </div>
      {letti && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{letti.length ? `Ho trovato ${letti.length} informazioni: controlla qui sotto.` : 'Non ho riconosciuto niente: compila a mano.'}</p>
          <div className="flex flex-wrap gap-1.5">
            {letti.filter((l) => l.campo !== 'note' && l.campo !== 'noteAccesso').map((l) => (
              <span key={l.campo} className="text-xs rounded-full bg-superficie border border-bordo px-2.5 py-1">
                <span className="text-tenue">{l.etichetta}:</span> <strong>{l.valore}</strong>
              </span>
            ))}
            {letti.some((l) => l.campo === 'note' || l.campo === 'noteAccesso') && (
              <span className="text-xs rounded-full bg-superficie border border-bordo px-2.5 py-1 text-tenue">il resto è nelle note</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
