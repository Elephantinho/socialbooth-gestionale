-- Pagamenti delle carte aziendali che arrivano da soli (Revolut Business): ognuno viene abbinato
-- all'operatore (dalle ultime cifre della carta) e all'evento su cui lavorava in quel momento,
-- e diventa una spesa dell'evento. Quello che non si abbina con certezza resta "da abbinare".

alter table public.spese_evento add column if not exists fonte text not null default 'app' check (fonte in ('app', 'revolut'));

create table public.pagamenti_carte (
  id uuid primary key default gen_random_uuid(),
  rif_esterno text not null unique,
  carta_ultime text,
  titolare text,
  importo numeric(10,2) not null,
  valuta text not null default 'EUR',
  esercente text,
  mcc text,
  citta text,
  pagato_il timestamptz not null,
  stato text not null default 'da_abbinare' check (stato in ('abbinato', 'da_abbinare', 'ignorato')),
  motivo text,
  operatore_id uuid references public.profili(id),
  evento_id uuid references public.eventi(id) on delete set null,
  spesa_id uuid references public.spese_evento(id) on delete set null,
  ricevute text[] not null default '{}',
  creato_il timestamptz not null default now()
);
create index pagamenti_carte_stato on public.pagamenti_carte (stato);
alter table public.pagamenti_carte enable row level security;
create policy pagamenti_lettura on public.pagamenti_carte for select to authenticated using (public.amministra());

alter table public.spese_evento add column if not exists pagamento_id uuid unique references public.pagamenti_carte(id) on delete set null;

alter policy spese_operatore_togli on public.spese_evento
  using (operatore_id = auth.uid() and creato_da = auth.uid() and fonte = 'app' and creato_il > now() - interval '1 day');

create or replace function public.voce_da_mcc(p_mcc text) returns public.voce_spesa
language sql immutable set search_path = '' as $$
  select case
    when p_mcc in ('5541', '5542', '5983', '5172') then 'carburante'
    when p_mcc in ('4784') then 'pedaggi'
    when p_mcc in ('7523') then 'parcheggio'
    when p_mcc in ('5811', '5812', '5813', '5814', '5462', '5441', '5499') then 'vitto'
    when p_mcc in ('7512', '7513', '7519') or p_mcc between '3351' and '3441' then 'noleggio'
    when p_mcc in ('7011') or p_mcc between '3501' and '3999' then 'alloggio'
    when p_mcc in ('5200', '5211', '5251', '5311', '5399', '5943', '5045', '5065', '5732') then 'materiali'
    else 'altro'
  end::public.voce_spesa
$$;

create or replace function public._registra_pagamento(p_pagamento uuid, p_evento uuid, p_operatore uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.pagamenti_carte; s uuid; autore uuid;
begin
  select * into p from public.pagamenti_carte where id = p_pagamento for update;
  autore := coalesce(p_operatore, auth.uid(), (select project_id from public.eventi where id = p_evento));
  insert into public.spese_evento (evento_id, voce, descrizione, importo, pagata_con, operatore_id, fonte, pagamento_id, creato_da)
  values (p_evento, public.voce_da_mcc(p.mcc), nullif(trim(coalesce(p.esercente, '') || case when p.citta is not null then ', ' || p.citta else '' end), ''),
          p.importo, 'carta_aziendale', p_operatore, 'revolut', p.id, autore)
  returning id into s;
  update public.pagamenti_carte set stato = 'abbinato', motivo = null, evento_id = p_evento, operatore_id = p_operatore, spesa_id = s where id = p.id;
end $$;
revoke execute on function public._registra_pagamento(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.abbina_pagamento(p_pagamento uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.pagamenti_carte;
  op uuid;
  candidati int;
  ev uuid;
begin
  select * into p from public.pagamenti_carte where id = p_pagamento;
  if p.stato <> 'da_abbinare' then return; end if;
  if p.importo <= 0 then
    update public.pagamenti_carte set motivo = 'Rimborso o storno: controlla a quale spesa si riferisce' where id = p.id; return;
  end if;
  select operatore_id into op from public.carte_aziendali
   where ultime_cifre = p.carta_ultime and attiva and operatore_id is not null limit 1;
  if op is null then
    update public.pagamenti_carte set motivo = 'Carta che non risulta di nessun operatore' where id = p.id; return;
  end if;
  select count(*) into candidati from public.eventi
   where operatore_id = op and stato in ('confermato', 'in_corso', 'completato')
     and p.pagato_il between allestimento_il - interval '24 hours' and smontaggio_il + interval '12 hours';
  if candidati = 0 then
    update public.pagamenti_carte set operatore_id = op, motivo = 'Nessun evento dell''operatore in quei giorni' where id = p.id; return;
  end if;
  select id into ev from public.eventi
   where operatore_id = op and stato in ('confermato', 'in_corso', 'completato')
     and p.pagato_il between allestimento_il - interval '24 hours' and smontaggio_il + interval '12 hours'
   order by greatest(extract(epoch from allestimento_il - p.pagato_il), extract(epoch from p.pagato_il - smontaggio_il), 0)
   limit 1;
  perform public._registra_pagamento(p.id, ev, op);
end $$;
revoke execute on function public.abbina_pagamento(uuid) from public, anon, authenticated;

create or replace function public.pagamento_arrivato() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.abbina_pagamento(new.id);
  return null;
end $$;
create trigger pagamento_arrivato after insert on public.pagamenti_carte for each row execute function public.pagamento_arrivato();

create or replace function public.abbina_a_mano(p_pagamento uuid, p_evento uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.pagamenti_carte;
begin
  if not public.amministra() then raise exception 'Solo admin e amministrazione'; end if;
  select * into p from public.pagamenti_carte where id = p_pagamento;
  if not found or p.stato <> 'da_abbinare' then raise exception 'Pagamento già sistemato'; end if;
  if p.importo <= 0 then raise exception 'Un rimborso non diventa una spesa: ignoralo'; end if;
  perform public._registra_pagamento(p.id, p_evento, coalesce(p.operatore_id, (select operatore_id from public.eventi where id = p_evento)));
end $$;
revoke execute on function public.abbina_a_mano(uuid, uuid) from public, anon;
grant execute on function public.abbina_a_mano(uuid, uuid) to authenticated;

create or replace function public.ignora_pagamento(p_pagamento uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.amministra() then raise exception 'Solo admin e amministrazione'; end if;
  update public.pagamenti_carte set stato = 'ignorato' where id = p_pagamento and stato = 'da_abbinare';
end $$;
revoke execute on function public.ignora_pagamento(uuid) from public, anon;
grant execute on function public.ignora_pagamento(uuid) to authenticated;

alter publication supabase_realtime add table public.pagamenti_carte;
