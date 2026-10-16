-- =========================================================
-- Gestionale Social Booth — schema iniziale
-- Ruoli: admin (vede tutto), project (gestisce eventi), operatore (app)
-- Compenso: a ore, tempo di viaggio incluso
-- =========================================================

-- ---------- Tipi ----------
create type public.ruolo as enum ('admin', 'project', 'operatore');

create type public.regione as enum (
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria','Valle d''Aosta','Veneto'
);

create type public.stato_evento as enum (
  'bozza',          -- in compilazione dal project
  'da_assegnare',   -- pronto, in attesa di operatore
  'proposto',       -- proposto a un operatore, attende risposta
  'confermato',     -- operatore ha accettato
  'in_corso',       -- check-in fatto
  'completato',     -- check-out fatto
  'annullato'
);

create type public.stato_proposta as enum ('in_attesa', 'accettata', 'rifiutata', 'scaduta', 'revocata');
create type public.stato_approvazione as enum ('inviato', 'approvato', 'respinto');

-- ---------- Profili (uno per utente) ----------
create table public.profili (
  id              uuid primary key references auth.users(id) on delete cascade,
  ruolo           public.ruolo not null default 'operatore',
  nome            text not null default '',
  telefono        text,
  tariffa_oraria  numeric(8,2),          -- solo operatori
  magazzino_id    uuid,                  -- magazzino di riferimento (operatori)
  attivo          boolean not null default true,
  creato_il       timestamptz not null default now()
);

-- Regioni coperte da ciascun operatore
create table public.zone_operatore (
  operatore_id  uuid not null references public.profili(id) on delete cascade,
  regione       public.regione not null,
  primary key (operatore_id, regione)
);

-- Giorni in cui l'operatore NON è disponibile
create table public.indisponibilita (
  id            uuid primary key default gen_random_uuid(),
  operatore_id  uuid not null references public.profili(id) on delete cascade,
  dal           date not null,
  al            date not null,
  motivo        text,
  check (al >= dal)
);

-- ---------- Anagrafiche ----------
create table public.magazzini (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  indirizzo  text not null,
  citta      text not null,
  regione    public.regione not null,
  lat        double precision,
  lng        double precision,
  note       text
);

alter table public.profili
  add constraint profili_magazzino_fk foreign key (magazzino_id)
  references public.magazzini(id) on delete set null;

create table public.clienti (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  project_id   uuid references public.profili(id) on delete set null,  -- project che lo segue
  email        text,
  telefono     text,
  note         text,
  creato_il    timestamptz not null default now()
);

create table public.tipi_booth (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique
);

-- Location salvate: riusabili negli eventi successivi
create table public.location (
  id                 uuid primary key default gen_random_uuid(),
  nome               text,
  indirizzo          text not null,
  citta              text not null,
  regione            public.regione not null,
  lat                double precision,
  lng                double precision,
  note_accesso       text,      -- scarico, scale, sosta mezzo...
  ztl                boolean,
  wifi               boolean,
  foto_ingresso      text,      -- percorso in Storage
  creato_il          timestamptz not null default now()
);

-- ---------- Eventi ----------
create table public.eventi (
  id                    uuid primary key default gen_random_uuid(),
  codice                serial unique,
  stato                 public.stato_evento not null default 'bozza',

  cliente_id            uuid references public.clienti(id) on delete set null,
  project_id            uuid not null references public.profili(id),
  tipo_booth_id         uuid references public.tipi_booth(id) on delete set null,

  -- Luogo (copiato dalla location salvata, modificabile per il singolo evento)
  location_id           uuid references public.location(id) on delete set null,
  indirizzo             text not null,
  citta                 text not null,
  regione               public.regione not null,
  note_accesso          text,
  ztl                   boolean not null default false,
  wifi                  boolean not null default false,

  -- Orari
  allestimento_il       timestamptz not null,
  inizio_attivazione    timestamptz not null,
  fine_attivazione      timestamptz not null,
  smontaggio_il         timestamptz not null,

  -- Persone e dettagli
  hostess               boolean not null default false,
  outfit                text,
  referente_nome        text,
  referente_telefono    text,
  note                  text,

  -- Assegnazione e logistica
  operatore_id          uuid references public.profili(id) on delete set null,
  magazzino_id          uuid references public.magazzini(id) on delete set null,
  viaggio_minuti        integer,          -- magazzino → evento (stimato)
  ritiro_magazzino_il   timestamptz,      -- calcolato: allestimento - viaggio - margine

  creato_il             timestamptz not null default now(),
  aggiornato_il         timestamptz not null default now(),

  check (inizio_attivazione >= allestimento_il),
  check (fine_attivazione >= inizio_attivazione),
  check (smontaggio_il >= fine_attivazione)
);

create index eventi_operatore_idx on public.eventi (operatore_id, allestimento_il);
create index eventi_project_idx   on public.eventi (project_id, allestimento_il);
create index eventi_regione_idx   on public.eventi (regione, allestimento_il);

-- Storico delle proposte agli operatori (accetta / rifiuta)
create table public.proposte (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.eventi(id) on delete cascade,
  operatore_id  uuid not null references public.profili(id) on delete cascade,
  stato         public.stato_proposta not null default 'in_attesa',
  automatica    boolean not null default false,   -- true se unico operatore in zona
  scade_il      timestamptz,
  risposta_il   timestamptz,
  creato_il     timestamptz not null default now()
);

create index proposte_operatore_idx on public.proposte (operatore_id, stato);

-- ---------- Ore lavorate (una scheda per evento/operatore) ----------
create table public.ore_lavorate (
  id                     uuid primary key default gen_random_uuid(),
  evento_id              uuid not null references public.eventi(id) on delete cascade,
  operatore_id           uuid not null references public.profili(id) on delete cascade,

  check_in_il            timestamptz,
  check_in_lat           double precision,
  check_in_lng           double precision,
  check_in_foto          text,
  check_out_il           timestamptz,

  minuti_in_location     integer not null default 0,
  minuti_viaggio         integer not null default 0,   -- andata + ritorno, pagati
  minuti_totali          integer generated always as (minuti_in_location + minuti_viaggio) stored,
  tariffa_oraria         numeric(8,2),                 -- fotografata al momento dell'invio
  compenso               numeric(10,2) generated always as
                           (round((minuti_in_location + minuti_viaggio) / 60.0 * coalesce(tariffa_oraria, 0), 2)) stored,

  nota_operatore         text,       -- obbligatoria se modifica gli orari previsti
  stato                  public.stato_approvazione not null default 'inviato',
  approvato_da           uuid references public.profili(id),
  approvato_il           timestamptz,
  creato_il              timestamptz not null default now(),

  unique (evento_id, operatore_id)
);

-- Rimborsi spese
create table public.spese (
  id             uuid primary key default gen_random_uuid(),
  evento_id      uuid not null references public.eventi(id) on delete cascade,
  operatore_id   uuid not null references public.profili(id) on delete cascade,
  tipo           text not null,          -- carburante, pedaggio, parcheggio, altro
  importo        numeric(10,2) not null check (importo >= 0),
  scontrino      text,                   -- percorso in Storage
  descrizione    text,
  stato          public.stato_approvazione not null default 'inviato',
  creato_il      timestamptz not null default now()
);

-- =========================================================
-- Funzioni di supporto
-- =========================================================

-- Ruolo dell'utente corrente (usata nelle policy)
create or replace function public.mio_ruolo()
returns public.ruolo
language sql stable security definer set search_path = public
as $$ select ruolo from public.profili where id = auth.uid() $$;

-- Aggiorna "aggiornato_il"
create or replace function public.tocca_aggiornato()
returns trigger language plpgsql set search_path = public as $$
begin new.aggiornato_il := now(); return new; end $$;

create trigger eventi_aggiornato before update on public.eventi
for each row execute function public.tocca_aggiornato();

-- Nuovo utente → profilo operatore (il ruolo lo cambia un admin)
create or replace function public.crea_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profili (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.crea_profilo();

-- Solo un admin può cambiare ruolo, tariffa o stato attivo
create or replace function public.proteggi_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.mio_ruolo() is distinct from 'admin' and (
       new.ruolo is distinct from old.ruolo
    or new.tariffa_oraria is distinct from old.tariffa_oraria
    or new.attivo is distinct from old.attivo) then
    raise exception 'Solo un admin può modificare ruolo, tariffa o stato';
  end if;
  return new;
end $$;

create trigger profili_protetti before update on public.profili
for each row execute function public.proteggi_profilo();

-- Operatori disponibili per un evento: attivi, coprono la regione,
-- non indisponibili quel giorno, senza altri eventi sovrapposti,
-- e che non hanno già rifiutato questo evento.
-- Versione interna (usata dall'assegnazione automatica, non esposta all'app)
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
      where pr.evento_id = e.id and pr.operatore_id = p.id and pr.stato = 'rifiutata')
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

-- Versione per l'app: solo admin e project del evento possono vedere i candidati
create or replace function public.operatori_disponibili(p_evento uuid)
returns setof public.profili
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.mio_ruolo() = 'admin'
     or exists (select 1 from public.eventi where id = p_evento and project_id = auth.uid()) then
    return query select * from public._operatori_disponibili(p_evento);
  end if;
end $$;

-- Assegnazione automatica: se c'è UN solo operatore disponibile, l'evento va a lui.
-- Se ce ne sono di più, resta "da_assegnare" e sceglie il project.
create or replace function public.assegna_automaticamente(p_evento uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
  v_op    uuid;
begin
  select count(*), min(id::text)::uuid into v_count, v_op
  from public._operatori_disponibili(p_evento);

  if v_count = 1 then
    update public.eventi
       set operatore_id = v_op,
           magazzino_id = coalesce(magazzino_id, (select magazzino_id from public.profili where id = v_op)),
           stato = 'proposto'
     where id = p_evento;

    insert into public.proposte (evento_id, operatore_id, automatica, scade_il)
    values (p_evento, v_op, true, now() + interval '24 hours');
    return v_op;
  end if;
  return null;
end $$;

-- Quando un evento passa a "da_assegnare" prova l'assegnazione automatica
create or replace function public.trigger_assegnazione()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.stato = 'da_assegnare' and new.operatore_id is null
     and (tg_op = 'INSERT' or old.stato is distinct from 'da_assegnare') then
    perform public.assegna_automaticamente(new.id);
  end if;
  return null;
end $$;

create trigger eventi_assegnazione after insert or update of stato on public.eventi
for each row execute function public.trigger_assegnazione();

-- Il project sceglie manualmente un operatore
create or replace function public.proponi_operatore(p_evento uuid, p_operatore uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.mio_ruolo() not in ('admin','project') then
    raise exception 'Non autorizzato';
  end if;
  if public.mio_ruolo() = 'project' and not exists
     (select 1 from public.eventi where id = p_evento and project_id = auth.uid()) then
    raise exception 'Evento non tuo';
  end if;
  if not exists (select 1 from public.profili
                 where id = p_operatore and ruolo = 'operatore' and attivo) then
    raise exception 'Operatore non valido';
  end if;

  update public.proposte set stato = 'revocata'
   where evento_id = p_evento and stato = 'in_attesa';

  update public.eventi
     set operatore_id = p_operatore,
         magazzino_id = coalesce(magazzino_id, (select magazzino_id from public.profili where id = p_operatore)),
         stato = 'proposto'
   where id = p_evento;

  insert into public.proposte (evento_id, operatore_id, scade_il)
  values (p_evento, p_operatore, now() + interval '24 hours');
end $$;

-- L'operatore accetta o rifiuta
create or replace function public.rispondi_proposta(p_proposta uuid, p_accetta boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare v public.proposte;
begin
  select * into v from public.proposte
   where id = p_proposta and operatore_id = auth.uid() and stato = 'in_attesa';
  if not found then raise exception 'Proposta non valida'; end if;

  update public.proposte
     set stato = case when p_accetta then 'accettata' else 'rifiutata' end::public.stato_proposta,
         risposta_il = now()
   where id = p_proposta;

  if p_accetta then
    update public.eventi set stato = 'confermato' where id = v.evento_id;
  else
    update public.eventi set stato = 'da_assegnare', operatore_id = null where id = v.evento_id;
  end if;
end $$;

-- Check-in dell'operatore
create or replace function public.check_in(p_evento uuid, p_lat double precision, p_lng double precision, p_foto text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.eventi
                 where id = p_evento and operatore_id = auth.uid() and stato = 'confermato') then
    raise exception 'Evento non disponibile per il check-in';
  end if;

  insert into public.ore_lavorate (evento_id, operatore_id, check_in_il, check_in_lat, check_in_lng, check_in_foto)
  values (p_evento, auth.uid(), now(), p_lat, p_lng, p_foto)
  on conflict (evento_id, operatore_id) do update
     set check_in_il = excluded.check_in_il, check_in_lat = excluded.check_in_lat,
         check_in_lng = excluded.check_in_lng, check_in_foto = excluded.check_in_foto;

  update public.eventi set stato = 'in_corso' where id = p_evento;
end $$;

-- Fine evento: l'operatore conferma ore in location e viaggio
create or replace function public.chiudi_evento(p_evento uuid, p_minuti_location int, p_minuti_viaggio int, p_nota text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.eventi
                 where id = p_evento and operatore_id = auth.uid() and stato in ('confermato','in_corso')) then
    raise exception 'Evento non chiudibile';
  end if;

  insert into public.ore_lavorate (evento_id, operatore_id, check_out_il, minuti_in_location, minuti_viaggio, nota_operatore, tariffa_oraria)
  values (p_evento, auth.uid(), now(), p_minuti_location, p_minuti_viaggio, p_nota,
          (select tariffa_oraria from public.profili where id = auth.uid()))
  on conflict (evento_id, operatore_id) do update
     set check_out_il = now(),
         minuti_in_location = excluded.minuti_in_location,
         minuti_viaggio = excluded.minuti_viaggio,
         nota_operatore = excluded.nota_operatore,
         tariffa_oraria = excluded.tariffa_oraria,
         stato = 'inviato';

  update public.eventi set stato = 'completato' where id = p_evento;
end $$;

-- Riepilogo mensile per operatore (solo ore approvate)
create or replace view public.riepilogo_mensile
with (security_invoker = true) as
select
  o.operatore_id,
  date_trunc('month', e.allestimento_il)::date as mese,
  count(*)                                     as eventi,
  sum(o.minuti_in_location)                    as minuti_in_location,
  sum(o.minuti_viaggio)                        as minuti_viaggio,
  sum(o.minuti_totali)                         as minuti_totali,
  sum(o.compenso)                              as compenso
from public.ore_lavorate o
join public.eventi e on e.id = o.evento_id
where o.stato = 'approvato'
group by o.operatore_id, date_trunc('month', e.allestimento_il);

-- =========================================================
-- Sicurezza (RLS): ognuno vede solo ciò che gli serve
-- =========================================================
alter table public.profili          enable row level security;
alter table public.zone_operatore   enable row level security;
alter table public.indisponibilita  enable row level security;
alter table public.magazzini        enable row level security;
alter table public.clienti          enable row level security;
alter table public.tipi_booth       enable row level security;
alter table public.location         enable row level security;
alter table public.eventi           enable row level security;
alter table public.proposte         enable row level security;
alter table public.ore_lavorate     enable row level security;
alter table public.spese            enable row level security;

-- Profili: ognuno vede il proprio; admin e project vedono tutti
create policy profili_select on public.profili for select to authenticated
  using (id = auth.uid() or public.mio_ruolo() in ('admin','project'));
create policy profili_update on public.profili for update to authenticated
  using (id = auth.uid() or public.mio_ruolo() = 'admin');

-- Zone: lettura per admin/project e per l'operatore stesso; scrittura admin
create policy zone_select on public.zone_operatore for select to authenticated
  using (operatore_id = auth.uid() or public.mio_ruolo() in ('admin','project'));
create policy zone_write on public.zone_operatore for all to authenticated
  using (public.mio_ruolo() = 'admin') with check (public.mio_ruolo() = 'admin');

-- Indisponibilità: l'operatore gestisce le sue; admin/project leggono
create policy indisp_select on public.indisponibilita for select to authenticated
  using (operatore_id = auth.uid() or public.mio_ruolo() in ('admin','project'));
create policy indisp_write on public.indisponibilita for all to authenticated
  using (operatore_id = auth.uid() or public.mio_ruolo() = 'admin')
  with check (operatore_id = auth.uid() or public.mio_ruolo() = 'admin');

-- Anagrafiche: tutti gli autenticati leggono; admin/project scrivono (magazzini solo admin)
create policy magazzini_select on public.magazzini for select to authenticated using (true);
create policy magazzini_write  on public.magazzini for all to authenticated
  using (public.mio_ruolo() = 'admin') with check (public.mio_ruolo() = 'admin');

create policy tipi_select on public.tipi_booth for select to authenticated using (true);
create policy tipi_write  on public.tipi_booth for all to authenticated
  using (public.mio_ruolo() = 'admin') with check (public.mio_ruolo() = 'admin');

create policy location_select on public.location for select to authenticated using (true);
create policy location_write  on public.location for all to authenticated
  using (public.mio_ruolo() in ('admin','project')) with check (public.mio_ruolo() in ('admin','project'));

create policy clienti_select on public.clienti for select to authenticated
  using (public.mio_ruolo() in ('admin','project'));
create policy clienti_write on public.clienti for all to authenticated
  using (public.mio_ruolo() in ('admin','project')) with check (public.mio_ruolo() in ('admin','project'));

-- Eventi
create policy eventi_admin on public.eventi for all to authenticated
  using (public.mio_ruolo() = 'admin') with check (public.mio_ruolo() = 'admin');
create policy eventi_project on public.eventi for all to authenticated
  using (public.mio_ruolo() = 'project' and project_id = auth.uid())
  with check (public.mio_ruolo() = 'project' and project_id = auth.uid());
create policy eventi_operatore_select on public.eventi for select to authenticated
  using (operatore_id = auth.uid());
-- (l'operatore modifica gli eventi solo tramite le funzioni rispondi_proposta / check_in / chiudi_evento)

-- Proposte
create policy proposte_select on public.proposte for select to authenticated
  using (operatore_id = auth.uid()
      or public.mio_ruolo() = 'admin'
      or exists (select 1 from public.eventi e where e.id = evento_id and e.project_id = auth.uid()));

-- Ore lavorate: l'operatore legge le sue; project legge e approva quelle dei suoi eventi
create policy ore_select on public.ore_lavorate for select to authenticated
  using (operatore_id = auth.uid()
      or public.mio_ruolo() = 'admin'
      or exists (select 1 from public.eventi e where e.id = evento_id and e.project_id = auth.uid()));
create policy ore_approva on public.ore_lavorate for update to authenticated
  using (public.mio_ruolo() = 'admin'
      or exists (select 1 from public.eventi e where e.id = evento_id and e.project_id = auth.uid()));

-- Spese
create policy spese_select on public.spese for select to authenticated
  using (operatore_id = auth.uid()
      or public.mio_ruolo() = 'admin'
      or exists (select 1 from public.eventi e where e.id = evento_id and e.project_id = auth.uid()));
create policy spese_insert on public.spese for insert to authenticated
  with check (operatore_id = auth.uid()
      and exists (select 1 from public.eventi e where e.id = evento_id and e.operatore_id = auth.uid()));
create policy spese_approva on public.spese for update to authenticated
  using (public.mio_ruolo() = 'admin'
      or exists (select 1 from public.eventi e where e.id = evento_id and e.project_id = auth.uid()));

-- Funzioni chiamabili dall'app
revoke all on function public.assegna_automaticamente(uuid)  from public, anon, authenticated;
revoke all on function public._operatori_disponibili(uuid)   from public, anon, authenticated;
revoke all on function public.operatori_disponibili(uuid)    from public, anon;
grant execute on function public.operatori_disponibili(uuid)            to authenticated;
grant execute on function public.proponi_operatore(uuid, uuid)          to authenticated;
grant execute on function public.rispondi_proposta(uuid, boolean)       to authenticated;
grant execute on function public.check_in(uuid, double precision, double precision, text) to authenticated;
grant execute on function public.chiudi_evento(uuid, int, int, text)    to authenticated;

-- Dati di base
insert into public.tipi_booth (nome) values ('Photobooth'), ('Mirror booth'), ('360°');
