-- Notifiche sul telefono (web push): ogni notifica nuova parte anche verso i dispositivi dell'utente.
create extension if not exists pg_net with schema extensions;

-- Dispositivi (browser/telefoni) su cui l'utente ha attivato le notifiche
create table public.dispositivi_push (
  id          uuid primary key default gen_random_uuid(),
  utente_id   uuid not null default auth.uid() references public.profili(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  descrizione text,
  creato_il   timestamptz not null default now()
);
create index dispositivi_push_utente_idx on public.dispositivi_push (utente_id);
alter table public.dispositivi_push enable row level security;
create policy dispositivi_propri on public.dispositivi_push for all to authenticated
  using (utente_id = auth.uid()) with check (utente_id = auth.uid());

-- Segreti del server (chiave privata VAPID, segreto del trigger): nessuno li legge dall'app.
-- I valori si inseriscono a mano dal SQL editor, mai nel codice.
create table public.segreti (chiave text primary key, valore text not null);
alter table public.segreti enable row level security;
revoke all on public.segreti from anon, authenticated;

-- Ogni notifica nuova → funzione invia-push (che la manda ai telefoni dell'utente)
create or replace function public.notifica_al_telefono()
returns trigger language plpgsql security definer set search_path = public
as $$
declare segreto text := (select valore from public.segreti where chiave = 'push_trigger');
begin
  if segreto is null or not exists (select 1 from public.dispositivi_push where utente_id = new.utente_id) then
    return null;
  end if;
  perform net.http_post(
    url := 'https://ltfzqnljmnbiqmbmvvfk.supabase.co/functions/v1/invia-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-segreto', segreto),
    body := jsonb_build_object('utente_id', new.utente_id, 'titolo', new.titolo, 'testo', new.testo, 'link', new.link, 'id', new.id)
  );
  return null;
end $$;
revoke execute on function public.notifica_al_telefono() from public, anon, authenticated;
create trigger notifiche_push after insert on public.notifiche
for each row execute function public.notifica_al_telefono();

-- Chiave pubblica per iscriversi alle notifiche (le chiavi le crea la funzione invia-push al primo uso)
create or replace function public.chiave_push() returns text
language sql stable security definer set search_path = public
as $$ select valore from public.segreti where chiave = 'vapid_pubblica' $$;
revoke execute on function public.chiave_push() from public, anon;
grant execute on function public.chiave_push() to authenticated;
