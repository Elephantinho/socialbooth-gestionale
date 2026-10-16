import { useState } from 'react'
import { Send } from 'lucide-react'
import { useProfilo } from '@/modules/auth/AuthProvider'
import { RUOLI, type Ruolo } from '@/modules/auth/permessi'
import { useMagazzini, useOperatori, useUtenti } from '@/modules/anagrafiche/api'
import { useEventiGestione, useEventiOperatore } from '@/modules/eventi/api'
import { useParametriCarta } from '@/modules/carta/api'
import { useCreaRichiesta } from '../api'
import { MODELLI_OPERATORE, MODELLI_UFFICIO, type Modello } from '../logic/modelli'
import { dataBreve, nomeCompleto } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { AreaTesto, Campo, Selezione } from '@/shared/ui/Campo'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Errore } from '@/shared/ui/Stati'

/** Nuova richiesta: si sceglie cosa serve, si completano i campi, arriva a chi deve farlo */
export function NuovaRichiesta({ onFatto }: { onFatto?: () => void }) {
  const profilo = useProfilo()
  const operatore = profilo.ruolo === 'operatore'
  const modelli = operatore ? MODELLI_OPERATORE : MODELLI_UFFICIO
  const [modello, setModello] = useState<Modello>(modelli[0])
  const [v, setV] = useState({ operatore: '', magazzino: '', evento: '', confezioni: '1', dettagli: '', destinatario: 'ruolo:gestore_operatori' })
  const crea = useCreaRichiesta()
  const carta = useParametriCarta()

  const operatori = useOperatori()
  const magazzini = useMagazzini()
  const utenti = useUtenti()
  const eventiUfficio = useEventiGestione()
  const eventiMiei = useEventiOperatore(profilo.id)
  const eventi = (operatore ? eventiMiei.data : eventiUfficio.data?.filter((e) => new Date(e.smontaggio_il) >= new Date())) ?? []

  const ha = (c: string) => modello.campi.includes(c as never)
  const nomeOperatore = operatore ? nomeCompleto(profilo) : nomeCompleto(operatori.data?.find((o) => o.id === v.operatore))
  const nomeMagazzino = magazzini.data?.find((m) => m.id === v.magazzino)?.nome
  const confezioni = Number(v.confezioni) || 0

  function invia(e: React.FormEvent) {
    e.preventDefault()
    const [tipoDest, dest] = v.destinatario.split(':')
    const evento = eventi.find((x) => x.id === v.evento)
    crea.mutate({
      tipo: modello.tipo,
      titolo: modello.titolo({ operatore: nomeOperatore || undefined, magazzino: nomeMagazzino, confezioni: ha('confezioni') ? confezioni : undefined }),
      dettagli: v.dettagli.trim() || null,
      per_ruolo: ha('destinatario') && tipoDest === 'utente' ? null : ha('destinatario') ? dest as Ruolo : modello.per,
      per_utente: ha('destinatario') && tipoDest === 'utente' ? dest : null,
      operatore_id: operatore ? profilo.id : v.operatore || null,
      magazzino_id: v.magazzino || null,
      evento_id: evento?.id ?? null,
      quantita: ha('confezioni') && confezioni ? confezioni * (carta.data?.perConfezione ?? 700) : null,
    }, { onSuccess: () => { setV((p) => ({ ...p, dettagli: '', evento: '' })); onFatto?.() } })
  }

  return (
    <form onSubmit={invia} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cosa ti serve">
        {modelli.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={modello.id === m.id} onClick={() => setModello(m)}
            className={cn('h-9 px-3 rounded-lg border text-sm font-semibold cursor-pointer',
              modello.id === m.id ? 'bg-accento-tenue text-accento-scuro border-accento' : 'bg-superficie border-bordo-forte hover:border-inchiostro')}>
            {m.etichetta}
          </button>
        ))}
      </div>

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {ha('destinatario') && (
          <Selezione etichetta="A chi" value={v.destinatario} onChange={(e) => setV({ ...v, destinatario: e.target.value })}>
            <optgroup label="Un ruolo">
              {RUOLI.filter((r) => r.id !== 'operatore' && r.id !== profilo.ruolo).map((r) => <option key={r.id} value={`ruolo:${r.id}`}>{r.etichetta}</option>)}
            </optgroup>
            <optgroup label="Una persona">
              {utenti.data?.filter((u) => u.attivo && u.id !== profilo.id).map((u) => <option key={u.id} value={`utente:${u.id}`}>{nomeCompleto(u)}</option>)}
            </optgroup>
          </Selezione>
        )}
        {ha('operatore') && !operatore && (
          <Selezione etichetta="Operatore" required={modello.tipo === 'carta'} value={v.operatore} onChange={(e) => setV({ ...v, operatore: e.target.value })}>
            <option value="">{modello.tipo === 'carta' ? 'Scegli' : 'Nessuno'}</option>
            {operatori.data?.filter((o) => o.attivo).map((o) => (
              <option key={o.id} value={o.id}>{nomeCompleto(o)}{o.zone[0] ? `, ${o.zone.map((z) => z.regione).join(', ')}` : ''}</option>
            ))}
          </Selezione>
        )}
        {ha('magazzino') && (
          <Selezione etichetta={modello.tipo === 'trasferimento' ? 'Verso il magazzino' : 'Magazzino'} required={modello.id === 'carta-mag' || modello.tipo === 'trasferimento'}
            value={v.magazzino} onChange={(e) => setV({ ...v, magazzino: e.target.value })}>
            <option value="">Nessuno</option>
            {magazzini.data?.map((m) => <option key={m.id} value={m.id}>{m.nome}, {m.citta}</option>)}
          </Selezione>
        )}
        {ha('confezioni') && (
          <Campo etichetta={`Confezioni di carta (${carta.data?.perConfezione ?? 700} stampe l'una)`} type="number" min={1} required
            value={v.confezioni} onChange={(e) => setV({ ...v, confezioni: e.target.value })} />
        )}
        {ha('evento') && eventi.length > 0 && (
          <Selezione etichetta="Per l'evento" value={v.evento} onChange={(e) => setV({ ...v, evento: e.target.value })}>
            <option value="">Nessuno in particolare</option>
            {eventi.map((e) => <option key={e.id} value={e.id}>{dataBreve(e.allestimento_il)}, {e.citta}</option>)}
          </Selezione>
        )}
      </div>
      {ha('dettagli') && (
        <AreaTesto etichetta={modello.tipo === 'attrezzatura' || modello.tipo === 'trasferimento' ? 'Cosa e quanto' : modello.tipo === 'manutenzione' ? 'Cosa non funziona' : 'Dettagli'}
          required={modello.tipo !== 'carta'} value={v.dettagli} onChange={(e) => setV({ ...v, dettagli: e.target.value })}
          placeholder={modello.tipo === 'attrezzatura' ? 'Es. 1 stampante DNP, 2 cavalletti, fondale bianco' : modello.tipo === 'trasferimento' ? 'Es. dal Magazzino Bologna: 1 Mirror booth' : ''} />
      )}
      {crea.error && <Errore errore={crea.error} />}
      <div className="flex items-center gap-3">
        <Pulsante type="submit" icona={<Send className="size-4" aria-hidden />} caricamento={crea.isPending}>Invia richiesta</Pulsante>
        <span className="text-sm text-tenue">
          Arriva a {ha('destinatario') ? 'chi scegli' : RUOLI.find((r) => r.id === modello.per)?.etichetta.toLowerCase()} con una notifica.
        </span>
      </div>
      {crea.isSuccess && <p role="status" className="text-sm font-semibold text-accento">Richiesta inviata.</p>}
    </form>
  )
}
