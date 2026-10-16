-- =========================================================
-- Ore automatiche: l'operatore preme un tasto a ogni tappa
--   partenza dal magazzino → arrivo in location → fine lavoro → rientro
-- e l'app calcola da sola viaggio e ore in location.
-- =========================================================

alter table public.ore_lavorate add column if not exists partenza_il  timestamptz;
alter table public.ore_lavorate add column if not exists partenza_lat double precision;
alter table public.ore_lavorate add column if not exists partenza_lng double precision;
alter table public.ore_lavorate add column if not exists fine_il      timestamptz;
alter table public.ore_lavorate add column if not exists rientro_il   timestamptz;
alter table public.ore_lavorate add column if not exists rientro_lat  double precision;
alter table public.ore_lavorate add column if not exists rientro_lng  double precision;
alter table public.ore_lavorate add column if not exists calcolo_automatico boolean not null default false;

-- Chiude l'evento calcolando le ore dalle tappe registrate.
-- Le tappe mancanti vengono stimate con gli orari previsti e il viaggio previsto.
create or replace function public._chiudi_da_tappe(p_evento uuid, p_nota text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  ev public.eventi;
  o  public.ore_lavorate;
  arrivo timestamptz; fine timestamptz;
  andata int; ritorno int; previsto int;
begin
  select * into ev from public.eventi where id = p_evento;
  select * into o from public.ore_lavorate where evento_id = p_evento and operatore_id = ev.operatore_id;
  previsto := coalesce(ev.viaggio_minuti, 0);

  arrivo := coalesce(o.check_in_il, ev.allestimento_il);
  fine   := coalesce(o.fine_il, now());

  andata := case when o.partenza_il is not null and o.check_in_il is not null
                 then round(extract(epoch from o.check_in_il - o.partenza_il) / 60) else previsto end;
  ritorno := case when o.rientro_il is not null and o.fine_il is not null
                  then round(extract(epoch from o.rientro_il - o.fine_il) / 60) else previsto end;
  -- Valori assurdi (tasto dimenticato): si usa il viaggio previsto
  if andata < 0 or andata > greatest(previsto * 3, 60) + 60 then andata := previsto; end if;
  if ritorno < 0 or ritorno > greatest(previsto * 3, 60) + 60 then ritorno := previsto; end if;

  insert into public.ore_lavorate (evento_id, operatore_id) values (p_evento, ev.operatore_id)
  on conflict (evento_id, operatore_id) do nothing;

  update public.ore_lavorate set
    minuti_in_location = greatest(0, round(extract(epoch from fine - arrivo) / 60)),
    minuti_viaggio     = andata + ritorno,
    check_out_il       = now(),
    tariffa_oraria     = (select tariffa_oraria from public.profili where id = ev.operatore_id),
    calcolo_automatico = true,
    nota_operatore     = coalesce(p_nota, nota_operatore),
    stato              = 'inviato'
  where evento_id = p_evento and operatore_id = ev.operatore_id;

  update public.eventi set stato = 'completato' where id = p_evento;
end $$;
revoke execute on function public._chiudi_da_tappe(uuid, text) from public, anon, authenticated;

-- Registra una tappa con ora e posizione.
-- p_tappa: 'partenza' | 'arrivo' | 'fine' | 'rientro' | 'chiudi' (fine senza rientro in magazzino)
create or replace function public.registra_tappa(p_evento uuid, p_tappa text, p_lat double precision default null, p_lng double precision default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.eventi
                 where id = p_evento and operatore_id = auth.uid() and stato in ('confermato', 'in_corso')) then
    raise exception 'Evento non disponibile';
  end if;

  insert into public.ore_lavorate (evento_id, operatore_id) values (p_evento, auth.uid())
  on conflict (evento_id, operatore_id) do nothing;

  if p_tappa = 'partenza' then
    update public.ore_lavorate set partenza_il = now(), partenza_lat = p_lat, partenza_lng = p_lng
     where evento_id = p_evento and operatore_id = auth.uid();
    update public.eventi set stato = 'in_corso' where id = p_evento;
  elsif p_tappa = 'arrivo' then
    update public.ore_lavorate set check_in_il = now(), check_in_lat = p_lat, check_in_lng = p_lng
     where evento_id = p_evento and operatore_id = auth.uid();
    update public.eventi set stato = 'in_corso' where id = p_evento;
  elsif p_tappa = 'fine' then
    update public.ore_lavorate set fine_il = now() where evento_id = p_evento and operatore_id = auth.uid();
  elsif p_tappa = 'rientro' then
    update public.ore_lavorate set rientro_il = now(), rientro_lat = p_lat, rientro_lng = p_lng,
           fine_il = coalesce(fine_il, now())
     where evento_id = p_evento and operatore_id = auth.uid();
    perform public._chiudi_da_tappe(p_evento);
  elsif p_tappa = 'chiudi' then
    update public.ore_lavorate set fine_il = coalesce(fine_il, now()) where evento_id = p_evento and operatore_id = auth.uid();
    perform public._chiudi_da_tappe(p_evento, 'Non rientrato in magazzino: ritorno stimato');
  else
    raise exception 'Tappa sconosciuta: %', p_tappa;
  end if;
end $$;
revoke execute on function public.registra_tappa(uuid, text, double precision, double precision) from public, anon;
grant execute on function public.registra_tappa(uuid, text, double precision, double precision) to authenticated;

-- I controlli ogni 15 minuti chiudono da soli gli eventi dimenticati
create or replace function public.controlla_scadenze()
returns void language plpgsql security definer set search_path = public
as $$
declare p record;
begin
  -- Proposte scadute senza risposta: l'evento torna da assegnare
  for p in update public.proposte set stato = 'scaduta', risposta_il = now()
           where stato = 'in_attesa' and scade_il < now() returning evento_id
  loop
    update public.eventi set stato = 'da_assegnare', operatore_id = null where id = p.evento_id and stato = 'proposto';
  end loop;

  -- Lavoro finito ma rientro non registrato da 3 ore: chiude con ritorno stimato
  for p in select o.evento_id from public.ore_lavorate o join public.eventi e on e.id = o.evento_id
           where e.stato = 'in_corso' and o.fine_il is not null and o.rientro_il is null and o.check_out_il is null
             and o.fine_il < now() - interval '3 hours'
  loop
    perform public._chiudi_da_tappe(p.evento_id, 'Chiuso in automatico: rientro non registrato');
    perform public.notifica(e.operatore_id, 'Ore calcolate in automatico', 'Controllale · ' || public.descrivi_evento(p.evento_id),
      '/operatore/ore') from public.eventi e where e.id = p.evento_id;
  end loop;

  -- Arrivato ma "fine lavoro" mai premuto: a 3 ore dallo smontaggio previsto si usa quello
  for p in select o.evento_id, e.smontaggio_il from public.ore_lavorate o join public.eventi e on e.id = o.evento_id
           where e.stato = 'in_corso' and o.check_in_il is not null and o.fine_il is null and o.check_out_il is null
             and e.smontaggio_il < now() - interval '3 hours'
  loop
    update public.ore_lavorate set fine_il = p.smontaggio_il where evento_id = p.evento_id;
    perform public._chiudi_da_tappe(p.evento_id, 'Chiuso in automatico: fine lavoro non registrata, usato lo smontaggio previsto');
    perform public.notifica(e.operatore_id, 'Ore calcolate in automatico', 'Controllale · ' || public.descrivi_evento(p.evento_id),
      '/operatore/ore') from public.eventi e where e.id = p.evento_id;
  end loop;

  -- Eventi finiti da più di 12 ore senza nessuna tappa: promemoria all'operatore
  for p in select id, operatore_id from public.eventi
           where stato in ('confermato', 'in_corso') and not promemoria_ore_inviato
             and smontaggio_il < now() - interval '12 hours' and operatore_id is not null
  loop
    perform public.notifica(p.operatore_id, 'Ricordati di chiudere l''evento', public.descrivi_evento(p.id), '/operatore/eventi/' || p.id);
    update public.eventi set promemoria_ore_inviato = true where id = p.id;
  end loop;

  -- Promemoria il giorno prima dell'evento
  for p in select id, operatore_id from public.eventi
           where stato = 'confermato' and operatore_id is not null
             and allestimento_il between now() + interval '23 hours 45 minutes' and now() + interval '24 hours'
  loop
    perform public.notifica(p.operatore_id, 'Domani hai un evento', public.descrivi_evento(p.id), '/operatore/eventi/' || p.id);
  end loop;

  -- Promemoria di partenza: all'ora del ritiro in magazzino
  for p in select id, operatore_id from public.eventi
           where stato = 'confermato' and operatore_id is not null and ritiro_magazzino_il is not null
             and ritiro_magazzino_il between now() and now() + interval '15 minutes'
  loop
    perform public.notifica(p.operatore_id, 'È ora di partire', 'Premi "Parto dal magazzino" · ' || public.descrivi_evento(p.id), '/operatore/eventi/' || p.id);
  end loop;
end $$;
revoke execute on function public.controlla_scadenze() from public, anon, authenticated;
