-- L'operatore lo sceglie sempre chi crea o gestisce l'evento: niente proposte automatiche.
alter table public.eventi disable trigger eventi_assegnazione;

create or replace function public.trigger_assegnazione() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  return null;
end $$;

create or replace function public.assegna_automaticamente(p_evento uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  return null;
end $$;
revoke execute on function public.assegna_automaticamente(uuid) from public, anon, authenticated;

update public.impostazioni set descrizione = 'Non più usata: l''assegnazione è sempre manuale' where chiave = 'riserva_automatica';
