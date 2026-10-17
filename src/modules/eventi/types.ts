import type { useEvento, useEventiInProgramma, useEventoGestione, useProposteInAttesa } from './api'

type Dati<T extends (...a: never[]) => { data: unknown }> = NonNullable<ReturnType<T>['data']>

/** Evento con il tipo di booth, come lo vede l'operatore */
export type EventoDettaglio = Dati<typeof useEvento>
export type EventoGestione = Dati<typeof useEventiInProgramma>[number]
export type EventoGestioneCompleto = Dati<typeof useEventoGestione>
export type Proposta = Dati<typeof useProposteInAttesa>[number]
