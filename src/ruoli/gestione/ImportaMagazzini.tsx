import { useState } from 'react'
import { FileUp } from 'lucide-react'
import { useSalvaMagazzino } from '@/modules/anagrafiche/api'
import { magazziniDaCsv, MODELLO_MAGAZZINI, type MagazzinoDaImportare } from '@/modules/anagrafiche/logic/importaCsv'
import { trovaCoordinate } from '@/modules/viaggio/api'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'

/**
 * Importa tanti magazzini da un file Excel salvato come CSV.
 * Per ognuno cerca la posizione (serve per i tempi di viaggio): circa 1 secondo a magazzino.
 */
export function ImportaMagazzini({ onFatto }: { onFatto: () => void }) {
  const salva = useSalvaMagazzino()
  const [righe, setRighe] = useState<MagazzinoDaImportare[]>([])
  const [fatti, setFatti] = useState(0)
  const [inCorso, setInCorso] = useState(false)
  const [problemi, setProblemi] = useState<string[]>([])

  const valide = righe.filter((r) => r.nome && r.indirizzo && r.citta && r.regione)
  const scartate = righe.filter((r) => !valide.includes(r))

  async function leggi(file: File) {
    setRighe(magazziniDaCsv(await file.text()))
    setFatti(0)
    setProblemi([])
  }

  async function importa() {
    setInCorso(true)
    const errori: string[] = []
    for (const [i, m] of valide.entries()) {
      const punto = await trovaCoordinate(m.indirizzo, m.citta).catch(() => null)
      if (!punto) errori.push(`${m.nome}: indirizzo non trovato (salvato senza posizione)`)
      try {
        await salva.mutateAsync({ nome: m.nome, indirizzo: m.indirizzo, citta: m.citta, regione: m.regione!, lat: punto?.lat ?? null, lng: punto?.lng ?? null })
      } catch (err) {
        errori.push(`${m.nome}: ${err instanceof Error ? err.message : 'errore'}`)
      }
      setFatti(i + 1)
      await new Promise((r) => setTimeout(r, 1100)) // rispetta i limiti del servizio mappe gratuito
    }
    setProblemi(errori)
    setInCorso(false)
  }

  function scaricaModello() {
    const url = URL.createObjectURL(new Blob([MODELLO_MAGAZZINI], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'modello-magazzini.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const finito = !inCorso && fatti > 0 && fatti === valide.length

  return (
    <Card className="p-5 flex flex-col gap-4">
      <TitoloSezione>Importa magazzini da Excel</TitoloSezione>
      <p className="text-sm text-tenue">
        Prepara un foglio con le colonne <strong className="text-inchiostro">nome, indirizzo, città, regione</strong> e salvalo
        come CSV (in Excel: File → Salva con nome → CSV). Puoi partire dal modello.
      </p>
      <div className="flex flex-wrap gap-2">
        <Pulsante variante="secondario" onClick={scaricaModello}>Scarica modello</Pulsante>
        <label className="h-11 px-4 rounded-lg bg-accento text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
          <FileUp className="size-4" aria-hidden /> Scegli file CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && leggi(e.target.files[0])} />
        </label>
      </div>

      {righe.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm"><strong>{valide.length}</strong> magazzini pronti{scartate.length > 0 && <>, <strong className="text-urgente-testo">{scartate.length}</strong> da correggere</>}</p>
          {scartate.length > 0 && (
            <ul className="text-xs text-urgente-testo list-disc pl-5">
              {scartate.slice(0, 8).map((r) => <li key={r.riga}>Riga {r.riga}: {!r.regione ? 'regione non riconosciuta' : 'mancano dati'}</li>)}
            </ul>
          )}
          <div className="max-h-56 overflow-auto rounded-lg border border-bordo">
            <table className="w-full text-sm">
              <tbody>
                {valide.map((m, i) => (
                  <tr key={m.riga} className="border-b border-bordo last:border-0">
                    <td className="px-3 py-2 font-semibold">{m.nome}</td>
                    <td className="px-3 py-2 text-tenue">{m.indirizzo}, {m.citta}</td>
                    <td className="px-3 py-2">{m.regione}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold">{i < fatti ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {inCorso && <p className="text-sm font-semibold" role="status">Importo e cerco le posizioni… {fatti}/{valide.length}</p>}
          {problemi.length > 0 && (
            <ul className="text-xs text-avviso-testo bg-avviso rounded-lg p-3 list-disc pl-6">
              {problemi.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          <div className="flex gap-2">
            {!finito && <Pulsante onClick={importa} caricamento={inCorso} disabled={!valide.length}>Importa {valide.length} magazzini</Pulsante>}
            <Pulsante variante="secondario" onClick={onFatto} disabled={inCorso}>{finito ? 'Fatto' : 'Chiudi'}</Pulsante>
          </div>
        </div>
      )}
    </Card>
  )
}
