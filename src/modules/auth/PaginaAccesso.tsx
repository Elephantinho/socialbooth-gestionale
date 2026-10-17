import { BRAND } from '@/shared/brand'
import { Logo } from '@/shared/ui/Logo'

/** Accesso e registrazione: modulo al centro sullo stesso fondo scuro del menu. */
export function PaginaAccesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-menu text-white flex flex-col items-center px-5 py-10 sm:justify-center">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Logo chiaro sottotitolo={BRAND.prodotto} />
        <main className="rounded-xl bg-superficie text-inchiostro p-6 sm:p-7 flex flex-col gap-6">{children}</main>
        <p className="text-xs text-menu-tenue">
          {BRAND.societa}, <a href={BRAND.sito} target="_blank" rel="noreferrer" className="underline hover:text-white">socialbooth.it</a>
        </p>
      </div>
    </div>
  )
}
