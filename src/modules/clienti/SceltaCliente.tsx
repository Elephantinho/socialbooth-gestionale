import { useRef, useState } from 'react'
import { Building2, Plus, Search, User } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useClicFuori } from '@/shared/lib/clicFuori'
import { useClienti } from './api'
import { cercaClienti, identificativo } from './clienti'
import { ModuloCliente } from './ModuloCliente'

const MAX_RISULTATI = 8

/** Il cliente dell'evento: si cerca per nome, partita IVA o città, oppure si crea qui senza uscire */
export function SceltaCliente({ valore, onChange, errore }: { valore: string; onChange: (id: string) => void; errore?: string }) {
  const clienti = useClienti()
  const [testo, setTesto] = useState('')
  const [aperto, setAperto] = useState(false)
  const [nuovo, setNuovo] = useState(false)
  const [cambia, setCambia] = useState(false)
  const rif = useRef<HTMLDivElement>(null)
  useClicFuori(rif, aperto, () => setAperto(false))

  const scelto = clienti.data?.find((c) => c.id === valore)
  const trovati = cercaClienti(clienti.data ?? [], testo)

  if (nuovo) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-tenue">Nuovo cliente</span>
        <div className="rounded-xl border border-bordo-forte bg-sfondo/50 p-4">
          <ModuloCliente nomeIniziale={testo}
            onSalvato={(c) => { onChange(c.id); setNuovo(false); setCambia(false); setTesto('') }}
            onAnnulla={() => setNuovo(false)} />
        </div>
      </div>
    )
  }

  if (scelto && !cambia) {
    const Icona = scelto.tipo === 'privato' ? User : Building2
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-tenue">Cliente</span>
        <div className="flex items-center gap-3 rounded-lg border border-bordo-forte bg-superficie px-3 py-2.5">
          <Icona className="size-5 text-tenue shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{scelto.nome}</p>
            <p className="text-sm text-tenue truncate">{[identificativo(scelto), scelto.citta].filter(Boolean).join(', ')}</p>
          </div>
          <button type="button" onClick={() => { setCambia(true); setAperto(true) }} className="text-sm font-semibold text-tenue hover:text-inchiostro cursor-pointer">Cambia</button>
        </div>
      </div>
    )
  }

  return (
    <div ref={rif} className="relative flex flex-col gap-1.5 text-[13px] font-medium text-tenue">
      <label htmlFor="cerca-cliente">Cliente</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] pointer-events-none" aria-hidden />
        <input id="cerca-cliente" value={testo} autoComplete="off" placeholder="Cerca per nome, partita IVA o città"
          onChange={(e) => { setTesto(e.target.value); setAperto(true) }} onFocus={() => setAperto(true)}
          className={cn('w-full h-11 rounded-lg border bg-superficie pl-10 pr-3 text-[15px] text-inchiostro placeholder:text-tenue/60 focus:outline-none focus:border-accento',
            errore ? 'border-urgente' : 'border-bordo-forte')} />
      </div>
      {errore && <span className="text-xs font-semibold text-urgente-testo">{errore}</span>}
      {aperto && (
        <div className="absolute z-30 top-full mt-1.5 left-0 right-0 rounded-xl border border-bordo bg-superficie shadow-lg py-1 text-inchiostro">
          {trovati.slice(0, MAX_RISULTATI).map((c) => (
            <button key={c.id} type="button" onClick={() => { onChange(c.id); setAperto(false); setCambia(false); setTesto('') }}
              className="w-full px-3 py-2 text-left hover:bg-sfondo cursor-pointer flex items-center gap-3">
              {c.tipo === 'privato' ? <User className="size-4 text-tenue shrink-0" aria-hidden /> : <Building2 className="size-4 text-tenue shrink-0" aria-hidden />}
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[15px] truncate">{c.nome}</span>
                <span className="block text-xs text-tenue truncate">{[identificativo(c), c.citta].filter(Boolean).join(', ')}</span>
              </span>
            </button>
          ))}
          {trovati.length > MAX_RISULTATI && <p className="px-3 py-1.5 text-xs text-tenue">Altri {trovati.length - MAX_RISULTATI}: scrivi qualcosa in più</p>}
          {testo && trovati.length === 0 && <p className="px-3 py-2 text-sm text-tenue">Nessun cliente trovato</p>}
          <button type="button" onClick={() => { setNuovo(true); setAperto(false) }}
            className="w-full px-3 py-2.5 text-left text-[15px] font-semibold border-t border-bordo mt-1 hover:bg-sfondo cursor-pointer flex items-center gap-2">
            <Plus className="size-4" aria-hidden /> Nuovo cliente{testo.trim() ? ` «${testo.trim()}»` : ''}
          </button>
        </div>
      )}
    </div>
  )
}
