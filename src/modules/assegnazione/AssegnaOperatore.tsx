import { Check } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { useOperatoriDisponibili, useProponiOperatore } from '@/modules/eventi/api'
import { nomeCompleto } from '@/shared/lib/formato'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore } from '@/shared/ui/Stati'

/**
 * Elenco degli operatori liberi per un evento, con il pulsante per proporlo.
 * Usato quando l'assegnazione automatica non basta (più operatori in zona, o nessuno).
 */
export function AssegnaOperatore({ eventoId, onFatto }: { eventoId: string; onFatto?: () => void }) {
  const disponibili = useOperatoriDisponibili(eventoId)
  const proponi = useProponiOperatore()

  if (disponibili.isPending) return <Caricamento className="py-6" />
  if (disponibili.error) return <Errore errore={disponibili.error} />

  if (!disponibili.data.length) {
    return (
      <p className="text-sm text-tenue py-2">
        Nessun operatore libero in questa regione per quella data. Controlla le zone degli operatori o cambia data.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {proponi.error && <Errore errore={proponi.error} />}
      {disponibili.data.map((op) => (
        <div key={op.id} className="flex items-center gap-3 rounded-xl border border-bordo bg-superficie p-3">
          <Avatar nome={nomeCompleto(op)} foto={op.foto} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{nomeCompleto(op)}</p>
            <p className="text-xs text-tenue">Libero in quella data</p>
          </div>
          <Pulsante
            taglia="md"
            icona={<Check className="size-4" aria-hidden />}
            caricamento={proponi.isPending && proponi.variables?.operatoreId === op.id}
            disabled={proponi.isPending}
            onClick={() => proponi.mutate({ eventoId, operatoreId: op.id }, { onSuccess: onFatto })}
          >
            Proponi
          </Pulsante>
        </div>
      ))}
    </div>
  )
}
