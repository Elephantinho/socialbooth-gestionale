// Le richieste più comuni, già impostate: si sceglie il modello e si completano due campi.
import type { Enum, Riga } from '@/shared/types/database'

export type Campo = 'operatore' | 'magazzino' | 'evento' | 'confezioni' | 'dettagli' | 'destinatario'

export type Modello = {
  id: string
  etichetta: string
  tipo: Riga<'richieste'>['tipo']
  /** A chi arriva di base */
  per: Enum<'ruolo'>
  campi: Campo[]
  /** Titolo costruito dai campi scelti */
  titolo: (v: { operatore?: string; magazzino?: string; confezioni?: number }) => string
}

/** Dall'ufficio (project, amministrazione, admin) verso chi gestisce operatori e magazzini */
export const MODELLI_UFFICIO: Modello[] = [
  { id: 'carta-op', etichetta: 'Manda carta a un operatore', tipo: 'carta', per: 'gestore_operatori', campi: ['operatore', 'confezioni', 'dettagli'],
    titolo: (v) => `Carta a ${v.operatore ?? 'operatore'}${v.confezioni ? ` (${v.confezioni} conf.)` : ''}` },
  { id: 'carta-mag', etichetta: 'Manda carta a un magazzino', tipo: 'carta', per: 'gestore_operatori', campi: ['magazzino', 'confezioni', 'dettagli'],
    titolo: (v) => `Carta al ${v.magazzino ?? 'magazzino'}${v.confezioni ? ` (${v.confezioni} conf.)` : ''}` },
  { id: 'attrezzatura', etichetta: 'Porta attrezzatura', tipo: 'attrezzatura', per: 'gestore_operatori', campi: ['dettagli', 'operatore', 'magazzino', 'evento'],
    titolo: (v) => `Attrezzatura${v.operatore ? ` a ${v.operatore}` : v.magazzino ? ` al ${v.magazzino}` : ''}` },
  { id: 'trasferimento', etichetta: 'Sposta tra magazzini', tipo: 'trasferimento', per: 'gestore_operatori', campi: ['magazzino', 'dettagli'],
    titolo: (v) => `Trasferimento verso ${v.magazzino ?? 'magazzino'}` },
  { id: 'altro', etichetta: 'Altro', tipo: 'altro', per: 'gestore_operatori', campi: ['destinatario', 'dettagli', 'evento'], titolo: () => 'Richiesta' },
]

/** Dall'operatore verso l'ufficio */
export const MODELLI_OPERATORE: Modello[] = [
  { id: 'carta', etichetta: 'Mi serve carta', tipo: 'carta', per: 'gestore_operatori', campi: ['confezioni', 'dettagli'],
    titolo: (v) => `Carta per ${v.operatore ?? 'me'}${v.confezioni ? ` (${v.confezioni} conf.)` : ''}` },
  { id: 'manca', etichetta: 'Mi manca attrezzatura', tipo: 'attrezzatura', per: 'gestore_operatori', campi: ['dettagli', 'evento'],
    titolo: (v) => `Manca attrezzatura${v.operatore ? ` (${v.operatore})` : ''}` },
  { id: 'guasto', etichetta: 'Qualcosa è rotto', tipo: 'manutenzione', per: 'gestore_operatori', campi: ['dettagli', 'evento'],
    titolo: (v) => `Guasto segnalato da ${v.operatore ?? 'operatore'}` },
  { id: 'altro', etichetta: 'Altro', tipo: 'altro', per: 'gestore_operatori', campi: ['dettagli', 'evento'], titolo: () => 'Richiesta' },
]

export const ETICHETTA_STATO: Record<Riga<'richieste'>['stato'], string> = {
  aperta: 'Da fare', in_corso: 'In corso', fatta: 'Fatta', annullata: 'Annullata',
}
