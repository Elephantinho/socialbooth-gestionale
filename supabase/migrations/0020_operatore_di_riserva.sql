-- Operatore di riserva: se chi aveva l'incarico rifiuta o non risponde in tempo,
-- l'evento viene proposto da solo all'operatore libero più vicino (dal suo magazzino).
-- Se non c'è nessuno libero, il project viene avvisato. Si spegne da Impostazioni.
insert into public.impostazioni (chiave, valore, descrizione) values
  ('riserva_automatica', 1, 'Se un operatore rifiuta o non risponde, proponi da solo il più vicino libero (1 = sì, 0 = no)')
on conflict do nothing;

create or replace function public.assegna_automaticamente(p_evento uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_ev        public.eventi;
  v_count     int;
  v_op        uuid;
  v_riassegna boolean;
  v_riserva   boolean := coalesce((select valore from public.impostazioni where chiave = 'riserva_automatica'), 1) > 0;
begin
  select * into v_ev from public.eventi where id = p_evento;
  select count(*) into v_count from public._operatori_disponibili(p_evento);
  -- È una riassegnazione se qualcuno ha già rifiutato o lasciato scadere
  v_riassegna := exists (select 1 from public.proposte where evento_id = p_evento and stato in ('rifiutata', 'scaduta'));

  if v_count = 1 then
    select id into v_op from public._operatori_disponibili(p_evento);
  elsif v_count > 1 and v_riassegna and v_riserva then
    -- Il più vicino (distanza in linea d'aria magazzino → evento), a parità chi ha meno eventi nel mese
    select o.id into v_op
    from public._operatori_disponibili(p_evento) o
    left join public.magazzini m on m.id = o.magazzino_id
    order by
      case when m.lat is null or v_ev.lat is null then 1e9
           else 6371 * 2 * asin(sqrt(power(sin(radians(v_ev.lat - m.lat) / 2), 2)
                + cos(radians(m.lat)) * cos(radians(v_ev.lat)) * power(sin(radians(v_ev.lng - m.lng) / 2), 2))) end,
      (select count(*) from public.eventi x where x.operatore_id = o.id and x.allestimento_il >= date_trunc('month', now()))
    limit 1;
  end if;

  if v_op is null then
    if v_riassegna and v_count = 0 then
      perform public.notifica(v_ev.project_id, 'Nessun operatore libero',
        public.descrivi_evento(p_evento) || ': chi era stato scelto non è disponibile e non c''è nessun altro libero in zona.',
        '/gestione/eventi/' || p_evento);
    end if;
    return null;
  end if;

  update public.eventi
     set operatore_id = v_op,
         magazzino_id = coalesce(magazzino_id, (select magazzino_id from public.profili where id = v_op)),
         stato = 'proposto'
   where id = p_evento;
  insert into public.proposte (evento_id, operatore_id, automatica, scade_il)
  values (p_evento, v_op, true, now() + public.ore_scadenza());

  if v_riassegna then
    perform public.notifica(v_ev.project_id, 'Proposto un operatore di riserva',
      public.descrivi_evento(p_evento) || ': ' || (select trim(nome || ' ' || cognome) from public.profili where id = v_op),
      '/gestione/eventi/' || p_evento);
  end if;
  return v_op;
end $$;
