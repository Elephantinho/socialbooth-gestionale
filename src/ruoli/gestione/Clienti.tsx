import { useState } from 'react'
import { Building2, CalendarDays, ChevronRight, Plus, Search, User } from 'lucide-react'
import { useClienti } from '@/modules/clienti/api'
import { cercaClienti, controllaCliente, daCliente, identificativo, type Cliente } from '@/modules/clienti/clienti'
import { ModuloCliente } from '@/modules/clienti/ModuloCliente'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

/** Clienti: chi paga gli eventi, con i dati per la fattura. Condivisi tra tutti i project. */
export function Clienti() {
  const { data, isPending, error } = useClienti()
  const [cerca, setCerca] = useState('')
  // null = niente aperto; 'nuovo' = nuovo cliente; altrimenti il cliente in modifica
  const [aperto, setAperto] = useState<'nuovo' | Cliente | null>(null)
  const trovati = cercaClienti(data ?? [], cerca)

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Clienti"
        azioni={!aperto && <Pulsante onClick={() => setAperto('nuovo')}><Plus className="size-4" aria-hidden /> Nuovo cliente</Pulsante>} />

      {aperto && (
        <Card className="p-5 md:p-6 flex flex-col gap-4 max-w-3xl">
          <TitoloSezione>{aperto === 'nuovo' ? 'Nuovo cliente' : aperto.nome}</TitoloSezione>
          <ModuloCliente key={aperto === 'nuovo' ? 'nuovo' : aperto.id} cliente={aperto === 'nuovo' ? undefined : aperto}
            onSalvato={() => setAperto(null)} onAnnulla={() => setAperto(null)} />
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-tenue pointer-events-none" aria-hidden />
        <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per nome, partita IVA o città" aria-label="Cerca un cliente"
          className="w-full h-11 rounded-lg border border-bordo-forte bg-superficie pl-10 pr-3 text-[15px] placeholder:text-tenue/60 focus:outline-none focus:border-accento" />
      </div>

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : trovati.length === 0 ? (
        <Card><Vuoto titolo={cerca ? 'Nessun cliente trovato' : 'Ancora nessun cliente'} testo={cerca ? undefined : 'Si aggiungono qui o direttamente quando si crea un evento.'} /></Card>
      ) : (
        <Card className="divide-y divide-bordo">
          {trovati.map((c) => {
            const Icona = c.tipo === 'privato' ? User : Building2
            const incompleto = Object.keys(controllaCliente(daCliente(c))).length > 0
            return (
              <button key={c.id} onClick={() => { setAperto(c); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="w-full text-left grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_10rem_4rem_auto] items-center gap-x-4 px-4 py-3 cursor-pointer hover:bg-sfondo/70">
                <Icona className="size-5 text-tenue" aria-label={c.tipo === 'privato' ? 'Privato' : 'Azienda'} />
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{c.nome}</span>
                  <span className="block text-sm text-tenue truncate">
                    {incompleto ? <span className="font-semibold text-urgente-testo">Dati per la fattura da completare</span> : identificativo(c)}
                  </span>
                </span>
                <span className="max-md:hidden text-sm text-tenue truncate">{c.citta ?? ''}</span>
                <span className="max-md:hidden text-sm text-tenue inline-flex items-center gap-1 justify-end" title={`${c.nEventi} eventi`}>
                  <CalendarDays className="size-3.5" aria-hidden />{c.nEventi}
                </span>
                <ChevronRight className="size-4 text-tenue" aria-hidden />
              </button>
            )
          })}
        </Card>
      )}
    </div>
  )
}
