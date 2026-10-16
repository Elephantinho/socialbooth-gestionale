import { motion } from 'framer-motion'
import { BRAND } from '@/shared/brand'
import { Logo } from '@/shared/ui/Logo'

/** Impaginazione di accesso e registrazione: marchio a sinistra (da computer), modulo a destra */
export function PaginaAccesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(420px,5fr)_7fr]">
      <aside className="hidden lg:flex flex-col justify-between bg-inchiostro text-white p-12 relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full border-[40px] border-marchio/25" aria-hidden />
        <div className="absolute right-16 bottom-56 size-10 rounded-full bg-marchio/60" aria-hidden />
        <Logo chiaro taglia="lg" sottotitolo={BRAND.prodotto} />
        <div className="relative flex flex-col gap-5 max-w-md">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accento-chiaro">{BRAND.payoff}</p>
          <h2 className="font-display text-[40px] font-bold leading-[1.05] tracking-tight">
            Ogni evento, dall'incarico allo scatto. In un posto solo.
          </h2>
          <div className="flex flex-wrap gap-2">
            {BRAND.linee.map((l) => (
              <span key={l} className="text-xs font-bold px-3 py-1.5 rounded-full bg-scuro-2 text-[#DADBE0]">{l}</span>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-su-scuro-tenue flex flex-col gap-1">
          <p>{BRAND.citta.join(' · ')}</p>
          <p>© {new Date().getFullYear()} {BRAND.societa} · <a href={BRAND.sito} target="_blank" rel="noreferrer" className="underline hover:text-white">socialbooth.it</a></p>
        </div>
      </aside>

      <main className="min-h-dvh flex justify-center items-start lg:items-center px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm flex flex-col gap-7">
          <Logo className="lg:hidden" sottotitolo={BRAND.prodotto} />
          {children}
        </motion.div>
      </main>
    </div>
  )
}
