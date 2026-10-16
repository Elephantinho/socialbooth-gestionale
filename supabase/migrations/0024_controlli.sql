-- Controlli emersi dalla revisione del codice.

-- 1. Richieste: solo chi la riceve può prenderla in carico o segnarla fatta.
--    Senza questo, l'operatore poteva segnare "fatta" la propria richiesta di carta e ricaricarsi da solo.
create or replace function public.controlla_richiesta()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  io uuid := auth.uid();
  r public.ruolo := public.mio_ruolo();
  destinatario boolean := coalesce(new.per_utente = io, false) or coalesce(new.per_ruolo = r, false) or r = 'admin';
begin
  if io is null or r = 'admin' then return new; end if;
  if new.stato is distinct from old.stato then
    if new.stato in ('in_corso', 'fatta') and not destinatario then
      raise exception 'Solo chi riceve la richiesta può prenderla in carico o segnarla fatta';
    end if;
    if new.stato in ('annullata', 'aperta') and not (old.da_id = io or destinatario) then
      raise exception 'Solo chi ha fatto la richiesta può annullarla o riaprirla';
    end if;
  end if;
  -- Cosa si chiede e a chi non cambia dopo l'invio
  if (new.tipo, new.da_id, new.per_ruolo, new.per_utente, new.operatore_id, new.magazzino_id, new.quantita)
     is distinct from (old.tipo, old.da_id, old.per_ruolo, old.per_utente, old.operatore_id, old.magazzino_id, old.quantita) then
    raise exception 'Una richiesta inviata non si può cambiare: annullala e fanne una nuova';
  end if;
  return new;
end $$;
revoke execute on function public.controlla_richiesta() from public, anon, authenticated;
create trigger a_controlla_richiesta before update on public.richieste
for each row execute function public.controlla_richiesta();

-- 2. Carta: si sa se la scorta di un operatore è mai stata impostata (ricarica o conteggio)
alter table public.profili add column if not exists carta_aggiornata_il timestamptz;
update public.profili p set carta_aggiornata_il = m.ultimo
  from (select operatore_id, max(creato_il) ultimo from public.movimenti_carta group by 1) m
 where m.operatore_id = p.id and p.carta_aggiornata_il is null;

create or replace function public.segna_carta_aggiornata()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform set_config('app.carta', 'si', true);
  update public.profili set carta_aggiornata_il = new.creato_il where id = new.operatore_id;
  perform set_config('app.carta', 'no', true);
  return null;
end $$;
revoke execute on function public.segna_carta_aggiornata() from public, anon, authenticated;
create trigger movimenti_carta_aggiornata after insert on public.movimenti_carta
for each row execute function public.segna_carta_aggiornata();

-- 3. Indici sulle colonne usate per cercare (più veloce quando i dati crescono)
create index if not exists ore_lavorate_operatore_idx on public.ore_lavorate (operatore_id);
create index if not exists proposte_evento_idx on public.proposte (evento_id);
create index if not exists allegati_evento_idx on public.allegati (evento_id);
create index if not exists attrezzatura_evento_articolo_idx on public.attrezzatura_evento (articolo_id);
create index if not exists costi_evento_operatore_idx on public.costi_evento (operatore_id);
create index if not exists indisponibilita_operatore_idx on public.indisponibilita (operatore_id);
create index if not exists eventi_cliente_idx on public.eventi (cliente_id);
create index if not exists eventi_magazzino_idx on public.eventi (magazzino_id);
create index if not exists richieste_per_utente_idx on public.richieste (per_utente);
create index if not exists richieste_operatore_idx on public.richieste (operatore_id);
create index if not exists richieste_da_idx on public.richieste (da_id);
create index if not exists movimenti_carta_evento_idx on public.movimenti_carta (evento_id);

-- 4. Una richiesta di carta riaperta e richiusa non ricarica due volte
alter table public.richieste add column if not exists carta_registrata_il timestamptz;
create or replace function public.richieste_automatismi()
returns trigger language plpgsql security definer set search_path = public
as $$
declare destinatario uuid; chi text := (select trim(nome || ' ' || cognome) from public.profili where id = auth.uid());
begin
  if tg_op = 'INSERT' then
    for destinatario in
      select new.per_utente where new.per_utente is not null
      union select id from public.profili where new.per_utente is null and ruolo = new.per_ruolo and attivo
    loop
      if destinatario <> new.da_id then
        perform public.notifica(destinatario, 'Nuova richiesta: ' || new.titolo,
          coalesce(chi, 'Qualcuno') || coalesce(' · ' || new.dettagli, ''), '/richieste/' || new.id);
      end if;
    end loop;
    return null;
  end if;

  if new.stato is distinct from old.stato then
    if new.stato in ('fatta', 'annullata') then
      update public.richieste set chiuso_il = now() where id = new.id and chiuso_il is null;
    end if;
    if new.stato = 'fatta' and new.tipo = 'carta' and new.operatore_id is not null and coalesce(new.quantita, 0) > 0
       and new.carta_registrata_il is null then
      update public.richieste set carta_registrata_il = now() where id = new.id;
      perform public._muovi_carta(new.operatore_id,
        (select carta_disponibile from public.profili where id = new.operatore_id) + new.quantita,
        'ricarica', new.quantita, new.evento_id, 'Richiesta: ' || new.titolo);
      perform public.notifica(new.operatore_id, 'Ricarica di carta in arrivo', '+' || new.quantita || ' stampe', '/operatore/profilo');
    end if;
    if new.da_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000') then
      perform public.notifica(new.da_id,
        case new.stato when 'in_corso' then 'Presa in carico: ' when 'fatta' then 'Fatto: ' when 'annullata' then 'Annullata: ' else 'Riaperta: ' end || new.titolo,
        coalesce(chi, '') || coalesce(' · ' || new.nota_chiusura, ''), '/richieste/' || new.id);
    end if;
  end if;
  return null;
end $$;

-- 5. Stampe dichiarate poi respinte o cancellate: la carta torna nella scorta dell'operatore
create or replace function public.restituisci_carta()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r public.costi_evento := case when tg_op = 'DELETE' then old else new end;
begin
  if old.categoria = 'carta_stampe' and old.fase = 'finale' and old.operatore_id is not null and coalesce(old.stampe, 0) > 0
     and old.stato <> 'respinto' and (tg_op = 'DELETE' or new.stato = 'respinto') then
    perform public._muovi_carta(old.operatore_id,
      (select carta_disponibile from public.profili where id = old.operatore_id) + old.stampe,
      'correzione', (select carta_disponibile from public.profili where id = old.operatore_id) + old.stampe, old.evento_id,
      'Stampe annullate: ' || old.stampe);
  end if;
  return r;
end $$;
revoke execute on function public.restituisci_carta() from public, anon, authenticated;
create trigger costi_restituisci_carta after update of stato or delete on public.costi_evento
for each row execute function public.restituisci_carta();
