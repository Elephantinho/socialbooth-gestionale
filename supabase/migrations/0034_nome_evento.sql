-- Ogni evento ha il suo nome (es. "Matrimonio Rossi", "Gala Gucci"): è il titolo in tutta l'app.
alter table public.eventi add column if not exists nome text check (nome is null or length(trim(nome)) between 1 and 120);

-- Notifiche: "Matrimonio Rossi a Firenze, 18/10"; se manca il nome, il servizio
create or replace function public.descrivi_evento(p_evento uuid) returns text
language sql stable security definer set search_path to 'public' as $$
  select coalesce(nullif(trim(e.nome), ''), t.nome, 'Evento') || ' a ' || e.citta || ', ' || to_char(e.allestimento_il at time zone 'Europe/Rome', 'DD/MM')
  from public.eventi e left join public.tipi_booth t on t.id = e.tipo_booth_id where e.id = p_evento
$$;

comment on column public.eventi.hostess is 'L''operatore fa anche da steward (con l''outfit indicato)';
