import type { Passaggio } from '@/modules/passaggi/passaggi'
import { giornoLungo, giornoRoma, piuGiorni } from '@/shared/lib/date'
import { ora } from '@/shared/lib/formato'
import { nomeEvento } from './nome'

type Evento = {
  nome?: string | null; tipo_booth?: { nome: string } | null; citta: string; stato: string
  allestimento_il: string; inizio_attivazione: string; smontaggio_il: string; ultimo_passaggio: Passaggio | null
}

const conta = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`

function elenco(parti: string[]) {
  return parti.length <= 1 ? parti.join('') : `${parti.slice(0, -1).join(', ')} e ${parti.at(-1)}`
}

/** "domani alle 14:46" o "lunedì 19 ottobre alle 9:00" */
function quando(e: Evento, oggi: string) {
  const giorno = giornoRoma(e.allestimento_il)
  return `${giorno === piuGiorni(oggi, 1) ? 'domani' : giornoLungo(giorno, Number(oggi.slice(0, 4)))} alle ${ora(e.allestimento_il)}`
}

/** Com'è la giornata, in una frase */
function fraseDiOggi(eventi: Evento[], oggi: string): string {
  const diOggi = eventi.filter((e) => giornoRoma(e.allestimento_il) === oggi && e.stato !== 'annullato')

  if (diOggi.length === 0) {
    const prossimo = eventi
      .filter((e) => giornoRoma(e.allestimento_il) > oggi && e.stato !== 'annullato')
      .toSorted((a, b) => a.allestimento_il.localeCompare(b.allestimento_il))[0]
    return prossimo
      ? `Oggi niente eventi. Il prossimo è ${quando(prossimo, oggi)}: ${nomeEvento(prossimo)} a ${prossimo.citta}.`
      : 'Oggi niente eventi, e per ora nessuno in programma.'
  }
  if (diOggi.length === 1) {
    const e = diOggi[0]
    const stato = e.stato === 'completato' ? ', ed è già concluso' : e.stato === 'in_corso' ? ', ed è in corso' : ''
    return `Oggi c'è un evento: ${nomeEvento(e)} alle ${ora(e.allestimento_il)} a ${e.citta}${stato}.`
  }

  const conclusi = diOggi.filter((e) => e.stato === 'completato').length
  const inCorso = diOggi.filter((e) => e.stato === 'in_corso').length
  const daIniziare = diOggi.length - conclusi - inCorso
  if (conclusi === diOggi.length) return `Oggi ci sono ${diOggi.length} eventi, tutti conclusi.`
  const parti = [
    conclusi && conta(conclusi, 'concluso', 'conclusi'),
    inCorso && `${inCorso} in corso`,
    daIniziare && (daIniziare === 1 ? '1 deve ancora iniziare' : `${daIniziare} devono ancora iniziare`),
  ].filter(Boolean) as string[]
  return `Oggi ci sono ${diOggi.length} eventi: ${elenco(parti)}.`
}

/** La frase in cima alla Panoramica: com'è la giornata. I ritardi stanno in "Da sistemare". */
export function riassuntoDelGiorno(eventi: Evento[], adesso: number): string {
  return fraseDiOggi(eventi, giornoRoma(adesso))
}
