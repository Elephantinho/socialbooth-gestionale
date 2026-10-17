-- Tocco sbagliato: l'operatore annulla l'ultimo passaggio entro 10 minuti.
-- L'ultimo è il più avanti nella sequenza (non conta l'ora).
create or replace function public.annulla_passaggio(p_evento uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ev public.eventi;
  ultimo public.passaggi_evento;
  prima public.passaggio;
begin
  select * into ev from public.eventi where id = p_evento for update;
  if not found or ev.operatore_id is distinct from auth.uid() then raise exception 'Non sei l''operatore di questo evento'; end if;
  select * into ultimo from public.passaggi_evento
   where evento_id = p_evento and annullato_il is null order by passaggio desc limit 1;
  if not found then raise exception 'Niente da annullare'; end if;
  if ultimo.fatto_il < now() - interval '10 minutes' then raise exception 'Sono passati più di 10 minuti: chiedi all''ufficio'; end if;

  update public.passaggi_evento set annullato_il = now() where id = ultimo.id;
  select passaggio into prima from public.passaggi_evento
   where evento_id = p_evento and annullato_il is null order by passaggio desc limit 1;
  update public.eventi
     set ultimo_passaggio = prima,
         stato = case when prima is null then 'confermato' else 'in_corso' end::public.stato_evento
   where id = p_evento;
end $$;
revoke execute on function public.annulla_passaggio(uuid) from public, anon;
grant execute on function public.annulla_passaggio(uuid) to authenticated;
