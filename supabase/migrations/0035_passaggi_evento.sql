-- Passaggi dell'operatore durante l'evento, in ordine:
-- check-in (macchina presa) → attrezzatura caricata → montato → smontato → rientrato e scaricato → check-out.
-- Il primo porta l'evento "in corso", l'ultimo "completato". Ogni passaggio avvisa l'ufficio
-- (project dell'evento, admin, gestori operatori). L'operatore può annullare l'ultimo entro 10 minuti.
create type public.passaggio as enum ('check_in', 'attrezzatura', 'montato', 'smontato', 'rientrato', 'check_out');

create table public.passaggi_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventi(id) on delete cascade,
  operatore_id uuid not null references public.profili(id),
  passaggio public.passaggio not null,
  fatto_il timestamptz not null default now(),
  annullato_il timestamptz
);
create unique index passaggi_evento_unico on public.passaggi_evento (evento_id, passaggio) where annullato_il is null;
create index passaggi_evento_evento on public.passaggi_evento (evento_id);

alter table public.eventi add column if not exists ultimo_passaggio public.passaggio;

alter table public.passaggi_evento enable row level security;
-- Li vede chi vede l'evento (decide la RLS di eventi); si scrivono solo con le funzioni
create policy passaggi_lettura on public.passaggi_evento for select to authenticated
  using (exists (select 1 from public.eventi e where e.id = evento_id));

create or replace function public.etichetta_passaggio(p public.passaggio) returns text
language sql immutable set search_path = '' as $$
  select case p
    when 'check_in' then 'ha fatto il check-in'
    when 'attrezzatura' then 'ha caricato l''attrezzatura'
    when 'montato' then 'ha montato'
    when 'smontato' then 'ha smontato'
    when 'rientrato' then 'è rientrato e ha scaricato'
    when 'check_out' then 'ha fatto il check-out'
  end
$$;

create or replace function public.avvisa_ufficio(p_evento uuid, p_titolo text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  for u in
    select project_id from public.eventi where id = p_evento
    union
    select id from public.profili where attivo and ruolo in ('admin', 'gestore_operatori')
  loop
    perform public.notifica(u, p_titolo, public.descrivi_evento(p_evento), '/gestione/eventi/' || p_evento);
  end loop;
end $$;
revoke execute on function public.avvisa_ufficio(uuid, text) from public, anon, authenticated;

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

  select trim(nome || ' ' || coalesce(cognome, '')) into chi from public.profili where id = auth.uid();
  perform public.avvisa_ufficio(p_evento, chi || ' ' || public.etichetta_passaggio(p_passaggio));
end $$;
revoke execute on function public.segna_passaggio(uuid, public.passaggio) from public, anon;
grant execute on function public.segna_passaggio(uuid, public.passaggio) to authenticated;

alter publication supabase_realtime add table public.passaggi_evento;
