-- Con dieci e più eventi al giorno: avvisi solo quando qualcosa non va.
-- I passaggi normali avvisano solo il project dell'evento; ufficio (project, admin, gestori) e
-- operatore ricevono un avviso quando un passaggio è in ritardo, una volta sola per tipo.
-- Soglie uguali a src/modules/passaggi/ritardi.ts.

alter table public.eventi add column if not exists avvisi_ritardo text[] not null default '{}';

create or replace function public.segna_passaggio(p_evento uuid, p_passaggio public.passaggio) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ev public.eventi;
  precedente public.passaggio;
  chi text;
begin
  select * into ev from public.eventi where id = p_evento for update;
  if not found or ev.operatore_id is distinct from auth.uid() then raise exception 'Non sei l''operatore di questo evento'; end if;
  if ev.stato not in ('confermato', 'in_corso') then raise exception 'L''evento non è confermato'; end if;
  if now() < ev.allestimento_il - interval '24 hours' then raise exception 'Troppo presto: puoi iniziare dal giorno prima'; end if;

  precedente := ev.ultimo_passaggio;
  if (precedente is null and p_passaggio <> 'check_in')
     or (precedente is not null and (select array_position(enum_range(null::public.passaggio), p_passaggio))
                                   <> (select array_position(enum_range(null::public.passaggio), precedente)) + 1) then
    raise exception 'Prima completa il passaggio precedente';
  end if;

  insert into public.passaggi_evento (evento_id, operatore_id, passaggio) values (p_evento, auth.uid(), p_passaggio);
  update public.eventi
     set ultimo_passaggio = p_passaggio,
         stato = case p_passaggio when 'check_in' then 'in_corso' when 'check_out' then 'completato' else stato end
   where id = p_evento;

  select trim(nome || ' ' || coalesce(cognome, '')) into chi from public.profili where id = auth.uid();
  perform public.notifica(ev.project_id, chi || ' ' || public.etichetta_passaggio(p_passaggio),
    public.descrivi_evento(p_evento), '/gestione/eventi/' || p_evento);
end $$;

create or replace function public.controlla_ritardi() returns void
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  fatti int;
  tipo text;
  titolo text;
begin
  for r in select * from public.eventi
            where stato in ('confermato', 'in_corso') and operatore_id is not null
              and allestimento_il <= now() and allestimento_il > now() - interval '3 days'
  loop
    fatti := coalesce(array_position(enum_range(null::public.passaggio), r.ultimo_passaggio), 0);
    tipo := case
      when fatti < 6 and now() >= r.smontaggio_il + interval '4 hours' then 'check_out'
      when fatti < 3 and now() >= r.inizio_attivazione then 'montato'
      when fatti = 0 then 'check_in'
    end;
    continue when tipo is null or tipo = any(r.avvisi_ritardo);

    titolo := case tipo when 'check_in' then 'Check-in mancante'
                        when 'montato' then 'Non ancora montato'
                        else 'Check-out mancante' end;
    update public.eventi set avvisi_ritardo = avvisi_ritardo || tipo where id = r.id;
    perform public.avvisa_ufficio(r.id, titolo);
    perform public.notifica(r.operatore_id, titolo, public.descrivi_evento(r.id), '/operatore/eventi/' || r.id);
  end loop;
end $$;
revoke execute on function public.controlla_ritardi() from public, anon, authenticated;

create or replace function public.controlla_scadenze() returns void
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  for p in update public.proposte set stato = 'scaduta', risposta_il = now()
           where stato = 'in_attesa' and scade_il < now() returning evento_id
  loop
    update public.eventi set stato = 'da_assegnare', operatore_id = null where id = p.evento_id and stato = 'proposto';
  end loop;

  for p in select id, operatore_id from public.eventi
           where stato = 'confermato' and operatore_id is not null
             and allestimento_il between now() + interval '23 hours 45 minutes' and now() + interval '24 hours'
  loop
    perform public.notifica(p.operatore_id, 'Domani hai un evento', public.descrivi_evento(p.id), '/operatore/eventi/' || p.id);
  end loop;

  perform public.controlla_ritardi();
end $$;

/** L'operatore si è dimenticato il check-out: l'ufficio chiude l'evento a mano */
create or replace function public.concludi_evento(p_evento uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare ev public.eventi;
begin
  select * into ev from public.eventi where id = p_evento for update;
  if not found or not public.gestisco_evento(p_evento) or public.mio_ruolo() not in ('admin', 'project', 'gestore_operatori') then
    raise exception 'Non puoi chiudere questo evento';
  end if;
  if ev.stato not in ('confermato', 'in_corso') then raise exception 'Si chiudono solo eventi confermati o in corso'; end if;
  if now() < ev.allestimento_il then raise exception 'L''evento non è ancora iniziato'; end if;
  update public.eventi set stato = 'completato' where id = p_evento;
end $$;
revoke execute on function public.concludi_evento(uuid) from public, anon;
grant execute on function public.concludi_evento(uuid) to authenticated;

create index if not exists eventi_smontaggio on public.eventi (smontaggio_il);
create index if not exists eventi_allestimento on public.eventi (allestimento_il);
