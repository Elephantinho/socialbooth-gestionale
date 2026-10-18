import { cn } from '@/shared/lib/cn'

// Campi del form con etichetta sempre visibile: più chiari dei placeholder.

const stileInput =
  'w-full rounded-lg border border-bordo-forte bg-superficie px-3 text-[15px] text-inchiostro ' +
  'placeholder:text-tenue/70 focus:outline-none focus:border-accento focus:shadow-[inset_0_0_0_1px_var(--color-accento)]'

type Base = { etichetta: string; errore?: string; className?: string }

function Etichetta({ etichetta, errore, className, children }: Base & { children: React.ReactNode }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-[13px] font-medium text-tenue', className)}>
      {etichetta}
      {children}
      {errore && <span className="text-xs font-semibold text-urgente-testo">{errore}</span>}
    </label>
  )
}

export function Campo({ etichetta, errore, className, ...resto }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Etichetta etichetta={etichetta} errore={errore} className={className}>
      <input className={cn(stileInput, 'h-11', errore && 'border-urgente')} aria-invalid={!!errore} {...resto} />
    </Etichetta>
  )
}

export function AreaTesto({ etichetta, errore, className, ...resto }: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Etichetta etichetta={etichetta} errore={errore} className={className}>
      <textarea className={cn(stileInput, 'py-3 leading-relaxed resize-y min-h-24', errore && 'border-urgente')} aria-invalid={!!errore} {...resto} />
    </Etichetta>
  )
}

export function Selezione({ etichetta, errore, className, children, ...resto }: Base & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Etichetta etichetta={etichetta} errore={errore} className={className}>
      <select className={cn(stileInput, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%235E5F66%27 stroke-width=%272%27%3E%3Cpath d=%27m4 6 4 4 4-4%27/%3E%3C/svg%3E")] bg-no-repeat bg-[right_14px_center] pr-10', errore && 'border-urgente')} aria-invalid={!!errore} {...resto}>
        {children}
      </select>
    </Etichetta>
  )
}

/** Interruttore Sì/No a pillola, come nei mockup */
export function SiNo({ etichetta, valore, onChange, errore }: { etichetta: string; valore: boolean | null; onChange: (v: boolean) => void; errore?: string }) {
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={etichetta}>
      <span className="text-[13px] font-semibold text-tenue">{etichetta}</span>
      <div className={cn('flex rounded-lg bg-sfondo p-1', errore && 'ring-1 ring-urgente')}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={valore === v}
            onClick={() => onChange(v)}
            className={cn(
              'flex-1 h-10 rounded-md font-semibold text-sm transition cursor-pointer',
              valore === v ? 'bg-superficie text-inchiostro shadow-sm' : 'text-tenue hover:text-inchiostro',
            )}
          >
            {v ? 'Sì' : 'No'}
          </button>
        ))}
      </div>
      {errore && <span className="text-xs font-semibold text-urgente-testo">{errore}</span>}
    </div>
  )
}
