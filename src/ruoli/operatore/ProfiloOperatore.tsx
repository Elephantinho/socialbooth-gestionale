import { AttivaNotifiche } from '@/modules/comunicazione/components/AttivaNotifiche'
import { Logo } from '@/shared/ui/Logo'
import { BRAND } from '@/shared/brand'
import { useEffect, useState } from 'react'
import { useAuth, useProfilo } from '@/modules/auth/AuthProvider'
import { useAggiornaProfilo, useMieRegioni } from '@/modules/anagrafiche/api'
import { SceltaRegioni } from '@/modules/auth/SceltaRegioni'
import { nomeCompleto } from '@/shared/lib/formato'
import { FotoProfilo } from '@/modules/anagrafiche/components/FotoProfilo'
import type { Enum } from '@/shared/types/database'
import { Card } from '@/shared/ui/Card'
import { Campo } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'

export function ProfiloOperatore() {
  const profilo = useProfilo()
  const { sessione, esci, ricaricaProfilo } = useAuth()
  const regioniSalvate = useMieRegioni(profilo.id)
  const aggiorna = useAggiornaProfilo()

  const [nome, setNome] = useState(profilo.nome)
  const [cognome, setCognome] = useState(profilo.cognome)
  const [telefono, setTelefono] = useState(profilo.telefono ?? '')
  const [regioni, setRegioni] = useState<Enum<'regione'>[]>([])
  const [salvato, setSalvato] = useState(false)

  useEffect(() => { if (regioniSalvate.data) setRegioni(regioniSalvate.data) }, [regioniSalvate.data])

  function salva(e: React.FormEvent) {
    e.preventDefault()
    setSalvato(false)
    aggiorna.mutate(
      { id: profilo.id, modifiche: { nome, cognome, telefono: telefono || null }, regioni },
      { onSuccess: () => { setSalvato(true); ricaricaProfilo() } },
    )
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-sicura pb-6">
      <div className="flex items-center gap-4 pt-2">
        <FotoProfilo utenteId={profilo.id} nome={nomeCompleto(profilo)} foto={profilo.foto} onCaricata={ricaricaProfilo} />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold truncate">{nomeCompleto(profilo)}</h1>
          <p className="text-sm text-tenue truncate">{sessione?.user.email}</p>
        </div>
      </div>

      <AttivaNotifiche modo="impostazione" />

      <Card className="p-4">
        <form onSubmit={salva} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo etichetta="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            <Campo etichetta="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
          </div>
          <Campo etichetta="Telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <SceltaRegioni valore={regioni} onChange={setRegioni} />
          {aggiorna.error && <Errore errore={aggiorna.error} />}
          {salvato && <p className="text-sm font-semibold text-ok" role="status">Salvato</p>}
          <Pulsante type="submit" taglia="lg" pieno caricamento={aggiorna.isPending}>Salva</Pulsante>
        </form>
      </Card>

      <Pulsante variante="secondario" taglia="lg" pieno onClick={esci}>Esci</Pulsante>
      <div className="flex flex-col items-center gap-1 pt-4 opacity-80">
        <Logo taglia="sm" />
        <p className="text-[11px] text-tenue">{BRAND.payoff}</p>
      </div>
    </div>
  )
}
