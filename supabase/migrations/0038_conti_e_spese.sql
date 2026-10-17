-- Soldi degli eventi, separati dall'evento: il gestore operatori vede tutti gli eventi ma nessun importo.
-- Li vedono solo admin, amministrazione e il project dell'evento. L'operatore vede e segna solo le sue spese.

create or replace function public.vedo_soldi(p_evento uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.mio_ruolo() in ('admin', 'amministrazione'), false)
      or exists (select 1 from public.eventi e where e.id = p_evento and e.project_id = auth.uid()
                 and public.mio_ruolo() = 'project')
$$;
revoke execute on function public.vedo_soldi(uuid) from public, anon;
grant execute on function public.vedo_soldi(uuid) to authenticated;

/* ---------- Ricavo: prezzo concordato e fattura ---------- */
create table public.conti_evento (
  evento_id uuid primary key references public.eventi(id) on delete cascade,
  prezzo numeric(10,2) check (prezzo is null or prezzo >= 0),
  fattura_numero text check (fattura_numero is null or length(trim(fattura_numero)) between 1 and 40),
  fattura_data date,
  fattura_importo numeric(10,2) check (fattura_importo is null or fattura_importo >= 0),
  incassata boolean not null default false,
  incassata_il date,
  aggiornato_il timestamptz not null default now()
);
alter table public.conti_evento enable row level security;
create policy conti_lettura on public.conti_evento for select to authenticated using (public.vedo_soldi(evento_id));
create policy conti_inserimento on public.conti_evento for insert to authenticated with check (public.vedo_soldi(evento_id));
create policy conti_modifica on public.conti_evento for update to authenticated using (public.vedo_soldi(evento_id)) with check (public.vedo_soldi(evento_id));

create or replace function public.conti_aggiornati() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.aggiornato_il := now();
  if new.incassata and new.incassata_il is null then new.incassata_il := current_date; end if;
  if not new.incassata then new.incassata_il := null; end if;
  return new;
end $$;
create trigger conti_aggiornati before insert or update on public.conti_evento for each row execute function public.conti_aggiornati();

-- I vecchi importi scritti nell'evento passano qui e spariscono dall'evento (che il gestore legge)
insert into public.conti_evento (evento_id, prezzo, fattura_numero, fattura_data, fattura_importo, incassata)
select id, prezzo_cliente, fattura_numero, fattura_data, fattura_importo, fattura_pagata from public.eventi
 where prezzo_cliente is not null or fattura_numero is not null or fattura_importo is not null;
update public.eventi set prezzo_cliente = null, fattura_numero = null, fattura_data = null, fattura_importo = null, fattura_pagata = false
 where prezzo_cliente is not null or fattura_numero is not null or fattura_importo is not null or fattura_pagata;

/* ---------- Spese dell'evento ---------- */
create type public.voce_spesa as enum ('noleggio', 'carburante', 'pedaggi', 'parcheggio', 'vitto', 'alloggio', 'materiali', 'altro');
create type public.pagata_con as enum ('carta_aziendale', 'operatore', 'azienda');

create table public.spese_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventi(id) on delete cascade,
  voce public.voce_spesa not null,
  descrizione text check (descrizione is null or length(descrizione) <= 200),
  importo numeric(10,2) not null check (importo > 0 and importo < 100000),
  pagata_con public.pagata_con not null default 'carta_aziendale',
  operatore_id uuid references public.profili(id),
  scontrino text,
  creato_da uuid not null default auth.uid() references public.profili(id),
  creato_il timestamptz not null default now()
);
create index spese_evento_evento on public.spese_evento (evento_id);
alter table public.spese_evento enable row level security;

create policy spese_ufficio on public.spese_evento for all to authenticated
  using (public.vedo_soldi(evento_id)) with check (public.vedo_soldi(evento_id));
create policy spese_operatore_lettura on public.spese_evento for select to authenticated
  using (operatore_id = auth.uid());
create policy spese_operatore_nuova on public.spese_evento for insert to authenticated
  with check (operatore_id = auth.uid() and creato_da = auth.uid() and pagata_con in ('carta_aziendale', 'operatore')
              and public.lavoro_evento(evento_id));
create policy spese_operatore_togli on public.spese_evento for delete to authenticated
  using (operatore_id = auth.uid() and creato_da = auth.uid() and creato_il > now() - interval '1 day');

alter publication supabase_realtime add table public.spese_evento, public.conti_evento;

/* ---------- Foto degli scontrini: scontrini/<evento>/<chi carica>/<foto>.jpg ---------- */
insert into storage.buckets (id, name, public) values ('scontrini', 'scontrini', false) on conflict (id) do nothing;

create policy scontrini_lettura on storage.objects for select to authenticated
  using (bucket_id = 'scontrini' and (
    public.vedo_soldi(((storage.foldername(name))[1])::uuid)
    or (storage.foldername(name))[2] = auth.uid()::text));
create policy scontrini_carica on storage.objects for insert to authenticated
  with check (bucket_id = 'scontrini' and (
    public.vedo_soldi(((storage.foldername(name))[1])::uuid)
    or ((storage.foldername(name))[2] = auth.uid()::text and public.lavoro_evento(((storage.foldername(name))[1])::uuid))));
