import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { useEventiDiOperatore, useOperatore } from '@/modules/anagrafiche/api'
import { FotoProfilo } from '@/modules/anagrafiche/components/FotoProfilo'
import { StatoEvento } from '@/modules/eventi/components/StatoEvento'
import { passato } from '@/modules/eventi/logic/archivio'
import { dataBreve, nomeCompleto, ora } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'
import { ModificaOperatore } from './Operatori'
import { nomeEvento } from '@/modules/eventi/logic/nome'

export function DettaglioOperatore() {
  const { id = '' } = useParams()
  const gestisce = usePuo()('operatori.gestisci')
  const op = useOperatore(id)
  const eventi = useEventiDiOperatore(id)
  const [modifica, setModifica] = useState(false)
  const [scheda, setScheda] = useState<'prossimi' | 'passati'>('prossimi')

  if (op.isPending) return <Caricamento />
  if (op.error) return <Errore errore={op.error} />
  const o = op.data
  const nome = nomeCompleto(o)
  const numero = o.telefono?.replace(/[^\d+]/g, '')

  const tutti = eventi.data ?? []
  const prossimi = tutti.filter((e) => !passato(e)).reverse()
  const passati = tutti.filter((e) => passato(e))
  const elenco = scheda === 'prossimi' ? prossimi : passati

  return (
    <div className="flex flex-col gap-6">
      <Link to="/gestione/operatori" className="text-sm font-semibold text-tenue inline-flex items-center gap-1 hover:text-inchiostro w-fit">
        <ArrowLeft className="size-4" aria-hidden /> Operatori
      </Link>

      <Card className="p-5 md:p-6 flex flex-wrap gap-5 items-center -mt-3">
        {gestisce ? <FotoProfilo utenteId={o.id} nome={nome} foto={o.foto} onCaricata={() => op.refetch()} /> : <Avatar nome={nome} foto={o.foto} taglia="xl" />}
        <div className="flex-[1_1_260px] min-w-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[26px] font-semibold leading-tight">{nome}</h1>
            {!o.attivo && <span className="text-xs font-semibold bg-avviso text-avviso-testo px-2.5 py-1 rounded-full">Non attivo</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {o.zone?.length ? o.zone.map((z) => (
              <span key={z.regione} className="text-xs font-semibold bg-sfondo border border-bordo px-2.5 py-1 rounded-full">{z.regione}</span>
            )) : <span className="text-xs font-semibold text-urgente-testo">Nessuna regione</span>}
          </div>
          {o.telefono && <p className="text-sm text-tenue">{o.telefono}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {numero && (
            <>
              <a href={`tel:${numero}`} className="h-11 px-4 rounded-lg border border-bordo-forte font-semibold text-sm inline-flex items-center gap-2 hover:bg-sfondo"><Phone className="size-4" aria-hidden />Chiama</a>
              <a href={`https://wa.me/${numero.replace('+', '')}`} target="_blank" rel="noreferrer" className="h-11 px-4 rounded-lg border border-bordo-forte font-semibold text-sm inline-flex items-center gap-2 hover:bg-sfondo"><MessageCircle className="size-4" aria-hidden />WhatsApp</a>
            </>
          )}
          {gestisce && <Pulsante variante={modifica ? 'scuro' : 'primario'} onClick={() => setModifica((m) => !m)}>{modifica ? 'Chiudi' : 'Modifica'}</Pulsante>}
        </div>
      </Card>

      {modifica && <Card className="overflow-hidden"><ModificaOperatore o={o} onFatto={() => { setModifica(false); op.refetch() }} /></Card>}

      <Card className="overflow-hidden">
        <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-bordo">
          <TitoloSezione>Eventi</TitoloSezione>
          <div className="flex rounded-lg bg-sfondo p-1" role="tablist">
            {([['prossimi', `Prossimi, ${prossimi.length}`], ['passati', `Passati, ${passati.length}`]] as const).map(([k, t]) => (
              <button key={k} role="tab" aria-selected={scheda === k} onClick={() => setScheda(k)}
                className={cn('h-9 px-3.5 rounded-md text-sm font-semibold cursor-pointer whitespace-nowrap', scheda === k ? 'bg-superficie shadow-sm text-inchiostro' : 'text-tenue hover:text-inchiostro')}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {eventi.isPending ? <Caricamento /> : eventi.error ? <div className="p-5"><Errore errore={eventi.error} /></div> : !elenco.length ? (
          <Vuoto titolo="Nessun evento" />
        ) : (
          <ul className="divide-y divide-bordo">
            {elenco.map((e) => (
              <li key={e.id}>
                <Link to={`/gestione/eventi/${e.id}`} className="px-5 py-3 flex items-center gap-4 hover:bg-sfondo/60">
                  <span className="w-28 shrink-0 text-sm font-semibold">{dataBreve(e.allestimento_il)}<span className="block text-xs font-normal text-tenue">{ora(e.allestimento_il)}</span></span>
                  <span className="flex-1 min-w-0 text-sm font-semibold truncate">{nomeEvento(e)}, {e.citta}</span>
                  <StatoEvento stato={e.stato} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
