-- =========================================================
-- Registrazione operatori, coordinate degli eventi, modifiche
-- =========================================================

-- Coordinate dell'evento (per il calcolo del viaggio e la mappa)
alter table public.eventi add column if not exists lat double precision;
alter table public.eventi add column if not exists lng double precision;

-- Nuovo utente → profilo.
-- Chi si registra dall'app (autoregistrato) nasce operatore NON attivo:
-- un admin lo approva dalla pagina Operatori. Nome, telefono e regioni
-- arrivano dal modulo di registrazione. Il ruolo NON si può scegliere.
create or replace function public.crea_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text;
begin
  insert into public.profili (id, nome, telefono, attivo)
  values (
    new.id,
    coalesce(meta->>'nome', ''),
    nullif(meta->>'telefono', ''),
    not coalesce((meta->>'autoregistrato')::boolean, false)
  );

  if jsonb_typeof(meta->'regioni') = 'array' then
    for r in select jsonb_array_elements_text(meta->'regioni') loop
      if r = any (enum_range(null::public.regione)::text[]) then
        insert into public.zone_operatore (operatore_id, regione)
        values (new.id, r::public.regione) on conflict do nothing;
      end if;
    end loop;
  end if;
  return new;
end $$;
revoke execute on function public.crea_profilo() from public, anon, authenticated;

-- L'operatore può gestire le proprie regioni (oltre all'admin)
alter policy zone_write on public.zone_operatore
  using (operatore_id = auth.uid() or public.mio_ruolo() = 'admin')
  with check (operatore_id = auth.uid() or public.mio_ruolo() = 'admin');

-- Annullare un evento: chiude anche le proposte ancora in attesa
create or replace function public.chiudi_proposte_annullate()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.stato = 'annullato' and old.stato is distinct from 'annullato' then
    update public.proposte set stato = 'revocata'
     where evento_id = new.id and stato = 'in_attesa';
  end if;
  return null;
end $$;
revoke execute on function public.chiudi_proposte_annullate() from public, anon, authenticated;

create trigger eventi_annullati after update of stato on public.eventi
for each row execute function public.chiudi_proposte_annullate();

-- Aggiornamenti in tempo reale nell'app (modifiche, proposte, ore)
alter publication supabase_realtime add table public.eventi, public.proposte, public.ore_lavorate;
