import type { useEvento, useEventiGestione, useEventoGestione, useMieOre, useProposteInAttesa, useReportOre } from './api'

type Dati<T extends (...a: never[]) => { data: unknown }> = NonNullable<ReturnType<T>['data']>

/** Evento con tipo di booth e magazzino, come lo vede l'operatore */
export type EventoDettaglio = Dati<typeof useEvento>
export type EventoGestione = Dati<typeof useEventiGestione>[number]
export type EventoGestioneCompleto = Dati<typeof useEventoGestione>
export type Proposta = Dati<typeof useProposteInAttesa>[number]
export type RigaOre = Dati<typeof useMieOre>[number]
export type RigaReport = Dati<typeof useReportOre>[number]
