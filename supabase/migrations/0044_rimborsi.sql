-- Rimborsi: le spese pagate di tasca dagli operatori, finché l'amministrazione non le rimborsa.

alter table public.spese_evento add column rimborsata_il timestamptz;
comment on column public.spese_evento.rimborsata_il is 'Quando la spesa pagata di tasca è stata rimborsata all''operatore (null = da rimborsare)';

create index spese_da_rimborsare on public.spese_evento (operatore_id) where pagata_con = 'operatore' and rimborsata_il is null;

/** Solo admin e amministrazione segnano (o tolgono) un rimborso; anche il project, che può modificare le spese dei suoi eventi, no */
create or replace function public.proteggi_rimborso() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.rimborsata_il is distinct from old.rimborsata_il and auth.uid() is not null and not public.amministra() then
    raise exception 'Solo l''amministrazione segna i rimborsi';
  end if;
  return new;
end $$;
create trigger spese_proteggi_rimborso before update on public.spese_evento
  for each row execute function public.proteggi_rimborso();

/** Segna come rimborsate (o di nuovo da rimborsare) delle spese pagate di tasca */
create or replace function public.segna_rimborso(p_spese uuid[], p_rimborsate boolean default true) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.amministra() then raise exception 'Solo l''amministrazione segna i rimborsi'; end if;
  update public.spese_evento set rimborsata_il = case when p_rimborsate then now() else null end
   where id = any(p_spese) and pagata_con = 'operatore';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.segna_rimborso(uuid[], boolean) from public, anon;
grant execute on function public.segna_rimborso(uuid[], boolean) to authenticated;
