-- Riaprire un evento annullato non manda "Non sei più assegnato" all'operatore (ha già ricevuto "Evento annullato").
create or replace function public.operatore_tolto()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.operatore_id is not null and new.operatore_id is distinct from old.operatore_id
     and auth.uid() is distinct from old.operatore_id then
    update public.proposte set stato = 'revocata', risposta_il = coalesce(risposta_il, now())
     where evento_id = new.id and operatore_id = old.operatore_id and stato in ('in_attesa', 'accettata');
    if new.stato <> 'annullato' and old.stato <> 'annullato' then
      perform public.notifica(old.operatore_id, 'Non sei più assegnato', public.descrivi_evento(new.id), '/operatore');
    end if;
  end if;
  return null;
end $$;
