-- I pedaggi sono spese piccole: finiscono in "Altro" insieme al resto.
-- Il valore 'pedaggi' resta nel tipo (toglierlo da un enum è costoso) ma non si usa più.
update public.spese_evento set voce = 'altro' where voce = 'pedaggi';

create or replace function public.voce_da_mcc(p_mcc text) returns public.voce_spesa
language sql immutable set search_path = '' as $$
  select case
    when p_mcc in ('5541', '5542', '5983', '5172') then 'carburante'
    when p_mcc in ('7523') then 'parcheggio'
    when p_mcc in ('5811', '5812', '5813', '5814', '5462', '5441', '5499') then 'vitto'
    when p_mcc in ('7512', '7513', '7519') or p_mcc between '3351' and '3441' then 'noleggio'
    when p_mcc in ('7011') or p_mcc between '3501' and '3999' then 'alloggio'
    when p_mcc in ('5200', '5211', '5251', '5311', '5399', '5943', '5045', '5065', '5732') then 'materiali'
    else 'altro'
  end::public.voce_spesa
$$;

alter table public.spese_evento add constraint spese_niente_pedaggi check (voce <> 'pedaggi');
