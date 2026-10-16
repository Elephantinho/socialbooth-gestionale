-- Le modifiche lato server (dashboard Supabase, chiave di servizio) non hanno utente:
-- servono per creare il primo admin. Dall'app resta tutto bloccato ai non-admin.
create or replace function public.proteggi_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and public.mio_ruolo() is distinct from 'admin' and (
       new.ruolo is distinct from old.ruolo
    or new.tariffa_oraria is distinct from old.tariffa_oraria
    or new.attivo is distinct from old.attivo) then
    raise exception 'Solo un admin può modificare ruolo, tariffa o stato';
  end if;
  return new;
end $$;
revoke execute on function public.proteggi_profilo() from public, anon, authenticated;
