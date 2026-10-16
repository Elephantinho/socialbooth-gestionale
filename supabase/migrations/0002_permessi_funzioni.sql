-- Le funzioni non devono essere chiamabili da utenti non loggati.
-- Le funzioni dei trigger non devono essere chiamabili da nessuno via API.
revoke execute on function public.mio_ruolo()                 from anon;
revoke execute on function public.operatori_disponibili(uuid) from anon;
revoke execute on function public.proponi_operatore(uuid, uuid)    from anon;
revoke execute on function public.rispondi_proposta(uuid, boolean) from anon;
revoke execute on function public.check_in(uuid, double precision, double precision, text) from anon;
revoke execute on function public.chiudi_evento(uuid, int, int, text) from anon;

revoke execute on function public.crea_profilo()         from public, anon, authenticated;
revoke execute on function public.proteggi_profilo()     from public, anon, authenticated;
revoke execute on function public.trigger_assegnazione() from public, anon, authenticated;
revoke execute on function public.tocca_aggiornato()     from public, anon, authenticated;
