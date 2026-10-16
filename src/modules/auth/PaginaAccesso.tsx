import { BRAND } from '@/shared/brand'
import { Logo } from '@/shared/ui/Logo'

/**
 * Accesso e registrazione: a sinistra (da computer) la striscia del marchio, a destra il modulo.
 * La striscia richiama le strisce di foto che escono dal photobooth.
 */
export function PaginaAccesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(380px,5fr)_7fr] bg-superficie">
      <aside className="hidden lg:flex flex-col justify-between bg-evidenza border-r border-evidenza-bordo p-12">
        <Logo taglia="lg" sottotitolo={BRAND.prodotto} />
        <div className="flex gap-10 items-end">
          {/* Striscia fotografica: quattro scatti, come quelli che stampate agli eventi */}
          <div className="w-28 shrink-0 bg-white p-2 pb-6 shadow-[0_8px_24px_-12px_rgba(31,37,51,0.35)] flex flex-col gap-2 -rotate-3" aria-hidden>
            {['#BFE5DC', '#FFD7A8', '#0E7C6E', '#F6C9C1'].map((c) => <div key={c} className="aspect-square" style={{ background: c }} />)}
          </div>
          <div className="flex flex-col gap-4 max-w-sm">
            <h2 className="text-[34px] font-semibold leading-[1.1]">Eventi, operatori e magazzini di {BRAND.nome}.</h2>
            <p className="text-tenue">{BRAND.linee.join(', ')}.</p>
          </div>
        </div>
        <p className="text-xs text-tenue">
          {BRAND.societa}, <a href={BRAND.sito} target="_blank" rel="noreferrer" className="underline hover:text-inchiostro">socialbooth.it</a>
        </p>
      </aside>

      <main className="min-h-dvh flex justify-center items-start lg:items-center px-5 py-10 bg-sfondo lg:bg-superficie">
        <div className="w-full max-w-sm flex flex-col gap-7">
          <Logo className="lg:hidden" sottotitolo={BRAND.prodotto} />
          {children}
        </div>
      </main>
    </div>
  )
}
