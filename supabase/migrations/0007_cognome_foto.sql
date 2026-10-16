-- =========================================================
-- Nome e cognome separati, foto profilo
-- =========================================================

alter table public.profili add column if not exists cognome text not null default '';
alter table public.profili add column if not exists foto text;   -- URL pubblico della foto

-- Registrazione: legge anche il cognome
create or replace function public.crea_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text;
begin
  insert into public.profili (id, nome, cognome, telefono, attivo)
  values (
    new.id,
    coalesce(meta->>'nome', ''),
    coalesce(meta->>'cognome', ''),
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

-- Archivio foto profilo: le foto si vedono tramite URL pubblico (bucket pubblico,
-- senza permesso di elencare i file). Ognuno carica nella propria cartella
-- (<id utente>/...), l'admin ovunque.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-profilo', 'foto-profilo', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy foto_caricamento on storage.objects for insert to authenticated
  with check (bucket_id = 'foto-profilo'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.mio_ruolo() = 'admin'));
create policy foto_modifica on storage.objects for update to authenticated
  using (bucket_id = 'foto-profilo'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.mio_ruolo() = 'admin'));
create policy foto_eliminazione on storage.objects for delete to authenticated
  using (bucket_id = 'foto-profilo'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.mio_ruolo() = 'admin'));
