import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth, useProfilo } from '@/modules/auth/AuthProvider'
import { useAggiornaProfilo, useMagazzini, useMieRegioni } from '@/modules/anagrafiche/api'
import { SceltaRegioni } from '@/modules/auth/SceltaRegioni'
import { iniziali } from '@/shared/lib/formato'
import type { Enum } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'

export function ProfiloOperatore() {
  const profilo = useProfilo()
  const { sessione, esci, ricaricaProfilo } = useAuth()
  const regioniSalvate = useMieRegioni(profilo.id)
  const magazzini = useMagazzini()
  const aggiorna = useAggiornaProfilo()

  const [nome, setNome] = useState(profilo.nome)
  const [telefono, setTelefono] = useState(profilo.telefono ?? '')
  const [magazzinoId, setMagazzinoId] = useState(profilo.magazzino_id ?? '')
  const [regioni, setRegioni] = useState<Enum<'regione'>[]>([])
  const [salvato, setSalvato] = useState(false)

  useEffect(() => { if (regioniSalvate.data) setRegioni(regioniSalvate.data) }, [regioniSalvate.data])

  function salva(e: React.FormEvent) {
    e.preventDefault()
    setSalvato(false)
    aggiorna.mutate(
      { id: profilo.id, modifiche: { nome, telefono: telefono || null, magazzino_id: magazzinoId || null }, regioni },
      { onSuccess: () => { setSalvato(true); ricaricaProfilo() } },
    )
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-sicura pb-6">
      <div className="flex items-center gap-4 pt-2">
        <div className="size-16 rounded-full bg-inchiostro text-white font-display text-2xl font-bold flex items-center justify-center">{iniziali(profilo.nome)}</div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">{profilo.nome || 'Il mio profilo'}</h1>
          <p className="text-sm text-tenue truncate">{sessione?.user.email}</p>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={salva} className="flex flex-col gap-4">
          <Campo etichetta="Nome e cognome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <Campo etichetta="Telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <Selezione etichetta="Magazzino di riferimento" value={magazzinoId} onChange={(e) => setMagazzinoId(e.target.value)}>
            <option value="">— Nessuno —</option>
            {magazzini.data?.map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.citta}</option>)}
          </Selezione>
          <SceltaRegioni valore={regioni} onChange={setRegioni} />
          {aggiorna.error && <Errore errore={aggiorna.error} />}
          {salvato && <p className="text-sm font-bold text-accento" role="status">Salvato</p>}
          <Pulsante type="submit" taglia="lg" pieno caricamento={aggiorna.isPending}>Salva</Pulsante>
        </form>
      </Card>

      <Pulsante variante="secondario" taglia="lg" pieno icona={<LogOut className="size-4" aria-hidden />} onClick={esci}>Esci</Pulsante>
    </div>
  )
}
