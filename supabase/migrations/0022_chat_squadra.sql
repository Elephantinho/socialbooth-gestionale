-- Chat della squadra: un canale per tutti ("squadra") e messaggi diretti tra due persone.
-- Canale diretto: 'dm:<uuid più piccolo>:<uuid più grande>'.
create table public.chat_messaggi (
  id        uuid primary key default gen_random_uuid(),
  canale    text not null check (canale = 'squadra' or canale ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'),
  autore_id uuid not null default auth.uid() references public.profili(id) on delete cascade,
  testo     text not null check (length(trim(testo)) between 1 and 4000),
  creato_il timestamptz not null default now()
);
create index chat_messaggi_canale_idx on public.chat_messaggi (canale, creato_il desc);
alter table public.chat_messaggi enable row level security;

-- Fino a quando ognuno ha letto ogni canale (per i "non letti")
create table public.chat_letture (
  utente_id uuid not null default auth.uid() references public.profili(id) on delete cascade,
  canale    text not null,
  letto_il  timestamptz not null default now(),
  primary key (utente_id, canale)
);
alter table public.chat_letture enable row level security;
create policy chat_letture_proprie on public.chat_letture for all to authenticated
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());

-- Ultima volta visto online (per "visto 10 min fa")
alter table public.profili add column if not exists visto_il timestamptz;

create or replace function public.posso_leggere_canale(p_canale text) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profili where id = auth.uid() and attivo)
     and (p_canale = 'squadra' or p_canale like '%' || auth.uid()::text || '%')
$$;
revoke execute on function public.posso_leggere_canale(text) from public, anon;
grant execute on function public.posso_leggere_canale(text) to authenticated;

create policy chat_select on public.chat_messaggi for select to authenticated using (public.posso_leggere_canale(canale));
create policy chat_insert on public.chat_messaggi for insert to authenticated
  with check (autore_id = auth.uid() and public.posso_leggere_canale(canale));
create policy chat_delete on public.chat_messaggi for delete to authenticated using (autore_id = auth.uid());

-- Elenco delle persone con cui chattare: tutti gli attivi (nome, foto, ruolo, visto), visibile anche agli operatori
create or replace function public.persone_squadra()
returns table (id uuid, nome text, cognome text, foto text, ruolo public.ruolo, visto_il timestamptz, regioni text[])
language sql stable security definer set search_path = public
as $$
  select p.id, p.nome, p.cognome, p.foto, p.ruolo, p.visto_il,
         array(select z.regione::text from public.zone_operatore z where z.operatore_id = p.id order by 1)
  from public.profili p
  where p.attivo and exists (select 1 from public.profili io where io.id = auth.uid() and io.attivo)
  order by p.nome, p.cognome
$$;
revoke execute on function public.persone_squadra() from public, anon;
grant execute on function public.persone_squadra() to authenticated;

create or replace function public.segna_visto() returns void
language sql security definer set search_path = public
as $$ update public.profili set visto_il = now() where id = auth.uid() $$;
revoke execute on function public.segna_visto() from public, anon;
grant execute on function public.segna_visto() to authenticated;

-- Messaggio diretto → notifica (anche sul telefono) a chi lo riceve
create or replace function public.notifica_chat()
returns trigger language plpgsql security definer set search_path = public
as $$
declare altro uuid; chi text;
begin
  if new.canale like 'dm:%' then
    altro := (select x::uuid from unnest(string_to_array(substr(new.canale, 4), ':')) x where x::uuid <> new.autore_id limit 1);
    select trim(nome || ' ' || cognome) into chi from public.profili where id = new.autore_id;
    perform public.notifica(altro, 'Messaggio da ' || chi, left(new.testo, 140), '/squadra?con=' || new.autore_id);
  end if;
  return null;
end $$;
revoke execute on function public.notifica_chat() from public, anon, authenticated;
create trigger chat_notifica after insert on public.chat_messaggi
for each row execute function public.notifica_chat();

alter publication supabase_realtime add table public.chat_messaggi;

-- Non letti per canale (solo i messaggi degli altri)
create or replace function public.chat_non_letti()
returns table (canale text, non_letti bigint, ultimo timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.canale,
         count(*) filter (where m.autore_id <> auth.uid() and m.creato_il > coalesce(l.letto_il, '-infinity')),
         max(m.creato_il)
  from public.chat_messaggi m
  left join public.chat_letture l on l.utente_id = auth.uid() and l.canale = m.canale
  where public.posso_leggere_canale(m.canale)
  group by m.canale
$$;
revoke execute on function public.chat_non_letti() from public, anon;
grant execute on function public.chat_non_letti() to authenticated;
