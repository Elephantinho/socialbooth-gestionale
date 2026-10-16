-- Eventi con la data passata: niente assegnazioni, niente proposte appese, niente chiusure prima dell'evento.

-- 1. L'assegnazione automatica (e l'operatore di riserva) non tocca eventi già finiti
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
  if v_ev.allestimento_il < now() then return null; end if;  -- evento già iniziato o passato: non si assegna da soli
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

-- 2. Le tappe "Parto" e "Arrivato" e la chiusura non si possono registrare troppo prima dell'evento
create or replace function public.controlla_orari_tappe()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  inizio timestamptz := (select allestimento_il from public.eventi where id = new.evento_id);
  nuovo  boolean := tg_op = 'INSERT';
begin
  if new.partenza_il is not null and (nuovo or new.partenza_il is distinct from old.partenza_il) and new.partenza_il < inizio - interval '12 hours' then
    raise exception 'È troppo presto per partire: l''allestimento è il %', to_char(inizio at time zone 'Europe/Rome', 'DD/MM "alle" HH24:MI');
  end if;
  if new.check_in_il is not null and (nuovo or new.check_in_il is distinct from old.check_in_il) and new.check_in_il < inizio - interval '12 hours' then
    raise exception 'È troppo presto per l''arrivo: l''allestimento è il %', to_char(inizio at time zone 'Europe/Rome', 'DD/MM "alle" HH24:MI');
  end if;
  if new.check_out_il is not null and (nuovo or new.check_out_il is distinct from old.check_out_il) and new.check_out_il < inizio then
    raise exception 'Non puoi chiudere un evento che non è ancora iniziato';
  end if;
  return new;
end $$;
revoke execute on function public.controlla_orari_tappe() from public, anon, authenticated;
create trigger a_controlla_orari_tappe before insert or update on public.ore_lavorate
for each row execute function public.controlla_orari_tappe();

-- 3. Proposte ancora in attesa quando l'evento è già iniziato: scadono e l'evento risulta mai svolto
create or replace function public.scadi_proposte_passate()
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.proposte p set stato = 'scaduta', risposta_il = now()
   from public.eventi e
  where e.id = p.evento_id and p.stato = 'in_attesa' and e.allestimento_il < now();
  update public.eventi set stato = 'da_assegnare', operatore_id = null
   where stato = 'proposto' and allestimento_il < now();
end $$;
revoke execute on function public.scadi_proposte_passate() from public, anon, authenticated;
select cron.schedule('scadi-proposte-passate', '*/15 * * * *', 'select public.scadi_proposte_passate()');
