import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useAuth } from './sessione'
import { entratoCome, tornaAdmin } from './entraCome'

/** Sempre visibile (in basso a destra) mentre l'admin usa l'app come un altro utente, con il pulsante per tornare */
export function BarraEntraCome() {
  const { sessione } = useAuth()
  const [torno, setTorno] = useState(false)
  const come = entratoCome(sessione?.user.id)
  if (!come) return null

  return (
    <div role="status" className="fixed z-50 right-3 bottom-20 lg:bottom-4 max-w-[calc(100vw-1.5rem)] w-80 rounded-xl bg-urgente text-white p-3 flex flex-col gap-2 text-sm shadow-lg">
      <p className="flex items-start gap-2">
        <Eye className="size-4 shrink-0 mt-0.5" aria-hidden />
        <span><span className="font-semibold">Stai usando l'app come {come.nome}.</span> Quello che fai vale davvero, come se lo facesse questa persona.</span>
      </p>
      <button onClick={() => { setTorno(true); void tornaAdmin() }} disabled={torno}
        className="h-9 px-3 rounded-lg bg-white text-urgente-testo font-semibold whitespace-nowrap cursor-pointer disabled:opacity-60">
        {torno ? 'Torno…' : 'Torna al tuo account'}
      </button>
    </div>
  )
}
