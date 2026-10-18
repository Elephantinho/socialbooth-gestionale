-- Carico o scarico di carta in un magazzino, in un colpo solo: due persone che caricano
-- insieme non si cancellano a vicenda, e la carta non va mai sotto zero.
create or replace function public.carica_carta(p_magazzino uuid, p_stampe integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare restano integer;
begin
  if not public.gestisce_operatori() then
    raise exception 'Non puoi cambiare la carta dei magazzini' using errcode = '42501';
  end if;
  update public.magazzini set carta_stampe = greatest(0, carta_stampe + p_stampe)
  where id = p_magazzino
  returning carta_stampe into restano;
  if restano is null then raise exception 'Magazzino non trovato'; end if;
  return restano;
end $$;

revoke execute on function public.carica_carta(uuid, integer) from public, anon;
grant execute on function public.carica_carta(uuid, integer) to authenticated;
