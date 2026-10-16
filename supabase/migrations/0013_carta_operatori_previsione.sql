-- =========================================================
-- Scorte di carta degli operatori, ricariche, avvisi automatici;
-- costo previsto della carta aggiunto da solo ai nuovi eventi
-- =========================================================

alter table public.profili add column if not exists carta_disponibile integer not null default 0;  -- stampe che l'operatore può ancora fare

insert into public.impostazioni (chiave, valore, descrizione) values
  ('soglia_carta', 200, 'Sotto questo numero di stampe la carta dell''operatore diventa rossa')
on conflict do nothing;

-- Storico di ricariche e correzioni
create table public.movimenti_carta (
  id            uuid primary key default gen_random_uuid(),
  operatore_id  uuid not null references public.profili(id) on delete cascade,
  tipo          text not null check (tipo in ('ricarica', 'consumo', 'correzione')),
  stampe        integer not null,          -- + ricarica, - consumo, valore assoluto per correzione
  evento_id     uuid references public.eventi(id) on delete set null,
  note          text,
  fatto_da      uuid default auth.uid() references public.profili(id) on delete set null,
  creato_il     timestamptz not null default now()
);
create index movimenti_carta_idx on public.movimenti_carta (operatore_id, creato_il desc);
alter table public.movimenti_carta enable row level security;
create policy movimenti_carta_select on public.movimenti_carta for select to authenticated
  using (operatore_id = auth.uid() or public.mio_ruolo() in ('admin', 'project'));

-- L'operatore non può cambiarsi da solo la scorta (si usa segnala_carta)
create or replace function public.proteggi_profilo()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and public.mio_ruolo() is distinct from 'admin' and (
       new.ruolo is distinct from old.ruolo
    or new.tariffa_oraria is distinct from old.tariffa_oraria
    or new.attivo is distinct from old.attivo
    or (new.carta_disponibile is distinct from old.carta_disponibile and current_setting('app.carta', true) is distinct from 'si')) then
    raise exception 'Solo un admin può modificare ruolo, tariffa, stato o scorta di carta';
  end if;
  return new;
end $$;

create or replace function public.soglia_carta()
returns integer language sql stable security definer set search_path = public
as $$ select coalesce((select valore::int from public.impostazioni where chiave = 'soglia_carta'), 200) $$;
revoke execute on function public.soglia_carta() from public, anon, authenticated;

-- Cambia la scorta e avvisa admin e project quando scende sotto la soglia
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

  -- avviso quando scende sotto la soglia o arriva a zero (una volta sola per passaggio)
  if (prima >= soglia and greatest(0, p_nuova) < soglia) or (prima > 0 and p_nuova <= 0) then
    for destinatario in
      select id from public.profili where ruolo = 'admin' and attivo
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
revoke execute on function public._muovi_carta(uuid, integer, text, integer, uuid, text) from public, anon, authenticated;

-- Le stampe dichiarate a fine evento scalano la scorta dell'operatore
create or replace function public.consumo_carta()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.categoria = 'carta_stampe' and new.fase = 'finale' and new.operatore_id is not null and coalesce(new.stampe, 0) > 0 then
    perform public._muovi_carta(new.operatore_id,
      (select carta_disponibile from public.profili where id = new.operatore_id) - new.stampe,
      'consumo', -new.stampe, new.evento_id, null);
  end if;
  return null;
end $$;
revoke execute on function public.consumo_carta() from public, anon, authenticated;
create trigger costi_consumo_carta after insert on public.costi_evento
for each row execute function public.consumo_carta();

-- Project/admin mandano una ricarica (in stampe: confezioni × stampe per confezione)
create or replace function public.invia_ricarica_carta(p_operatore uuid, p_stampe integer, p_note text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if public.mio_ruolo() not in ('admin', 'project') then raise exception 'Non autorizzato'; end if;
  if p_stampe <= 0 then raise exception 'Quantità non valida'; end if;
  perform public._muovi_carta(p_operatore, (select carta_disponibile from public.profili where id = p_operatore) + p_stampe,
    'ricarica', p_stampe, null, p_note);
  perform public.notifica(p_operatore, 'Ricarica di carta in arrivo', '+' || p_stampe || ' stampe' || coalesce(' · ' || p_note, ''), '/operatore/profilo');
end $$;
revoke execute on function public.invia_ricarica_carta(uuid, integer, text) from public, anon;
grant execute on function public.invia_ricarica_carta(uuid, integer, text) to authenticated;

-- L'operatore (o un admin) conta la carta rimasta e corregge la scorta
create or replace function public.segnala_carta(p_stampe integer, p_operatore uuid default null)
returns void language plpgsql security definer set search_path = public
as $$
declare chi uuid := coalesce(p_operatore, auth.uid());
begin
  if chi <> auth.uid() and public.mio_ruolo() not in ('admin', 'project') then raise exception 'Non autorizzato'; end if;
  perform public._muovi_carta(chi, p_stampe, 'correzione', p_stampe, null, 'Quantità contata');
end $$;
revoke execute on function public.segnala_carta(integer, uuid) from public, anon;
grant execute on function public.segnala_carta(integer, uuid) to authenticated;

-- Ogni nuovo evento riceve da solo il costo previsto della carta (media stampe per evento)
create or replace function public.carta_prevista()
returns trigger language plpgsql security definer set search_path = public
as $$
declare media numeric := public.media_stampe_per_evento();
begin
  if media is not null and media > 0 then
    insert into public.costi_evento (evento_id, fase, categoria, quantita, costo_unitario, descrizione, pagato_con, stato)
    values (new.id, 'previsto', 'carta_stampe', media, 0, 'Carta stimata (media)', 'azienda', 'approvato');
  end if;
  return null;
end $$;
revoke execute on function public.carta_prevista() from public, anon, authenticated;
create trigger eventi_carta_prevista after insert on public.eventi
for each row execute function public.carta_prevista();
