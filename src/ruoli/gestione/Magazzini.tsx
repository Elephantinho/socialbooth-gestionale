import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Plus, Users } from 'lucide-react'
import { usePuo } from '@/modules/auth/permessi'
import { useMagazzini } from '@/modules/magazzino/api'
import { IndicatoreCarta } from '@/modules/magazzino/Carta'
import { cartaBassa, perCategoria } from '@/modules/magazzino/magazzino'
import { ModuloMagazzino } from '@/modules/magazzino/ModuloMagazzino'
import { cn } from '@/shared/lib/cn'
import { nomeCompleto } from '@/shared/lib/formato'
import { Avatar } from '@/shared/ui/Avatar'
import { Card, TitoloSezione } from '@/shared/ui/Card'
import { Intestazione } from '@/shared/ui/Intestazione'
import { Pulsante } from '@/shared/ui/Pulsante'
import { Caricamento, Errore, Vuoto } from '@/shared/ui/Stati'

/** Magazzini in tutta Italia: carta rimasta e strumenti di ognuno, a colpo d'occhio */
export function Magazzini() {
  const { data, isPending, error } = useMagazzini()
  const gestisce = usePuo()('magazzino')
  const naviga = useNavigate()
  const [nuovo, setNuovo] = useState(false)

  const attivi = (data ?? []).filter((m) => m.attivo)
  const conPocaCarta = attivi.filter(cartaBassa).length

  return (
    <div className="flex flex-col gap-6">
      <Intestazione titolo="Magazzini"
        azioni={gestisce && !nuovo && <Pulsante onClick={() => setNuovo(true)}><Plus className="size-4" aria-hidden /> Nuovo magazzino</Pulsante>} />

      {nuovo && (
        <Card className="p-5 md:p-6 flex flex-col gap-4 max-w-3xl">
          <TitoloSezione>Nuovo magazzino</TitoloSezione>
          <ModuloMagazzino onSalvato={(id) => naviga(`/gestione/magazzini/${id}`)} onAnnulla={() => setNuovo(false)} />
        </Card>
      )}

      {isPending ? <Caricamento /> : error ? <Errore errore={error} /> : !data.length ? (
        <Card><Vuoto titolo="Ancora nessun magazzino" testo={gestisce ? 'Aggiungi il primo con «Nuovo magazzino».' : undefined} /></Card>
      ) : (
        <>
          {conPocaCarta > 0 && (
            <p className="font-semibold text-avviso-testo -mt-2">
              {conPocaCarta === 1 ? 'In 1 magazzino la carta sta finendo' : `In ${conPocaCarta} magazzini la carta sta finendo`}
            </p>
          )}
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {data.map((m) => {
              const categorie = perCategoria(m.articoli)
              const operatori = m.operatori.filter((o) => o.attivo).length
              return (
                <Link key={m.id} to={`/gestione/magazzini/${m.id}`}
                  className={cn('rounded-xl bg-superficie border border-bordo shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5 flex flex-col gap-4 hover:border-bordo-forte', !m.attivo && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[17px] truncate">{m.nome}</p>
                      <p className="text-sm text-tenue inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{m.citta}, {m.regione}</p>
                    </div>
                    {!m.attivo && <span className="text-xs font-semibold text-tenue bg-sfondo rounded-full px-2.5 py-1">Chiuso</span>}
                  </div>

                  <IndicatoreCarta stampe={m.carta_stampe} minima={m.carta_minima} />

                  {categorie.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {categorie.map((c) => (
                        <li key={c.id} className="text-sm bg-sfondo rounded-md px-2 py-1 inline-flex items-center gap-1.5">
                          {c.etichetta} <span className="font-semibold tabular-nums">{c.pezzi}</span>
                          {c.fermi > 0 && <span className="size-1.5 rounded-full bg-urgente" title={`${c.fermi} non disponibili`} />}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-tenue">Nessuno strumento</p>}

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-bordo text-sm text-tenue mt-auto">
                    {m.responsabile ? (
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Avatar nome={nomeCompleto(m.responsabile)} foto={m.responsabile.foto} taglia="xs" />
                        <span className="truncate text-inchiostro">{nomeCompleto(m.responsabile)}</span>
                      </span>
                    ) : <span>Nessun responsabile</span>}
                    <span className="inline-flex items-center gap-1 shrink-0" title={`${operatori} operatori partono da qui`}>
                      <Users className="size-3.5" aria-hidden />{operatori}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
