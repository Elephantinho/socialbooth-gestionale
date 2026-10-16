-- =========================================================
-- Attrezzatura dei magazzini, costi previsti/finali degli eventi,
-- carte aziendali, ricavo e fattura
-- =========================================================

create type public.stato_articolo as enum ('disponibile', 'in_manutenzione', 'fuori_uso');
create type public.fase_costo as enum ('previsto', 'finale');
create type public.categoria_costo as enum (
  'noleggio_veicolo', 'carburante', 'pedaggi', 'parcheggio',
  'carta_stampe', 'vitto', 'alloggio', 'materiali', 'altro'
);
create type public.pagamento as enum ('carta_aziendale', 'operatore', 'azienda');

-- ---------- Attrezzatura (inventario per magazzino) ----------
create table public.articoli (
  id            uuid primary key default gen_random_uuid(),
  magazzino_id  uuid not null references public.magazzini(id) on delete cascade,
  nome          text not null,
  categoria     text not null default 'Altro',   -- Booth, Stampanti, Consumabili, Props, Illuminazione…
  quantita      integer not null default 1 check (quantita >= 0),
  codice        text,                            -- seriale o codice interno
  stato         public.stato_articolo not null default 'disponibile',
  note          text,
  creato_il     timestamptz not null default now()
);
create index articoli_magazzino_idx on public.articoli (magazzino_id, categoria);

-- Attrezzatura assegnata a un evento (diventa la checklist dell'operatore)
create table public.attrezzatura_evento (
  evento_id   uuid not null references public.eventi(id) on delete cascade,
  articolo_id uuid not null references public.articoli(id) on delete cascade,
  quantita    integer not null default 1 check (quantita > 0),
  primary key (evento_id, articolo_id)
);

-- ---------- Carte aziendali ----------
-- Si salvano solo le ultime 4 cifre: mai il numero completo.
create table public.carte_aziendali (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,                        -- es. "Carta Toscana 1"
  ultime_cifre  text not null check (ultime_cifre ~ '^[0-9]{4}$'),
  circuito      text,                                 -- Visa, Mastercard…
  operatore_id  uuid references public.profili(id) on delete set null,
  attiva        boolean not null default true,
  note          text,
  creato_il     timestamptz not null default now()
);

-- ---------- Costi dell'evento ----------
-- fase 'previsto' = preventivo fatto dal project; 'finale' = spese reali.
-- Il costo degli operatori NON sta qui: arriva da ore_lavorate (finale)
-- e da ore previste × tariffa (previsto), calcolato dall'app.
create table public.costi_evento (
  id              uuid primary key default gen_random_uuid(),
  evento_id       uuid not null references public.eventi(id) on delete cascade,
  fase            public.fase_costo not null,
  categoria       public.categoria_costo not null,
  descrizione     text,
  quantita        numeric(10,2) not null default 1 check (quantita >= 0),
  costo_unitario  numeric(10,2) not null check (costo_unitario >= 0),
  importo         numeric(12,2) generated always as (round(quantita * costo_unitario, 2)) stored,
  pagato_con      public.pagamento not null default 'azienda',
  carta_id        uuid references public.carte_aziendali(id) on delete set null,
  operatore_id    uuid references public.profili(id) on delete set null,  -- chi ha sostenuto la spesa
  scontrino       text,
  stato           public.stato_approvazione not null default 'inviato',
  creato_da       uuid default auth.uid() references public.profili(id) on delete set null,
  creato_il       timestamptz not null default now()
);
create index costi_evento_idx on public.costi_evento (evento_id, fase);

-- ---------- Ricavo e fattura sull'evento ----------
alter table public.eventi add column if not exists prezzo_cliente   numeric(12,2);
alter table public.eventi add column if not exists fattura_numero   text;
alter table public.eventi add column if not exists fattura_data     date;
alter table public.eventi add column if not exists fattura_importo  numeric(12,2);
alter table public.eventi add column if not exists fattura_pagata   boolean not null default false;
alter table public.eventi add column if not exists stampe_effettuate integer;

-- Le spese registrate dall'operatore alla chiusura (prima nella tabella "spese")
-- ora vanno in costi_evento. La vecchia tabella resta per compatibilità.

-- =========================================================
-- Permessi
-- =========================================================
alter table public.articoli            enable row level security;
alter table public.attrezzatura_evento enable row level security;
alter table public.carte_aziendali     enable row level security;
alter table public.costi_evento        enable row level security;

-- Funzione: l'utente può gestire questo evento? (admin o project proprietario)
create or replace function public.gestisco_evento(p_evento uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.mio_ruolo() = 'admin'
      or exists (select 1 from public.eventi where id = p_evento and project_id = auth.uid())
$$;
revoke execute on function public.gestisco_evento(uuid) from public, anon;
grant execute on function public.gestisco_evento(uuid) to authenticated;

-- Funzione: l'utente è l'operatore assegnato all'evento?
create or replace function public.lavoro_evento(p_evento uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.eventi where id = p_evento and operatore_id = auth.uid()) $$;
revoke execute on function public.lavoro_evento(uuid) from public, anon;
grant execute on function public.lavoro_evento(uuid) to authenticated;

-- Articoli: tutti leggono, admin e project modificano
create policy articoli_select on public.articoli for select to authenticated using (true);
create policy articoli_write on public.articoli for all to authenticated
  using (public.mio_ruolo() in ('admin','project')) with check (public.mio_ruolo() in ('admin','project'));

-- Attrezzatura evento: la vede chi gestisce o lavora l'evento; la modifica chi lo gestisce
create policy attr_evento_select on public.attrezzatura_evento for select to authenticated
  using (public.gestisco_evento(evento_id) or public.lavoro_evento(evento_id));
create policy attr_evento_write on public.attrezzatura_evento for all to authenticated
  using (public.gestisco_evento(evento_id)) with check (public.gestisco_evento(evento_id));

-- Carte: admin e project vedono tutte, l'operatore la sua; solo admin modifica
create policy carte_select on public.carte_aziendali for select to authenticated
  using (operatore_id = auth.uid() or public.mio_ruolo() in ('admin','project'));
create policy carte_write on public.carte_aziendali for all to authenticated
  using (public.mio_ruolo() = 'admin') with check (public.mio_ruolo() = 'admin');

-- Costi: chi gestisce l'evento vede e modifica tutto; l'operatore vede e inserisce
-- solo le sue spese finali sugli eventi che lavora
create policy costi_gestione on public.costi_evento for all to authenticated
  using (public.gestisco_evento(evento_id)) with check (public.gestisco_evento(evento_id));
create policy costi_operatore_select on public.costi_evento for select to authenticated
  using (operatore_id = auth.uid());
create policy costi_operatore_insert on public.costi_evento for insert to authenticated
  with check (operatore_id = auth.uid() and fase = 'finale' and stato = 'inviato'
              and public.lavoro_evento(evento_id));

-- Tempo reale anche per i costi
alter publication supabase_realtime add table public.costi_evento;
