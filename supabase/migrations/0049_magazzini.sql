-- Magazzini: dove stanno i booth e il materiale, con la carta che resta in ognuno.
-- Le tabelle magazzini e articoli c'erano già (vecchio schema, chiuse in 0041): si riaprono e si completano.

alter table public.magazzini
  add column if not exists responsabile_id uuid references public.profili(id) on delete set null,
  add column if not exists carta_stampe integer not null default 0,
  add column if not exists carta_minima integer not null default 400,
  add column if not exists attivo boolean not null default true,
  add column if not exists creato_il timestamptz not null default now(),
  add column if not exists aggiornato_il timestamptz not null default now();

alter table public.magazzini
  add constraint magazzini_carta check (carta_stampe >= 0 and carta_minima >= 0),
  add constraint magazzini_nome_pieno check (length(trim(nome)) > 0 and length(trim(citta)) > 0);

-- Gli strumenti hanno poche categorie fisse, così si possono contare e raggruppare
alter table public.articoli alter column categoria set default 'altro';
update public.articoli set categoria = 'altro' where categoria not in ('booth', 'stampante', 'fotocamera', 'luci', 'fondale', 'accessori', 'altro');
alter table public.articoli
  add constraint articoli_categoria check (categoria in ('booth', 'stampante', 'fotocamera', 'luci', 'fondale', 'accessori', 'altro')),
  add constraint articoli_nome_pieno check (length(trim(nome)) > 0),
  add column if not exists aggiornato_il timestamptz not null default now();

create or replace function public.tocca_aggiornato() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.aggiornato_il := now();
  return new;
end $$;

create or replace trigger magazzini_aggiornato before update on public.magazzini for each row execute function public.tocca_aggiornato();
create or replace trigger articoli_aggiornato before update on public.articoli for each row execute function public.tocca_aggiornato();

-- Chi legge: tutto il pannello (gli operatori leggono il loro magazzino dalla scheda evento).
-- Chi scrive: admin e gestore operatori. Gli strumenti li vede solo il pannello.
alter policy articoli_select on public.articoli to authenticated using (public.e_gestione());

grant select on public.magazzini, public.articoli to authenticated;
grant insert, update on public.magazzini to authenticated;
grant insert, update, delete on public.articoli to authenticated;

create index if not exists articoli_magazzino on public.articoli (magazzino_id);
