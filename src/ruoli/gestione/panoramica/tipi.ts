import type { useEventiGestione } from '@/modules/eventi/api'

/** Un evento come arriva dall'elenco della gestione */
export type EventoLista = NonNullable<ReturnType<typeof useEventiGestione>['data']>[number]
