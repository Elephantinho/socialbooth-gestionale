import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useRiepilogoOperatore } from '../api'
import { BRAND } from '@/shared/brand'
import { dataBreve, durata, euro, nomeCompleto } from '@/shared/lib/formato'
import { etichettaMese } from '@/shared/lib/periodi'
import { Logo } from '@/shared/ui/Logo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/** Riepilogo mensile dell'operatore, impaginato per la stampa: "Salva come PDF" dal browser */
export function RiepilogoMese() {
  const { operatoreId = '', mese = '' } = useParams()
  const naviga = useNavigate()
  const { data, isPending, error } = useRiepilogoOperatore(operatoreId, mese)

  if (isPending) return <Caricamento className="min-h-dvh items-center" />
  if (error) return <div className="p-6"><Errore errore={error} /></div>

  const { profilo, ore, rimborsi } = data
  const minuti = ore.reduce((s, o) => s + (o.minuti_totali ?? 0), 0)
  const compensi = ore.reduce((s, o) => s + Number(o.compenso ?? 0), 0)
  const totRimborsi = rimborsi.reduce((s, r) => s + Number(r.importo ?? 0), 0)
  const inAttesa = ore.some((o) => o.stato === 'inviato') || rimborsi.some((r) => r.stato === 'inviato')

  return (
    <div className="min-h-dvh bg-sfondo print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-inchiostro text-white px-4 h-16 flex items-center justify-between gap-3">
        <button onClick={() => naviga(-1)} className="inline-flex items-center gap-1.5 text-sm font-bold cursor-pointer"><ArrowLeft className="size-4" aria-hidden /> Indietro</button>
        <Pulsante variante="chiaro" icona={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>Scarica PDF</Pulsante>
      </div>

      <article className="max-w-[800px] mx-auto bg-superficie my-6 print:my-0 p-8 md:p-12 print:p-0 rounded-[20px] print:rounded-none border border-bordo print:border-0 flex flex-col gap-8 text-[14px]">
        <header className="flex flex-wrap justify-between gap-4 items-start border-b-2 border-inchiostro pb-6">
          <Logo sottotitolo="Riepilogo mensile" />
          <div className="text-right">
            <p className="font-display text-2xl font-bold capitalize">{etichettaMese(mese)}</p>
            <p className="font-bold">{nomeCompleto(profilo)}</p>
            {profilo.telefono && <p className="text-tenue">{profilo.telefono}</p>}
          </div>
        </header>

        <section className="grid grid-cols-3 gap-4">
          {[['Eventi', String(ore.length)], ['Ore totali', durata(minuti)], ['Compensi', euro(compensi)]].map(([e, v]) => (
            <div key={e} className="rounded-xl bg-sfondo print:border print:border-bordo p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-tenue">{e}</p>
              <p className="font-display text-2xl font-bold mt-1">{v}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-bold text-[16px]">Eventi</h2>
          {!ore.length ? <p className="text-tenue">Nessun evento chiuso in questo mese.</p> : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-tenue border-b border-bordo">
                  <th className="py-2 font-bold">Data</th><th className="py-2 font-bold">Evento</th>
                  <th className="py-2 font-bold text-right">Location</th><th className="py-2 font-bold text-right">Viaggio</th>
                  <th className="py-2 font-bold text-right">Tariffa</th><th className="py-2 font-bold text-right">Compenso</th>
                </tr>
              </thead>
              <tbody>
                {ore.map((o) => (
                  <tr key={o.id} className="border-b border-bordo/70 break-inside-avoid">
                    <td className="py-2 whitespace-nowrap">{dataBreve(o.evento!.allestimento_il)}</td>
                    <td className="py-2">{o.evento!.tipo_booth?.nome ?? 'Evento'} · {o.evento!.citta}{o.stato === 'inviato' && <span className="text-tenue"> (da approvare)</span>}</td>
                    <td className="py-2 text-right whitespace-nowrap">{durata(o.minuti_in_location)}</td>
                    <td className="py-2 text-right whitespace-nowrap">{durata(o.minuti_viaggio)}</td>
                    <td className="py-2 text-right whitespace-nowrap">{o.tariffa_oraria != null ? `${euro(o.tariffa_oraria)}/h` : '—'}</td>
                    <td className="py-2 text-right whitespace-nowrap font-bold">{euro(o.compenso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {rimborsi.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-[16px]">Spese anticipate da rimborsare</h2>
            <table className="w-full">
              <tbody>
                {rimborsi.map((r) => (
                  <tr key={r.id} className="border-b border-bordo/70">
                    <td className="py-2 whitespace-nowrap">{dataBreve(r.evento!.allestimento_il)}</td>
                    <td className="py-2">{r.descrizione || r.categoria} · {r.evento!.citta}{r.stato === 'inviato' && <span className="text-tenue"> (da approvare)</span>}</td>
                    <td className="py-2 text-right font-bold">{euro(r.importo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="rounded-xl bg-inchiostro text-white print:bg-white print:text-inchiostro print:border-2 print:border-inchiostro p-5 flex justify-between items-center">
          <div>
            <p className="font-bold">Totale del mese</p>
            <p className="text-sm opacity-80">Compensi {euro(compensi)}{totRimborsi ? ` + rimborsi ${euro(totRimborsi)}` : ''}</p>
          </div>
          <p className="font-display text-3xl font-bold">{euro(compensi + totRimborsi)}</p>
        </section>

        {inAttesa && <p className="text-xs text-tenue">Alcune voci sono ancora da approvare: il totale può cambiare.</p>}
        <footer className="text-[11px] text-tenue border-t border-bordo pt-4">
          {BRAND.nome} · {BRAND.societa} · generato il {new Date().toLocaleDateString('it-IT')}
        </footer>
      </article>
    </div>
  )
}
