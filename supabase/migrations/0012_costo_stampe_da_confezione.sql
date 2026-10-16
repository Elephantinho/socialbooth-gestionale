-- Il costo di una stampa si calcola da solo: costo della confezione ÷ stampe per confezione (es. 700).
insert into public.impostazioni (chiave, valore, descrizione) values
  ('costo_confezione_carta', null, 'Quanto costa una confezione di carta/inchiostro, in euro'),
  ('stampe_per_confezione', 700, 'Quante stampe si fanno con una confezione')
on conflict do nothing;
update public.impostazioni set descrizione = 'Costo di una stampa: si calcola da solo da confezione ÷ stampe (lascialo vuoto)'
 where chiave = 'costo_stampa';

create or replace function public.costo_per_stampa()
returns numeric language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select c.valore / nullif(s.valore, 0) from public.impostazioni c, public.impostazioni s
      where c.chiave = 'costo_confezione_carta' and s.chiave = 'stampe_per_confezione' and c.valore is not null),
    (select valore from public.impostazioni where chiave = 'costo_stampa'),
    0)
$$;
revoke execute on function public.costo_per_stampa() from public, anon;
grant execute on function public.costo_per_stampa() to authenticated;

-- Le stampe dichiarate (quantità = numero di stampe, costo 0) diventano una riga con il totale,
-- così i centesimi frazionari non si perdono; il numero di stampe resta nella colonna "stampe".
create or replace function public.prezzo_stampe()
returns trigger language plpgsql security definer set search_path = public
as $$
declare n numeric;
begin
  if new.categoria = 'carta_stampe' and new.costo_unitario = 0 and new.quantita > 0 then
    n := new.quantita;
    new.costo_unitario := round(n * public.costo_per_stampa(), 2);
    new.quantita := 1;
    new.descrizione := trim(both ' ' from coalesce(new.descrizione, '') || ' (' || n::int || ' stampe)');
  end if;
  return new;
end $$;

alter table public.costi_evento add column if not exists stampe integer;

create or replace function public.conta_stampe()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.categoria = 'carta_stampe' and new.stampe is null and new.costo_unitario = 0 then
    new.stampe := new.quantita::int;
  end if;
  return new;
end $$;
revoke execute on function public.conta_stampe() from public, anon, authenticated;
-- i trigger "before" girano in ordine alfabetico: prima a_conta_stampe, poi costi_prezzo_stampe
create trigger a_conta_stampe before insert on public.costi_evento
for each row execute function public.conta_stampe();

create or replace function public.media_stampe_per_evento()
returns numeric language sql stable security definer set search_path = public
as $$
  select round(avg(tot), 0) from (
    select sum(stampe) tot from public.costi_evento
    where categoria = 'carta_stampe' and fase = 'finale' and stato <> 'respinto' and stampe is not null
    group by evento_id) x
$$;
revoke execute on function public.media_stampe_per_evento() from public, anon;
grant execute on function public.media_stampe_per_evento() to authenticated;
