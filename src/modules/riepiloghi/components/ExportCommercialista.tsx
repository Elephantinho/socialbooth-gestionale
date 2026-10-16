import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { eventiPerCommercialista } from '../api'
import { numeroCsv, scaricaCsv } from '@/shared/lib/csv'
import { meseCorrente } from '@/shared/lib/formato'
import { Pulsante } from '@/shared/ui/Pulsante'

/** Scarica gli eventi di un mese con fatture, costi e compensi, pronti per il commercialista */
export function ExportCommercialista() {
  const [mese, setMese] = useState(meseCorrente())
  const [carico, setCarico] = useState(false)
  const [errore, setErrore] = useState<string>()

  async function scarica() {
    setCarico(true); setErrore(undefined)
    try {
      const eventi = await eventiPerCommercialista(mese)
      scaricaCsv(`socialbooth-commercialista-${mese}.csv`,
        ['N°', 'Data evento', 'Cliente', 'Servizio', 'Città', 'Regione', 'Stato', 'Prezzo concordato', 'N° fattura', 'Data fattura', 'Importo fattura', 'Incassata', 'Compenso operatore', 'Altri costi', 'Margine'],
        eventi.map((e) => {
          const compenso = e.ore.filter((o) => o.check_out_il && o.stato !== 'respinto').reduce((s, o) => s + Number(o.compenso ?? 0), 0)
          const altri = e.costi.filter((c) => c.fase === 'finale' && c.stato !== 'respinto').reduce((s, c) => s + Number(c.importo ?? 0), 0)
          const ricavo = Number(e.fattura_importo ?? e.prezzo_cliente ?? 0)
          return [
            e.codice, new Date(e.allestimento_il).toLocaleDateString('it-IT'), e.cliente?.nome, e.tipo_booth?.nome, e.citta, e.regione, e.stato,
            numeroCsv(e.prezzo_cliente), e.fattura_numero, e.fattura_data ? new Date(e.fattura_data).toLocaleDateString('it-IT') : '',
            numeroCsv(e.fattura_importo), e.fattura_importo == null ? '' : e.fattura_pagata ? 'sì' : 'no',
            numeroCsv(compenso), numeroCsv(altri), numeroCsv(ricavo - compenso - altri),
          ]
        }))
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Export non riuscito')
    } finally {
      setCarico(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#3F4047]">
        Mese
        <input type="month" value={mese} onChange={(e) => setMese(e.target.value)} className="h-11 rounded-md border border-bordo-forte bg-superficie px-3 font-semibold" />
      </label>
      <Pulsante variante="secondario" icona={<FileSpreadsheet className="size-4" aria-hidden />} caricamento={carico} onClick={scarica}>Export commercialista</Pulsante>
      {errore && <p className="w-full text-sm text-urgente-testo font-semibold">{errore}</p>}
    </div>
  )
}
