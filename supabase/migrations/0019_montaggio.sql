-- Checklist di montaggio salvata sul server e foto del set montato (prova per il cliente).
create table public.montaggio (
  evento_id     uuid primary key references public.eventi(id) on delete cascade,
  voci_fatte    text[] not null default '{}',
  completato_il timestamptz,
  aggiornato_il timestamptz not null default now()
);
alter table public.montaggio enable row level security;
create policy montaggio_select on public.montaggio for select to authenticated
  using (public.gestisco_evento(evento_id) or public.lavoro_evento(evento_id));
create policy montaggio_insert on public.montaggio for insert to authenticated with check (public.lavoro_evento(evento_id));
create policy montaggio_update on public.montaggio for update to authenticated using (public.lavoro_evento(evento_id));

-- Foto del set caricata → il project lo sa subito
create or replace function public.avvisa_foto_montaggio()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.percorso like '%/montaggio/%' then
    perform public.notifica(e.project_id, 'Set montato', public.descrivi_evento(e.id) || ': foto del montaggio caricata', '/gestione/eventi/' || e.id)
    from public.eventi e where e.id = new.evento_id;
  end if;
  return null;
end $$;
revoke execute on function public.avvisa_foto_montaggio() from public, anon, authenticated;
create trigger allegati_foto_montaggio after insert on public.allegati
for each row execute function public.avvisa_foto_montaggio();
