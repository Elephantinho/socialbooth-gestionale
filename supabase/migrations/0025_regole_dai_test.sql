-- Correzioni trovate con i test a tappeto (supabase/test).

/* 1. Lo stato di un evento non si forza a mano.
      Dall'app (ruolo "authenticated") si può solo: creare in bozza o da assegnare, annullare (admin e project),
      togliere l'operatore (torna da assegnare). Proposto, confermato, in corso e completato li mettono
      solo le funzioni (proposta, risposta dell'operatore, tappe, chiusura).
      La funzione gira come chi chiama: dentro le funzioni del database current_user è il proprietario, non "authenticated". */
create or replace function public.regole_stato_evento()
returns trigger language plpgsql set search_path = public
as $$
declare r public.ruolo := public.mio_ruolo();
begin
  if current_user <> 'authenticated' then return coalesce(new, old); end if;

  if tg_op = 'DELETE' then
    if old.stato not in ('bozza', 'da_assegnare', 'annullato') then
      raise exception 'Un evento già assegnato non si cancella: annullalo';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.stato not in ('bozza', 'da_assegnare') or new.operatore_id is not null then
      raise exception 'Un nuovo evento parte da assegnare: l''operatore si propone dopo';
    end if;
    return new;
  end if;

  if new.project_id is distinct from old.project_id and r <> 'admin' then
    raise exception 'Solo un admin può passare un evento a un altro project';
  end if;

  if new.operatore_id is distinct from old.operatore_id and new.operatore_id is not null then
    raise exception 'L''operatore si cambia con una proposta, non a mano';
  end if;

  if new.stato is distinct from old.stato then
    if new.stato = 'annullato' then
      if r not in ('admin', 'project') then raise exception 'Solo admin e project possono annullare un evento'; end if;
    elsif new.stato = 'da_assegnare' and new.operatore_id is null and old.stato in ('bozza', 'proposto', 'confermato', 'annullato') then
      if r not in ('admin', 'project', 'gestore_operatori') then raise exception 'Non puoi cambiare l''assegnazione'; end if;
    elsif new.stato = 'bozza' and old.stato in ('da_assegnare', 'annullato') and new.operatore_id is null then
      null;
    else
      raise exception 'Lo stato "%" non si imposta a mano: cambia da solo con proposte, tappe e chiusura', new.stato;
    end if;
  elsif new.operatore_id is null and old.operatore_id is not null then
    raise exception 'Togliendo l''operatore l''evento torna da assegnare';
  end if;
  return new;
end $$;
revoke execute on function public.regole_stato_evento() from public, anon;

create trigger a_regole_stato before insert or update or delete on public.eventi
for each row execute function public.regole_stato_evento();

/* 2. Operatore tolto o sostituito: la sua proposta decade (così l'assegnazione automatica non lo ripropone)
      e gli arriva un avviso. Non quando è lui a rifiutare. Nome con "a_" per girare prima dell'assegnazione automatica. */
create or replace function public.operatore_tolto()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.operatore_id is not null and new.operatore_id is distinct from old.operatore_id
     and auth.uid() is distinct from old.operatore_id then
    update public.proposte set stato = 'revocata', risposta_il = coalesce(risposta_il, now())
     where evento_id = new.id and operatore_id = old.operatore_id and stato in ('in_attesa', 'accettata');
    if new.stato <> 'annullato' then
      perform public.notifica(old.operatore_id, 'Non sei più assegnato',
        public.descrivi_evento(new.id), '/operatore');
    end if;
  end if;
  return null;
end $$;
revoke execute on function public.operatore_tolto() from public, anon, authenticated;

create trigger a_operatore_tolto after update of operatore_id on public.eventi
for each row execute function public.operatore_tolto();

/* 3. Chi è libero: escluso anche chi è stato tolto dall'evento; ferie confrontate con i giorni italiani
      di tutto l'evento (non solo il primo, non in UTC). */
create or replace function public._operatori_disponibili(p_evento uuid)
returns setof public.profili
language sql stable security definer set search_path = public
as $$
  select p.*
  from public.profili p
  join public.eventi e on e.id = p_evento
  join public.zone_operatore z on z.operatore_id = p.id and z.regione = e.regione
  where p.ruolo = 'operatore' and p.attivo
    and not exists (
      select 1 from public.proposte pr
      where pr.evento_id = e.id and pr.operatore_id = p.id and pr.stato in ('rifiutata', 'scaduta', 'revocata'))
    and not exists (
      select 1 from public.indisponibilita i
      where i.operatore_id = p.id
        and daterange(i.dal, i.al, '[]') && daterange((e.allestimento_il at time zone 'Europe/Rome')::date,
                                                    (e.smontaggio_il at time zone 'Europe/Rome')::date, '[]'))
    and not exists (
      select 1 from public.eventi altro
      where altro.operatore_id = p.id and altro.id <> e.id
        and altro.stato not in ('annullato')
        and tstzrange(altro.allestimento_il, altro.smontaggio_il)
         && tstzrange(e.allestimento_il, e.smontaggio_il))
$$;
revoke execute on function public._operatori_disponibili(uuid) from public, anon, authenticated;

/* 4. Inventario: lo cambia solo chi gestisce i magazzini (admin e gestore). Le uscite per gli eventi
      passano dai trigger, quindi il project continua a scegliere l'attrezzatura dei suoi eventi. */
alter policy articoli_write on public.articoli
  using (public.gestisce_operatori()) with check (public.gestisce_operatori());

/* 5. Location: le salvano admin, project e gestore (l'amministrazione le legge soltanto). */
alter policy location_write on public.location
  using (public.mio_ruolo() in ('admin', 'project', 'gestore_operatori'))
  with check (public.mio_ruolo() in ('admin', 'project', 'gestore_operatori'));

/* 6. Ricariche di carta: solo admin, project e gestore, e solo a un operatore. */
create or replace function public.invia_ricarica_carta(p_operatore uuid, p_stampe integer, p_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.mio_ruolo() is null or public.mio_ruolo() not in ('admin', 'project', 'gestore_operatori') then raise exception 'Non autorizzato'; end if;
  if p_stampe is null or p_stampe <= 0 then raise exception 'Quantità non valida'; end if;
  if not exists (select 1 from public.profili where id = p_operatore and ruolo = 'operatore') then raise exception 'Non è un operatore'; end if;
  perform public._muovi_carta(p_operatore, (select carta_disponibile from public.profili where id = p_operatore) + p_stampe,
    'ricarica', p_stampe, null, p_note);
  perform public.notifica(p_operatore, 'Ricarica di carta in arrivo', '+' || p_stampe || ' stampe' || coalesce(' · ' || p_note, ''), '/operatore/profilo');
end $$;

/* 7. Chat: solo il canale della squadra o una chat a due "dm:<id>:<id>" di cui si fa parte. */
create or replace function public.posso_leggere_canale(p_canale text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profili where id = auth.uid() and attivo)
     and (p_canale = 'squadra'
          or (p_canale ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
              and auth.uid()::text in (split_part(p_canale, ':', 2), split_part(p_canale, ':', 3))))
$$;

/* 8. Chi si registra da solo resta in attesa finché admin o gestore non lo attivano,
      qualunque cosa mandi nella registrazione. */
create or replace function public.crea_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text;
begin
  insert into public.profili (id, nome, cognome, telefono, attivo)
  values (new.id, coalesce(meta->>'nome', ''), coalesce(meta->>'cognome', ''), nullif(meta->>'telefono', ''), false);

  if jsonb_typeof(meta->'regioni') = 'array' then
    for r in select jsonb_array_elements_text(meta->'regioni') loop
      if r = any (enum_range(null::public.regione)::text[]) then
        insert into public.zone_operatore (operatore_id, regione) values (new.id, r::public.regione) on conflict do nothing;
      end if;
    end loop;
  end if;
  return new;
end $$;

/* 9. Risposta a una proposta: non oltre la scadenza e solo se l'evento è ancora proposto a lui. */
create or replace function public.rispondi_proposta(p_proposta uuid, p_accetta boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare v public.proposte;
begin
  select * into v from public.proposte
   where id = p_proposta and operatore_id = auth.uid() and stato = 'in_attesa';
  if not found then raise exception 'Proposta non valida'; end if;
  if v.scade_il < now() then raise exception 'La proposta è scaduta'; end if;
  if not exists (select 1 from public.eventi where id = v.evento_id and operatore_id = auth.uid() and stato = 'proposto') then
    raise exception 'L''evento non è più disponibile';
  end if;

  update public.proposte
     set stato = case when p_accetta then 'accettata' else 'rifiutata' end::public.stato_proposta, risposta_il = now()
   where id = p_proposta;

  if p_accetta then
    update public.eventi set stato = 'confermato' where id = v.evento_id;
  else
    update public.eventi set stato = 'da_assegnare', operatore_id = null where id = v.evento_id;
  end if;
end $$;

/* 10. Chiusura a mano: minuti sensati (niente negativi, niente giorni interi di viaggio). */
create or replace function public.chiudi_evento(p_evento uuid, p_minuti_location int, p_minuti_viaggio int, p_nota text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.eventi
                 where id = p_evento and operatore_id = auth.uid() and stato in ('confermato', 'in_corso')) then
    raise exception 'Evento non chiudibile';
  end if;
  if p_minuti_location is null or p_minuti_location < 0 or p_minuti_location > 48 * 60 then
    raise exception 'Ore in location non valide';
  end if;
  if p_minuti_viaggio is null or p_minuti_viaggio < 0 or p_minuti_viaggio > 24 * 60 then
    raise exception 'Ore di viaggio non valide';
  end if;

  insert into public.ore_lavorate (evento_id, operatore_id, check_out_il, minuti_in_location, minuti_viaggio, nota_operatore, tariffa_oraria)
  values (p_evento, auth.uid(), now(), p_minuti_location, p_minuti_viaggio, p_nota,
          (select tariffa_oraria from public.profili where id = auth.uid()))
  on conflict (evento_id, operatore_id) do update
     set check_out_il = now(), minuti_in_location = excluded.minuti_in_location, minuti_viaggio = excluded.minuti_viaggio,
         nota_operatore = excluded.nota_operatore, tariffa_oraria = excluded.tariffa_oraria, stato = 'inviato';

  update public.eventi set stato = 'completato' where id = p_evento;
end $$;

/* 11. Una richiesta nasce aperta (non già fatta o presa da qualcuno). */
create or replace function public.richiesta_nuova()
returns trigger language plpgsql set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    new.stato := 'aperta'; new.preso_da := null; new.chiuso_il := null; new.carta_registrata_il := null; new.nota_chiusura := null;
  end if;
  return new;
end $$;
revoke execute on function public.richiesta_nuova() from public, anon;
create trigger a_richiesta_nuova before insert on public.richieste
for each row execute function public.richiesta_nuova();
