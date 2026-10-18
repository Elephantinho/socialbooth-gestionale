import { useState } from 'react'
import { useProfilo } from '@/modules/auth/sessione'
import { cn } from '@/shared/lib/cn'
import { Campo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'
import { useSalvaCliente } from './api'
import { clienteVuoto, controllaCliente, daCliente, type Cliente, type DatiCliente, type TipoCliente } from './clienti'

type Props = {
  cliente?: Cliente              // da modificare; senza, se ne crea uno nuovo
  nomeIniziale?: string          // per un nuovo cliente nato da una ricerca
  onSalvato: (c: Cliente) => void
  onAnnulla?: () => void
}

/** Dati del cliente per la fattura: azienda (P.IVA e SDI o PEC) o privato (codice fiscale), con la sede */
export function ModuloCliente({ cliente, nomeIniziale, onSalvato, onAnnulla }: Props) {
  const profilo = useProfilo()
  const salva = useSalvaCliente()
  const [d, setD] = useState<DatiCliente>(() => (cliente ? daCliente(cliente) : { ...clienteVuoto, nome: nomeIniziale ?? '' }))
  const [provato, setProvato] = useState(false)
  const errori = provato ? controllaCliente(d) : {}
  const campo = (k: keyof DatiCliente) => ({ value: d[k], errore: errori[k], onChange: (e: { target: { value: string } }) => setD((p) => ({ ...p, [k]: e.target.value })) })
  const azienda = d.tipo === 'azienda'

  // Non è un <form>: può stare dentro il modulo dell'evento senza inviarlo
  function invia() {
    setProvato(true)
    if (Object.keys(controllaCliente(d)).length > 0) return
    salva.mutate({ id: cliente?.id, dati: d, autoreId: profilo.id }, { onSuccess: onSalvato })
  }

  return (
    <div className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); invia() } }}>
      <div className="inline-flex self-start rounded-lg bg-sfondo p-1" role="group" aria-label="Tipo di cliente">
        {([['azienda', 'Azienda'], ['privato', 'Privato']] as [TipoCliente, string][]).map(([t, testo]) => (
          <button key={t} type="button" aria-pressed={d.tipo === t} onClick={() => setD((p) => ({ ...p, tipo: t }))}
            className={cn('h-9 px-5 rounded-md font-semibold text-sm cursor-pointer', d.tipo === t ? 'bg-superficie text-inchiostro shadow-sm' : 'text-tenue hover:text-inchiostro')}>
            {testo}
          </button>
        ))}
      </div>

      <Campo etichetta={azienda ? 'Ragione sociale' : 'Nome e cognome'} placeholder={azienda ? 'es. Rossi Eventi srl' : 'es. Mario Rossi'} {...campo('nome')} />
      {azienda ? (
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
          <Campo etichetta="Partita IVA" inputMode="numeric" placeholder="11 cifre" {...campo('partita_iva')} />
          <Campo etichetta="Codice SDI" placeholder="7 caratteri" maxLength={7} {...campo('codice_sdi')} />
          <Campo etichetta="oppure PEC" type="email" placeholder="es. nome@pec.it" {...campo('pec')} />
        </div>
      ) : (
        <Campo etichetta="Codice fiscale" placeholder="16 caratteri" maxLength={20} {...campo('codice_fiscale')} className="max-w-sm" />
      )}

      <Campo etichetta={azienda ? 'Indirizzo della sede' : 'Indirizzo'} placeholder="es. Via Roma, 1" {...campo('indirizzo')} />
      <div className="grid gap-3.5 grid-cols-[7rem_minmax(0,1fr)_5.5rem]">
        <Campo etichetta="CAP" inputMode="numeric" maxLength={5} {...campo('cap')} />
        <Campo etichetta="Città" {...campo('citta')} />
        <Campo etichetta="Provincia" maxLength={2} placeholder="es. FI" {...campo('provincia')} />
      </div>
      <div className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <Campo etichetta="Email (facoltativa)" type="email" {...campo('email')} />
        <Campo etichetta="Telefono (facoltativo)" type="tel" {...campo('telefono')} />
      </div>

      {salva.error && <Errore errore={salva.error} />}
      <div className="flex gap-2">
        <Pulsante type="button" onClick={invia} caricamento={salva.isPending}>{cliente ? 'Salva le modifiche' : 'Salva cliente'}</Pulsante>
        {onAnnulla && <Pulsante type="button" variante="secondario" onClick={onAnnulla}>Annulla</Pulsante>}
      </div>
    </div>
  )
}
