import { useQuery } from '@tanstack/react-query'
import { supabase, ok } from '@/shared/lib/supabase'

// Riepiloghi da scaricare: mese dell'operatore (PDF) ed eventi del mese per il commercialista (CSV).

const limitiMese = (mese: string) => {
  const inizio = new Date(`${mese}-01T00:00:00`)
  const fine = new Date(inizio); fine.setMonth(fine.getMonth() + 1)
  return [inizio.toISOString(), fine.toISOString()] as const
}

/** Ore, compensi e rimborsi di un operatore in un mese */
export function useRiepilogoOperatore(operatoreId: string, mese: string) {
  return useQuery({
    queryKey: ['riepilogo', operatoreId, mese],
    queryFn: async () => {
      const [da, a] = limitiMese(mese)
      const [profilo, ore, rimborsi] = await Promise.all([
        supabase.from('profili').select('nome, cognome, telefono, tariffa_oraria').eq('id', operatoreId).single(),
        supabase.from('ore_lavorate')
          .select('id, minuti_in_location, minuti_viaggio, minuti_totali, tariffa_oraria, compenso, stato, evento:eventi!inner(allestimento_il, citta, regione, tipo_booth:tipi_booth(nome))')
          .eq('operatore_id', operatoreId).not('check_out_il', 'is', null).neq('stato', 'respinto')
          .gte('evento.allestimento_il', da).lt('evento.allestimento_il', a),
        supabase.from('costi_evento')
          .select('id, categoria, descrizione, importo, stato, evento:eventi!inner(allestimento_il, citta)')
          .eq('operatore_id', operatoreId).eq('pagato_con', 'operatore').eq('fase', 'finale').neq('stato', 'respinto')
          .gte('evento.allestimento_il', da).lt('evento.allestimento_il', a),
      ])
      const righe = ok(ore).sort((x, y) => x.evento!.allestimento_il.localeCompare(y.evento!.allestimento_il))
      return { profilo: ok(profilo), ore: righe, rimborsi: ok(rimborsi) }
    },
  })
}

/** Eventi del mese con ricavi, costi e fattura: per il commercialista */
export async function eventiPerCommercialista(mese: string) {
  const [da, a] = limitiMese(mese)
  return ok(await supabase.from('eventi')
    .select(`codice, stato, allestimento_il, citta, regione, prezzo_cliente, fattura_numero, fattura_data, fattura_importo, fattura_pagata,
      cliente:clienti(nome), tipo_booth:tipi_booth(nome),
      ore:ore_lavorate(compenso, stato, check_out_il),
      costi:costi_evento(fase, importo, stato)`)
    .neq('stato', 'annullato').gte('allestimento_il', da).lt('allestimento_il', a).order('allestimento_il'))
}
