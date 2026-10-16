import type { useEvento, useEventiGestione, useProposteInAttesa } from './api'

/** Evento con tipo di booth e magazzino, come lo restituisce useEvento */
export type EventoDettaglio = NonNullable<ReturnType<typeof useEvento>['data']>
export type EventoGestione = NonNullable<ReturnType<typeof useEventiGestione>['data']>[number]
export type Proposta = NonNullable<ReturnType<typeof useProposteInAttesa>['data']>[number]
