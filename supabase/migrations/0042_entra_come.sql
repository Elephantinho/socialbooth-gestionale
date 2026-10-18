-- "Entra come": l'admin principale può usare l'app come un altro utente, per vedere esattamente
-- quello che vede lui (stessi permessi del database). L'accesso lo prepara la funzione
-- supabase/functions/entra-come, che controlla chi lo chiede; qui la lista di chi può farlo
-- e il registro di ogni accesso.

-- Chi può entrare come altri. Nessuno la legge o la scrive dall'app: si cambia solo da qui.
create table public.admin_principali (
  utente_id uuid primary key references public.profili(id) on delete cascade,
  aggiunto_il timestamptz not null default now()
);
alter table public.admin_principali enable row level security;
revoke all on table public.admin_principali from anon, authenticated;

insert into public.admin_principali (utente_id)
select id from auth.users where email = 'mohamedpato143@gmail.com';

/** Vero se chi chiama è un admin principale (attivo e ancora admin) */
create or replace function public.sono_principale() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_principali a join public.profili p on p.id = a.utente_id
    where a.utente_id = auth.uid() and p.ruolo = 'admin' and p.attivo
  )
$$;
revoke execute on function public.sono_principale() from public, anon;
grant execute on function public.sono_principale() to authenticated;

-- Registro: chi è entrato come chi, e quando. Lo scrive solo la funzione sul server.
create table public.accessi_come (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profili(id) on delete cascade,
  utente_id uuid not null references public.profili(id) on delete cascade,
  il timestamptz not null default now()
);
alter table public.accessi_come enable row level security;
revoke all on table public.accessi_come from anon, authenticated;
grant select on table public.accessi_come to authenticated;
create policy accessi_come_lettura on public.accessi_come for select to authenticated using (public.sono_principale());
create index accessi_come_il on public.accessi_come (il desc);
