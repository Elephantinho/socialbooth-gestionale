/** Titolo dell'evento: il suo nome; per i vecchi eventi senza nome, il servizio. */
export function nomeEvento(e: { nome?: string | null; tipo_booth?: { nome: string } | null }): string {
  return e.nome?.trim() || e.tipo_booth?.nome || 'Evento'
}

