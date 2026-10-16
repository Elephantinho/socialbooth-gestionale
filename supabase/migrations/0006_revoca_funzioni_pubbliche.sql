-- Le funzioni dell'app sono chiamabili solo da utenti loggati (mai da anonimi)
revoke execute on function public.check_in(uuid, double precision, double precision, text) from public, anon;
revoke execute on function public.chiudi_evento(uuid, int, int, text) from public, anon;
revoke execute on function public.mio_ruolo() from public, anon;
revoke execute on function public.proponi_operatore(uuid, uuid) from public, anon;
revoke execute on function public.rispondi_proposta(uuid, boolean) from public, anon;
grant execute on function public.check_in(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.chiudi_evento(uuid, int, int, text) to authenticated;
grant execute on function public.mio_ruolo() to authenticated;
grant execute on function public.proponi_operatore(uuid, uuid) to authenticated;
grant execute on function public.rispondi_proposta(uuid, boolean) to authenticated;
