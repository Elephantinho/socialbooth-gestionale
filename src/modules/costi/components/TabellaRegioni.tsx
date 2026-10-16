import { useEconomiaMese } from '../api'
import { contiPerRegione } from '../logic/perRegione'
import { euro } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/** Ricavi, compensi, costi e margine del mese divisi per regione */
export function TabellaRegioni({ mese }: { mese: string }) {
  const { data, isPending, error } = useEconomiaMese(mese)
  if (isPending) return <Card className="p-5"><Caricamento className="py-6" /></Card>
  if (error) return <Errore errore={error} />

  const righe = contiPerRegione(data)
  const totale = righe.reduce((t, r) => ({
    eventi: t.eventi + r.eventi, ricavi: t.ricavi + r.ricavi, compensi: t.compensi + r.compensi, rimborsi: t.rimborsi + r.rimborsi,
    altriCosti: t.altriCosti + r.altriCosti, costiTotali: t.costiTotali + r.costiTotali, margine: t.margine + r.margine,
  }), { eventi: 0, ricavi: 0, compensi: 0, rimborsi: 0, altriCosti: 0, costiTotali: 0, margine: 0 })
  const colonne = ['Regione', 'Eventi', 'Ricavi', 'Compensi', 'Altri costi', 'di cui rimborsi', 'Costi totali', 'Margine']

  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-bordo">
        <TitoloSezione>Per regione</TitoloSezione>
        <p className="text-sm text-tenue mt-1">Eventi chiusi con i valori finali, gli altri con quelli previsti.</p>
      </div>
      {!righe.length ? <p className="p-5 text-sm text-tenue">Nessun evento in questo mese.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-tenue bg-sfondo">
                {colonne.map((c, i) => <th key={c} className={cn('px-4 py-3 font-bold whitespace-nowrap', i > 0 && 'text-right')}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.regione} className="border-t border-bordo">
                  <td className="px-4 py-3 font-bold">{r.regione}</td>
                  <td className="px-4 py-3 text-right">{r.eventi}</td>
                  <td className="px-4 py-3 text-right font-semibold">{euro(r.ricavi)}</td>
                  <td className="px-4 py-3 text-right">{euro(r.compensi)}</td>
                  <td className="px-4 py-3 text-right">{euro(r.altriCosti)}</td>
                  <td className="px-4 py-3 text-right text-tenue">{euro(r.rimborsi)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{euro(r.costiTotali)}</td>
                  <td className={cn('px-4 py-3 text-right font-bold', r.margine < 0 ? 'text-urgente-testo' : 'text-accento')}>{euro(r.margine)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-inchiostro bg-inchiostro text-white font-bold">
                <td className="px-4 py-3">Totale</td>
                <td className="px-4 py-3 text-right">{totale.eventi}</td>
                <td className="px-4 py-3 text-right">{euro(totale.ricavi)}</td>
                <td className="px-4 py-3 text-right">{euro(totale.compensi)}</td>
                <td className="px-4 py-3 text-right">{euro(totale.altriCosti)}</td>
                <td className="px-4 py-3 text-right">{euro(totale.rimborsi)}</td>
                <td className="px-4 py-3 text-right">{euro(totale.costiTotali)}</td>
                <td className={cn('px-4 py-3 text-right', totale.margine < 0 ? 'text-[#FF9C7A]' : 'text-accento-chiaro')}>{euro(totale.margine)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
