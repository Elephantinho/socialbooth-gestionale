-- Il project non riceve più un avviso per ogni passaggio (con tanti eventi sono decine al giorno):
-- solo quando l'evento è concluso. I problemi (ritardi, rifiuti, scadenze) continuano ad arrivare.
-- L'andamento passo per passo resta visibile dal vivo nella scheda dell'evento.
create or replace function public.segna_passaggio(p_evento uuid, p_passaggio public.passaggio) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ev public.eventi;
  precedente public.passaggio;
  chi text;
begin
  select * into ev from public.eventi where id = p_evento for update;
  if not found or ev.operatore_id is distinct from auth.uid() then raise exception 'Non sei l''operatore di questo evento'; end if;
  if ev.stato not in ('confermato', 'in_corso') then raise exception 'L''evento non è confermato'; end if;
  if now() < ev.allestimento_il - interval '24 hours' then raise exception 'Troppo presto: puoi iniziare dal giorno prima'; end if;

  precedente := ev.ultimo_passaggio;
  if (precedente is null and p_passaggio <> 'check_in')
     or (precedente is not null and (select array_position(enum_range(null::public.passaggio), p_passaggio))
                                   <> (select array_position(enum_range(null::public.passaggio), precedente)) + 1) then
    raise exception 'Prima completa il passaggio precedente';
  end if;

  insert into public.passaggi_evento (evento_id, operatore_id, passaggio) values (p_evento, auth.uid(), p_passaggio);
  update public.eventi
     set ultimo_passaggio = p_passaggio,
         stato = case p_passaggio when 'check_in' then 'in_corso' when 'check_out' then 'completato' else stato end
   where id = p_evento;

  if p_passaggio = 'check_out' then
    select trim(nome || ' ' || coalesce(cognome, '')) into chi from public.profili where id = auth.uid();
    perform public.notifica(ev.project_id, 'Evento concluso', chi || ' ha fatto il check-out: ' || public.descrivi_evento(p_evento),
      '/gestione/eventi/' || p_evento);
  end if;
end $$;
