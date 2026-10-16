-- =========================================================
-- 1. Permessi per ruolo, in un posto solo
-- =========================================================
-- Chi lavora in ufficio (tutti tranne l'operatore)
create or replace function public.e_gestione() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.mio_ruolo() in ('admin', 'project', 'gestore_operatori', 'amministrazione'), false) $$;

-- Chi vede tutti gli eventi (il project vede solo i suoi)
create or replace function public.vede_tutti_eventi() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.mio_ruolo() in ('admin', 'gestore_operatori', 'amministrazione'), false) $$;

-- Chi gestisce gli operatori (approvazione, regioni, magazzino, assegnazioni)
create or replace function public.gestisce_operatori() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.mio_ruolo() in ('admin', 'gestore_operatori'), false) $$;

-- Chi gestisce i soldi (costi, compensi, fatture, carte)
create or replace function public.amministra() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.mio_ruolo() in ('admin', 'amministrazione'), false) $$;

revoke execute on function public.e_gestione(), public.vede_tutti_eventi(), public.gestisce_operatori(), public.amministra() from public, anon;
grant execute on function public.e_gestione(), public.vede_tutti_eventi(), public.gestisce_operatori(), public.amministra() to authenticated;

create or replace function public.gestisco_evento(p_evento uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.vede_tutti_eventi()
      or exists (select 1 from public.eventi where id = p_evento and project_id = auth.uid())
$$;

-- Eventi: gestore operatori e amministrazione li vedono tutti; l'amministrazione aggiorna prezzi e fatture
create policy eventi_staff_select on public.eventi for select to authenticated using (public.vede_tutti_eventi());
create policy eventi_amministrazione_update on public.eventi for update to authenticated
  using (public.mio_ruolo() = 'amministrazione') with check (public.mio_ruolo() = 'amministrazione');

-- Costi: non per il gestore operatori
alter policy costi_gestione on public.costi_evento
  using (public.gestisco_evento(evento_id) and public.mio_ruolo() <> 'gestore_operatori')
  with check (public.gestisco_evento(evento_id) and public.mio_ruolo() <> 'gestore_operatori');

alter policy ore_select on public.ore_lavorate using (operatore_id = auth.uid() or public.gestisco_evento(evento_id));
alter policy ore_approva on public.ore_lavorate
  using (public.amministra() or exists (select 1 from public.eventi e where e.id = ore_lavorate.evento_id and e.project_id = auth.uid()));
alter policy proposte_select on public.proposte using (operatore_id = auth.uid() or public.gestisco_evento(evento_id));
alter policy spese_select on public.spese using (operatore_id = auth.uid() or public.gestisco_evento(evento_id));
alter policy spese_approva on public.spese
  using (public.amministra() or exists (select 1 from public.eventi e where e.id = spese.evento_id and e.project_id = auth.uid()));

-- Anagrafiche
alter policy profili_select on public.profili using (id = auth.uid() or public.e_gestione());
alter policy profili_update on public.profili using (id = auth.uid() or public.gestisce_operatori());
alter policy zone_select on public.zone_operatore using (operatore_id = auth.uid() or public.e_gestione());
alter policy zone_write on public.zone_operatore
  using (operatore_id = auth.uid() or public.gestisce_operatori()) with check (operatore_id = auth.uid() or public.gestisce_operatori());
alter policy indisp_select on public.indisponibilita using (operatore_id = auth.uid() or public.e_gestione());
alter policy indisp_write on public.indisponibilita
  using (operatore_id = auth.uid() or public.gestisce_operatori()) with check (operatore_id = auth.uid() or public.gestisce_operatori());
alter policy clienti_select on public.clienti using (public.e_gestione());
alter policy clienti_write on public.clienti
  using (public.mio_ruolo() in ('admin', 'project', 'amministrazione')) with check (public.mio_ruolo() in ('admin', 'project', 'amministrazione'));
alter policy location_write on public.location using (public.e_gestione()) with check (public.e_gestione());
alter policy magazzini_write on public.magazzini using (public.gestisce_operatori()) with check (public.gestisce_operatori());
alter policy articoli_write on public.articoli
  using (public.mio_ruolo() in ('admin', 'project', 'gestore_operatori')) with check (public.mio_ruolo() in ('admin', 'project', 'gestore_operatori'));
alter policy attivita_gestione on public.attivita using (public.e_gestione()) with check (public.e_gestione());
alter policy carte_select on public.carte_aziendali using (operatore_id = auth.uid() or public.amministra() or public.mio_ruolo() = 'project');
alter policy carte_write on public.carte_aziendali using (public.amministra()) with check (public.amministra());
alter policy movimenti_carta_select on public.movimenti_carta using (operatore_id = auth.uid() or public.e_gestione());

-- Ruolo: solo admin. Attivo: admin e gestore operatori. Tariffa: admin e amministrazione.
create or replace function public.proteggi_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r public.ruolo := public.mio_ruolo();
begin
  if auth.uid() is null or r = 'admin' then return new; end if;
  if new.ruolo is distinct from old.ruolo then raise exception 'Solo un admin può cambiare il ruolo'; end if;
  if new.attivo is distinct from old.attivo and r <> 'gestore_operatori' then
    raise exception 'Solo admin e gestore operatori possono attivare un operatore';
  end if;
  if new.tariffa_oraria is distinct from old.tariffa_oraria and r <> 'amministrazione' then
    raise exception 'Solo admin e amministrazione possono cambiare la tariffa';
  end if;
  if new.carta_disponibile is distinct from old.carta_disponibile and current_setting('app.carta', true) is distinct from 'si' then
    raise exception 'La scorta di carta si cambia con una ricarica o un conteggio';
  end if;
  return new;
end $$;

create or replace function public.operatori_disponibili(p_evento uuid)
returns setof public.profili language plpgsql stable security definer set search_path = public
as $$
begin
  if public.gestisco_evento(p_evento) then
    return query select * from public._operatori_disponibili(p_evento);
  end if;
end $$;

create or replace function public.proponi_operatore(p_evento uuid, p_operatore uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not (public.gestisce_operatori() or exists (select 1 from public.eventi where id = p_evento and project_id = auth.uid())) then
    raise exception 'Non autorizzato';
  end if;
  if not exists (select 1 from public.profili where id = p_operatore and ruolo = 'operatore' and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.proposte set stato = 'revocata' where evento_id = p_evento and stato = 'in_attesa';
  update public.eventi
     set operatore_id = p_operatore,
         magazzino_id = coalesce(magazzino_id, (select magazzino_id from public.profili where id = p_operatore)),
         stato = 'proposto'
   where id = p_evento;
  insert into public.proposte (evento_id, operatore_id, scade_il) values (p_evento, p_operatore, now() + public.ore_scadenza());
end $$;

create or replace function public.invia_ricarica_carta(p_operatore uuid, p_stampe integer, p_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.e_gestione() then raise exception 'Non autorizzato'; end if;
  if p_stampe <= 0 then raise exception 'Quantità non valida'; end if;
  perform public._muovi_carta(p_operatore, (select carta_disponibile from public.profili where id = p_operatore) + p_stampe,
    'ricarica', p_stampe, null, p_note);
  perform public.notifica(p_operatore, 'Ricarica di carta in arrivo', '+' || p_stampe || ' stampe' || coalesce(' · ' || p_note, ''), '/operatore/profilo');
end $$;

create or replace function public.segnala_carta(p_stampe integer, p_operatore uuid default null)
returns void language plpgsql security definer set search_path = public
as $$
declare chi uuid := coalesce(p_operatore, auth.uid());
begin
  if chi <> auth.uid() and not public.e_gestione() then raise exception 'Non autorizzato'; end if;
  perform public._muovi_carta(chi, p_stampe, 'correzione', p_stampe, null, 'Quantità contata');
end $$;

-- Avvisi carta anche ai gestori operatori
create or replace function public._muovi_carta(p_operatore uuid, p_nuova integer, p_tipo text, p_delta integer, p_evento uuid, p_note text)
returns void language plpgsql security definer set search_path = public
as $$
declare prima integer; soglia integer := public.soglia_carta(); v_nome text; destinatario uuid;
begin
  select p.carta_disponibile, trim(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, '')) into prima, v_nome from public.profili p where p.id = p_operatore;
  perform set_config('app.carta', 'si', true);
  update public.profili set carta_disponibile = greatest(0, p_nuova) where id = p_operatore;
  perform set_config('app.carta', 'no', true);
  insert into public.movimenti_carta (operatore_id, tipo, stampe, evento_id, note) values (p_operatore, p_tipo, p_delta, p_evento, p_note);

  if (prima >= soglia and greatest(0, p_nuova) < soglia) or (prima > 0 and p_nuova <= 0) then
    for destinatario in
      select id from public.profili where ruolo in ('admin', 'gestore_operatori') and attivo
      union select project_id from public.eventi where id = p_evento
      union select project_id from public.eventi where operatore_id = p_operatore and allestimento_il > now()
        and stato not in ('annullato', 'completato')
    loop
      perform public.notifica(destinatario,
        case when p_nuova <= 0 then 'Carta finita' else 'Carta in esaurimento' end,
        v_nome || ': restano ' || greatest(0, p_nuova) || ' stampe. Manda una ricarica.',
        '/gestione/operatori/' || p_operatore);
    end loop;
  end if;
end $$;

-- =========================================================
-- 2. Il magazzino si aggiorna da solo quando l'attrezzatura esce e rientra
-- =========================================================
alter table public.articoli add column if not exists in_uso integer not null default 0 check (in_uso >= 0);  -- pezzi fuori per eventi
alter table public.attrezzatura_evento add column if not exists prelevato_il timestamptz;
alter table public.attrezzatura_evento add column if not exists rientrato_il timestamptz;

-- I consumabili (carta, bicchieri…) escono e non rientrano: si scalano dalla quantità.
-- Il resto (booth, stampanti…) risulta "fuori" finché non rientra.
create or replace function public.movimento_attrezzatura()
returns trigger language plpgsql security definer set search_path = public
as $$
declare consumabile boolean;
begin
  if tg_op = 'DELETE' then
    if old.prelevato_il is not null and old.rientrato_il is null then
      update public.articoli set in_uso = greatest(0, in_uso - old.quantita) where id = old.articolo_id and categoria <> 'Consumabili';
    end if;
    return old;
  end if;

  select categoria = 'Consumabili' into consumabile from public.articoli where id = new.articolo_id;

  if new.prelevato_il is not null and old.prelevato_il is null then
    if consumabile then
      update public.articoli set quantita = greatest(0, quantita - new.quantita) where id = new.articolo_id;
    else
      update public.articoli set in_uso = in_uso + new.quantita where id = new.articolo_id;
    end if;
  end if;

  -- quantità cambiata mentre è fuori
  if new.quantita <> old.quantita and old.prelevato_il is not null and new.prelevato_il is not null and old.rientrato_il is null then
    if consumabile then
      update public.articoli set quantita = greatest(0, quantita - (new.quantita - old.quantita)) where id = new.articolo_id;
    else
      update public.articoli set in_uso = greatest(0, in_uso + (new.quantita - old.quantita)) where id = new.articolo_id;
    end if;
  end if;

  if new.rientrato_il is not null and old.rientrato_il is null and new.prelevato_il is not null and not consumabile then
    update public.articoli set in_uso = greatest(0, in_uso - new.quantita) where id = new.articolo_id;
  end if;
  return new;
end $$;
revoke execute on function public.movimento_attrezzatura() from public, anon, authenticated;
create trigger attrezzatura_movimento after update or delete on public.attrezzatura_evento
for each row execute function public.movimento_attrezzatura();

-- La tappa "Parto dal magazzino" preleva l'attrezzatura dell'evento, "Rientrato" la riporta
create or replace function public.attrezzatura_da_tappe()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.partenza_il is not null and old.partenza_il is null then
    update public.attrezzatura_evento set prelevato_il = new.partenza_il where evento_id = new.evento_id and prelevato_il is null;
  end if;
  if new.rientro_il is not null and old.rientro_il is null then
    update public.attrezzatura_evento set rientrato_il = new.rientro_il where evento_id = new.evento_id and prelevato_il is not null and rientrato_il is null;
  end if;
  return null;
end $$;
revoke execute on function public.attrezzatura_da_tappe() from public, anon, authenticated;
create trigger ore_attrezzatura after update of partenza_il, rientro_il on public.ore_lavorate
for each row execute function public.attrezzatura_da_tappe();

-- Prelievo/rientro a mano (dal pannello o se l'operatore non usa le tappe)
create or replace function public.segna_attrezzatura(p_evento uuid, p_azione text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not (public.gestisco_evento(p_evento) or public.lavoro_evento(p_evento)) then raise exception 'Non autorizzato'; end if;
  if p_azione = 'prelievo' then
    update public.attrezzatura_evento set prelevato_il = now() where evento_id = p_evento and prelevato_il is null;
  elsif p_azione = 'rientro' then
    update public.attrezzatura_evento set rientrato_il = now() where evento_id = p_evento and prelevato_il is not null and rientrato_il is null;
  else
    raise exception 'Azione non valida';
  end if;
end $$;
revoke execute on function public.segna_attrezzatura(uuid, text) from public, anon;
grant execute on function public.segna_attrezzatura(uuid, text) to authenticated;

-- L'amministrazione aggiorna le tariffe degli operatori (gli altri campi restano protetti dal trigger)
alter policy profili_update on public.profili using (id = auth.uid() or public.gestisce_operatori() or public.amministra());
