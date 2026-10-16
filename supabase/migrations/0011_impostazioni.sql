-- Impostazioni modificabili dall'admin: costo di una stampa (usato in automatico
-- per le stampe dichiarate dall'operatore) e ore per accettare un incarico.
create table public.impostazioni (
  chiave     text primary key,
  valore     numeric(12,4),
  descrizione text
);
alter table public.impostazioni enable row level security;
create policy impostazioni_select on public.impostazioni for select to authenticated using (true);
create policy impostazioni_write on public.impostazioni for all to authenticated
  using (public.mio_ruolo() = 'admin') with check (public.mio_ruolo() = 'admin');

insert into public.impostazioni (chiave, valore, descrizione) values
  ('costo_stampa', null, 'Costo di una stampa (carta + inchiostro), in euro'),
  ('ore_scadenza_proposta', 24, 'Ore che l''operatore ha per accettare un incarico')
on conflict do nothing;

-- Stampe dichiarate senza prezzo: si applica il costo per stampa
create or replace function public.prezzo_stampe()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.categoria = 'carta_stampe' and new.costo_unitario = 0 then
    new.costo_unitario := coalesce((select valore from public.impostazioni where chiave = 'costo_stampa'), 0);
  end if;
  return new;
end $$;
revoke execute on function public.prezzo_stampe() from public, anon, authenticated;
create trigger costi_prezzo_stampe before insert on public.costi_evento
for each row execute function public.prezzo_stampe();

create or replace function public.ore_scadenza()
returns interval language sql stable security definer set search_path = public
as $$ select make_interval(hours => coalesce((select valore::int from public.impostazioni where chiave = 'ore_scadenza_proposta'), 24)) $$;
revoke execute on function public.ore_scadenza() from public, anon, authenticated;

-- assegna_automaticamente e proponi_operatore ora usano public.ore_scadenza()
-- al posto delle 24 ore fisse (stesso corpo della migrazione 0001, cambiato solo scade_il).
