-- Anagrafica clienti, con i dati che servono per la fattura elettronica.
-- Un cliente è condiviso: può lavorare con più project. "project_id" = chi l'ha inserito.
-- Azienda: ragione sociale, partita IVA, codice SDI o PEC. Privato: nome e cognome, codice fiscale.
-- Per tutti: indirizzo, CAP, città, provincia.

alter table public.clienti
  add column tipo text not null default 'azienda' check (tipo in ('azienda', 'privato')),
  add column partita_iva text,
  add column codice_fiscale text,
  add column codice_sdi text,
  add column pec text,
  add column indirizzo text,
  add column cap text,
  add column citta text,
  add column provincia text,
  add column aggiornato_il timestamptz not null default now();

comment on column public.clienti.nome is 'Ragione sociale (azienda) o nome e cognome (privato)';
comment on column public.clienti.codice_sdi is 'Codice destinatario per la fattura elettronica (7 caratteri); in alternativa la PEC';

/** Scrittura pulita: maiuscole dove servono, niente spazi, "IT" tolto dalla partita IVA */
create or replace function public.normalizza_cliente() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.nome := trim(new.nome);
  new.partita_iva := nullif(regexp_replace(upper(coalesce(new.partita_iva, '')), '^IT|\s', '', 'g'), '');
  new.codice_fiscale := nullif(upper(regexp_replace(coalesce(new.codice_fiscale, ''), '\s', '', 'g')), '');
  new.codice_sdi := nullif(upper(regexp_replace(coalesce(new.codice_sdi, ''), '\s', '', 'g')), '');
  new.pec := nullif(lower(trim(coalesce(new.pec, ''))), '');
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.indirizzo := nullif(trim(coalesce(new.indirizzo, '')), '');
  new.cap := nullif(regexp_replace(coalesce(new.cap, ''), '\s', '', 'g'), '');
  new.citta := nullif(trim(coalesce(new.citta, '')), '');
  new.provincia := nullif(upper(trim(coalesce(new.provincia, ''))), '');
  new.aggiornato_il := now();
  return new;
end $$;
create trigger clienti_normalizza before insert or update on public.clienti
  for each row execute function public.normalizza_cliente();

-- I dati per fatturare devono esserci e avere la forma giusta (i clienti già inseriti prima non si controllano)
alter table public.clienti add constraint clienti_dati_fattura check (
  length(nome) between 2 and 200
  and indirizzo is not null and citta is not null
  and cap ~ '^\d{5}$' and provincia ~ '^[A-Z]{2}$'
  and case tipo
    when 'azienda' then partita_iva ~ '^\d{11}$' and (codice_sdi ~ '^[A-Z0-9]{7}$' or pec ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
    else codice_fiscale ~ '^[A-Z0-9]{16}$'
  end
) not valid;

-- La stessa azienda una volta sola
create unique index clienti_partita_iva_unica on public.clienti (partita_iva) where tipo = 'azienda' and partita_iva is not null;

/** Un cliente con eventi non si cancella (gli eventi resterebbero senza cliente) */
create or replace function public.proteggi_cliente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.eventi where cliente_id = old.id) then
    raise exception 'Il cliente ha degli eventi: non si può cancellare';
  end if;
  return old;
end $$;
create trigger clienti_proteggi before delete on public.clienti
  for each row execute function public.proteggi_cliente();

create index eventi_cliente on public.eventi (cliente_id);
