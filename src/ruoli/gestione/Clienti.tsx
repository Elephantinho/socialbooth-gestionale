import { useState } from 'react'
import { Building, Mail, Phone, Plus } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { useClientiConEventi, useEliminaCliente, useSalvaCliente } from '@/modules/anagrafiche/api'
import { euro } from '@/shared/lib/formato'
import { Card } from '@/shared/ui/Card'
import { AreaTesto, Campo } from '@/shared/ui/Campo'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

type Cliente = NonNullable<ReturnType<typeof useClientiConEventi>['data']>[number]

export function Clienti() {
  const { data, isPending, error } = useClientiConEventi()
  const [nuovo, setNuovo] = useState(false)
  const [cerca, setCerca] = useState('')
  const filtrati = (data ?? []).filter((c) => c.nome.toLowerCase().includes(cerca.toLowerCase()))

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Clienti"
        azioni={!nuovo && <Pulsante taglia="lg" icona={<Plus className="size-[18px]" aria-hidden />} onClick={() => setNuovo(true)}>Nuovo cliente</Pulsante>} />
      {nuovo && <Card className="p-5 max-w-2xl"><ModuloCliente onFatto={() => setNuovo(false)} /></Card>}
      <Campo etichetta="Cerca" placeholder="Nome azienda" value={cerca} onChange={(e) => setCerca(e.target.value)} className="max-w-md" />
      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !filtrati.length ? (
        <Card><Vuoto titolo="Nessun cliente" testo="I clienti si possono creare anche direttamente dal modulo del nuovo evento." /></Card>
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {filtrati.map((c) => <SchedaCliente key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}

function SchedaCliente({ c }: { c: Cliente }) {
  const [modifica, setModifica] = useState(false)
  const elimina = useEliminaCliente()
  const admin = useProfilo().ruolo === 'admin'
  const validi = c.eventi.filter((e) => e.stato !== 'annullato')
  const fatturato = validi.reduce((s, e) => s + Number(e.fattura_importo ?? e.prezzo_cliente ?? 0), 0)
  const daIncassare = validi.filter((e) => e.fattura_importo != null && !e.fattura_pagata).reduce((s, e) => s + Number(e.fattura_importo), 0)

  if (modifica) return <Card className="p-5"><ModuloCliente c={c} onFatto={() => setModifica(false)} /></Card>

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-lg bg-accento-tenue text-accento-scuro flex items-center justify-center shrink-0"><Building className="size-5" aria-hidden /></div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[16px] truncate">{c.nome}</p>
          <p className="text-sm text-tenue">{validi.length} eventi</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-sfondo p-3"><p className="text-xs font-semibold text-tenue">Fatturato</p><p className="font-semibold">{euro(fatturato)}</p></div>
        <div className={daIncassare > 0 ? 'rounded-lg bg-avviso p-3 text-avviso-testo' : 'rounded-lg bg-sfondo p-3'}>
          <p className="text-xs font-semibold opacity-80">Da incassare</p><p className="font-semibold">{euro(daIncassare)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-2 hover:underline"><Mail className="size-4 text-tenue" aria-hidden />{c.email}</a>}
        {c.telefono && <a href={`tel:${c.telefono}`} className="inline-flex items-center gap-2 hover:underline"><Phone className="size-4 text-tenue" aria-hidden />{c.telefono}</a>}
        {c.note && <p className="text-tenue">{c.note}</p>}
      </div>
      <div className="flex gap-2 mt-auto">
        <Pulsante variante="secondario" onClick={() => setModifica(true)}>Modifica</Pulsante>
        {admin && (
          <Pulsante variante="fantasma" caricamento={elimina.isPending}
            onClick={() => confirm(`Eliminare ${c.nome}? Gli eventi restano, senza cliente.`) && elimina.mutate(c.id)}>Elimina</Pulsante>
        )}
      </div>
    </Card>
  )
}

function ModuloCliente({ c, onFatto }: { c?: Cliente; onFatto: () => void }) {
  const salva = useSalvaCliente()
  const profilo = useProfilo()
  const [nome, setNome] = useState(c?.nome ?? '')
  const [email, setEmail] = useState(c?.email ?? '')
  const [telefono, setTelefono] = useState(c?.telefono ?? '')
  const [note, setNote] = useState(c?.note ?? '')
  return (
    <form className="flex flex-col gap-3.5" onSubmit={(e) => {
      e.preventDefault()
      salva.mutate({ id: c?.id, nome, email: email || null, telefono: telefono || null, note: note || null, project_id: c?.project_id ?? profilo.id }, { onSuccess: onFatto })
    }}>
      <Campo etichetta="Nome azienda" required value={nome} onChange={(e) => setNome(e.target.value)} />
      <div className="grid gap-3 grid-cols-2">
        <Campo etichetta="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo etichetta="Telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <AreaTesto etichetta="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      {salva.error && <Errore errore={salva.error} />}
      <div className="flex gap-2">
        <Pulsante type="submit" caricamento={salva.isPending}>Salva</Pulsante>
        <Pulsante type="button" variante="secondario" onClick={onFatto}>Annulla</Pulsante>
      </div>
    </form>
  )
}
