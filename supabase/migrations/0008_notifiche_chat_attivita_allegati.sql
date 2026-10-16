-- =========================================================
-- Notifiche in-app, chat per evento, attività (to-do),
-- allegati e foto (archivio privato), promemoria automatici
-- =========================================================

create type public.stato_attivita as enum ('da_fare', 'in_corso', 'fatto');
create type public.priorita as enum ('bassa', 'media', 'alta');

-- ---------- Notifiche ----------
create table public.notifiche (
  id         uuid primary key default gen_random_uuid(),
  utente_id  uuid not null references public.profili(id) on delete cascade,
  titolo     text not null,
  testo      text,
  link       text,
  letta      boolean not null default false,
  creata_il  timestamptz not null default now()
);
create index notifiche_utente_idx on public.notifiche (utente_id, letta, creata_il desc);

-- ---------- Chat dell'evento ----------
create table public.messaggi (
  id         uuid primary key default gen_random_uuid(),
  evento_id  uuid not null references public.eventi(id) on delete cascade,
  autore_id  uuid not null default auth.uid() references public.profili(id) on delete cascade,
  testo      text not null check (length(trim(testo)) > 0),
  creato_il  timestamptz not null default now()
);
create index messaggi_evento_idx on public.messaggi (evento_id, creato_il);

-- ---------- Attività (to-do, anche legate a un evento) ----------
create table public.attivita (
  id           uuid primary key default gen_random_uuid(),
  titolo       text not null,
  descrizione  text,
  evento_id    uuid references public.eventi(id) on delete cascade,
  assegnato_a  uuid references public.profili(id) on delete set null,
  scadenza     date,
  stato        public.stato_attivita not null default 'da_fare',
  priorita     public.priorita not null default 'media',
  creato_da    uuid default auth.uid() references public.profili(id) on delete set null,
  creato_il    timestamptz not null default now(),
  completata_il timestamptz
);
create index attivita_assegnato_idx on public.attivita (assegnato_a, stato);

-- ---------- Allegati dell'evento (brief, grafiche, planimetrie) ----------
create table public.allegati (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references public.eventi(id) on delete cascade,
  nome         text not null,
  percorso     text not null,          -- percorso nell'archivio "documenti"
  tipo         text,
  dimensione   integer,
  caricato_da  uuid default auth.uid() references public.profili(id) on delete set null,
  creato_il    timestamptz not null default now()
);

-- Promemoria ore già inviato per l'evento (per non mandarlo due volte)
alter table public.eventi add column if not exists promemoria_ore_inviato boolean not null default false;

-- =========================================================
-- Permessi
-- =========================================================
alter table public.notifiche enable row level security;
alter table public.messaggi  enable row level security;
alter table public.attivita  enable row level security;
alter table public.allegati  enable row level security;

create policy notifiche_proprie on public.notifiche for select to authenticated using (utente_id = auth.uid());
create policy notifiche_lette on public.notifiche for update to authenticated using (utente_id = auth.uid());
create policy notifiche_elimina on public.notifiche for delete to authenticated using (utente_id = auth.uid());

create policy messaggi_select on public.messaggi for select to authenticated
  using (public.gestisco_evento(evento_id) or public.lavoro_evento(evento_id));
create policy messaggi_insert on public.messaggi for insert to authenticated
  with check (autore_id = auth.uid() and (public.gestisco_evento(evento_id) or public.lavoro_evento(evento_id)));

create policy attivita_gestione on public.attivita for all to authenticated
  using (public.mio_ruolo() in ('admin','project')) with check (public.mio_ruolo() in ('admin','project'));
create policy attivita_mie_select on public.attivita for select to authenticated using (assegnato_a = auth.uid());
create policy attivita_mie_update on public.attivita for update to authenticated using (assegnato_a = auth.uid());

create policy allegati_select on public.allegati for select to authenticated
  using (public.gestisco_evento(evento_id) or public.lavoro_evento(evento_id));
create policy allegati_insert on public.allegati for insert to authenticated
  with check (public.gestisco_evento(evento_id) or public.lavoro_evento(evento_id));
create policy allegati_delete on public.allegati for delete to authenticated
  using (public.gestisco_evento(evento_id) or caricato_da = auth.uid());

-- ---------- Archivio privato "documenti" ----------
-- Percorsi: eventi/<id evento>/<file>. Lo vede solo chi gestisce o lavora l'evento.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documenti', 'documenti', false, 20971520)
on conflict (id) do nothing;

create or replace function public.accesso_percorso_evento(p_nome text, p_gestione boolean default false)
returns boolean language plpgsql stable security definer set search_path = public
as $$
declare
  parti text[] := storage.foldername(p_nome);
  ev uuid;
begin
  if parti[1] is distinct from 'eventi' or parti[2] !~ '^[0-9a-f-]{36}$' then return false; end if;
  ev := parti[2]::uuid;
  return public.gestisco_evento(ev) or (not p_gestione and public.lavoro_evento(ev));
end $$;
revoke execute on function public.accesso_percorso_evento(text, boolean) from public, anon;
grant execute on function public.accesso_percorso_evento(text, boolean) to authenticated;

create policy documenti_lettura on storage.objects for select to authenticated
  using (bucket_id = 'documenti' and public.accesso_percorso_evento(name));
create policy documenti_caricamento on storage.objects for insert to authenticated
  with check (bucket_id = 'documenti' and public.accesso_percorso_evento(name));
create policy documenti_eliminazione on storage.objects for delete to authenticated
  using (bucket_id = 'documenti' and public.accesso_percorso_evento(name, true));

-- =========================================================
-- Notifiche automatiche
-- =========================================================
create or replace function public.notifica(p_utente uuid, p_titolo text, p_testo text, p_link text)
returns void language sql security definer set search_path = public
as $$ insert into public.notifiche (utente_id, titolo, testo, link)
      select p_utente, p_titolo, p_testo, p_link where p_utente is not null $$;
revoke execute on function public.notifica(uuid, text, text, text) from public, anon, authenticated;

-- Descrizione breve di un evento: "Photobooth · Firenze · 28/10"
create or replace function public.descrivi_evento(p_evento uuid)
returns text language sql stable security definer set search_path = public
as $$
  select coalesce(t.nome, 'Evento') || ' · ' || e.citta || ' · ' || to_char(e.allestimento_il at time zone 'Europe/Rome', 'DD/MM')
  from public.eventi e left join public.tipi_booth t on t.id = e.tipo_booth_id where e.id = p_evento
$$;
revoke execute on function public.descrivi_evento(uuid) from public, anon, authenticated;

-- Proposte: nuovo incarico all'operatore; risposta al project
create or replace function public.notifiche_proposte()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ev public.eventi;
begin
  select * into ev from public.eventi where id = new.evento_id;
  if tg_op = 'INSERT' then
    perform public.notifica(new.operatore_id, 'Nuovo incarico da accettare', public.descrivi_evento(new.evento_id), '/operatore');
  elsif new.stato is distinct from old.stato and new.stato in ('accettata', 'rifiutata', 'scaduta') then
    perform public.notifica(ev.project_id,
      case new.stato when 'accettata' then 'Incarico accettato' when 'rifiutata' then 'Incarico rifiutato' else 'Proposta scaduta' end,
      (select nome || ' ' || cognome from public.profili where id = new.operatore_id) || ' · ' || public.descrivi_evento(new.evento_id),
      '/gestione/eventi/' || new.evento_id);
  end if;
  return null;
end $$;
revoke execute on function public.notifiche_proposte() from public, anon, authenticated;
create trigger proposte_notifiche after insert or update of stato on public.proposte
for each row execute function public.notifiche_proposte();

-- Eventi: modifiche importanti o annullamento avvisano l'operatore
create or replace function public.notifiche_eventi()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.operatore_id is null then return null; end if;
  if new.stato = 'annullato' and old.stato <> 'annullato' then
    perform public.notifica(old.operatore_id, 'Evento annullato', public.descrivi_evento(new.id), '/operatore');
  elsif new.operatore_id = old.operatore_id and new.stato in ('proposto', 'confermato') and (
        new.allestimento_il is distinct from old.allestimento_il or new.smontaggio_il is distinct from old.smontaggio_il
     or new.inizio_attivazione is distinct from old.inizio_attivazione or new.fine_attivazione is distinct from old.fine_attivazione
     or new.indirizzo is distinct from old.indirizzo or new.note_accesso is distinct from old.note_accesso
     or new.ritiro_magazzino_il is distinct from old.ritiro_magazzino_il) then
    perform public.notifica(new.operatore_id, 'Evento modificato', 'Controlla orari e dettagli · ' || public.descrivi_evento(new.id),
      '/operatore/eventi/' || new.id);
  end if;
  return null;
end $$;
revoke execute on function public.notifiche_eventi() from public, anon, authenticated;
create trigger eventi_notifiche after update on public.eventi
for each row execute function public.notifiche_eventi();

-- Ore: chiusura avvisa il project, approvazione avvisa l'operatore
create or replace function public.notifiche_ore()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ev public.eventi;
begin
  select * into ev from public.eventi where id = new.evento_id;
  if new.check_out_il is not null and (tg_op = 'INSERT' or old.check_out_il is null) then
    perform public.notifica(ev.project_id, 'Ore da approvare', public.descrivi_evento(new.evento_id), '/gestione/eventi/' || new.evento_id);
  end if;
  if tg_op = 'UPDATE' and new.stato is distinct from old.stato and new.stato in ('approvato', 'respinto') then
    perform public.notifica(new.operatore_id, case new.stato when 'approvato' then 'Ore approvate' else 'Ore respinte' end,
      public.descrivi_evento(new.evento_id), '/operatore/ore');
  end if;
  return null;
end $$;
revoke execute on function public.notifiche_ore() from public, anon, authenticated;
create trigger ore_notifiche after insert or update on public.ore_lavorate
for each row execute function public.notifiche_ore();

-- Chat: avvisa l'altra parte
create or replace function public.notifiche_messaggi()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ev public.eventi; autore text;
begin
  select * into ev from public.eventi where id = new.evento_id;
  select trim(nome || ' ' || cognome) into autore from public.profili where id = new.autore_id;
  if new.autore_id = ev.operatore_id then
    perform public.notifica(ev.project_id, 'Messaggio da ' || autore, left(new.testo, 120), '/gestione/eventi/' || ev.id);
  else
    perform public.notifica(ev.operatore_id, 'Messaggio da ' || autore, left(new.testo, 120), '/operatore/eventi/' || ev.id);
  end if;
  return null;
end $$;
revoke execute on function public.notifiche_messaggi() from public, anon, authenticated;
create trigger messaggi_notifiche after insert on public.messaggi
for each row execute function public.notifiche_messaggi();

-- Attività assegnate
create or replace function public.notifiche_attivita()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.assegnato_a is not null and new.assegnato_a is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.assegnato_a is distinct from old.assegnato_a) then
    perform public.notifica(new.assegnato_a, 'Nuova attività per te', new.titolo,
      case when (select ruolo from public.profili where id = new.assegnato_a) = 'operatore' then '/operatore' else '/gestione/attivita' end);
  end if;
  if tg_op = 'UPDATE' and new.stato = 'fatto' and old.stato <> 'fatto' then
    new.completata_il := now();
  end if;
  return new;
end $$;
revoke execute on function public.notifiche_attivita() from public, anon, authenticated;
create trigger attivita_notifiche before insert or update on public.attivita
for each row execute function public.notifiche_attivita();

-- =========================================================
-- Promemoria e scadenze (eseguiti ogni 15 minuti)
-- =========================================================

-- Chi ha lasciato scadere una proposta non la riceve di nuovo in automatico
create or replace function public._operatori_disponibili(p_evento uuid)
returns setof public.profili
language sql stable security definer set search_path = public
as $$
  select p.*
  from public.profili p
  join public.eventi e on e.id = p_evento
  join public.zone_operatore z on z.operatore_id = p.id and z.regione = e.regione
  where p.ruolo = 'operatore' and p.attivo
    and not exists (
      select 1 from public.proposte pr
      where pr.evento_id = e.id and pr.operatore_id = p.id and pr.stato in ('rifiutata', 'scaduta'))
    and not exists (
      select 1 from public.indisponibilita i
      where i.operatore_id = p.id
        and e.allestimento_il::date between i.dal and i.al)
    and not exists (
      select 1 from public.eventi altro
      where altro.operatore_id = p.id and altro.id <> e.id
        and altro.stato not in ('annullato')
        and tstzrange(altro.allestimento_il, altro.smontaggio_il)
         && tstzrange(e.allestimento_il, e.smontaggio_il))
$$;

create or replace function public.controlla_scadenze()
returns void language plpgsql security definer set search_path = public
as $$
declare p record;
begin
  -- Proposte scadute senza risposta: l'evento torna da assegnare
  for p in update public.proposte set stato = 'scaduta', risposta_il = now()
           where stato = 'in_attesa' and scade_il < now() returning evento_id
  loop
    update public.eventi set stato = 'da_assegnare', operatore_id = null where id = p.evento_id and stato = 'proposto';
  end loop;

  -- Eventi finiti da più di 12 ore senza ore inviate: promemoria all'operatore
  for p in select id, operatore_id from public.eventi
           where stato in ('confermato', 'in_corso') and not promemoria_ore_inviato
             and smontaggio_il < now() - interval '12 hours' and operatore_id is not null
  loop
    perform public.notifica(p.operatore_id, 'Ricordati di inviare le ore', public.descrivi_evento(p.id), '/operatore/eventi/' || p.id);
    update public.eventi set promemoria_ore_inviato = true where id = p.id;
  end loop;

  -- Promemoria il giorno prima dell'evento
  for p in select id, operatore_id from public.eventi
           where stato = 'confermato' and operatore_id is not null
             and allestimento_il between now() + interval '23 hours 45 minutes' and now() + interval '24 hours'
  loop
    perform public.notifica(p.operatore_id, 'Domani hai un evento', public.descrivi_evento(p.id), '/operatore/eventi/' || p.id);
  end loop;
end $$;
revoke execute on function public.controlla_scadenze() from public, anon, authenticated;

-- Tempo reale
alter publication supabase_realtime add table public.notifiche, public.messaggi, public.attivita;
