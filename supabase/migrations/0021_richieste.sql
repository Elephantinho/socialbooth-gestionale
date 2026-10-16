-- Richieste tra persone e ruoli: "manda carta a…", "porta questa attrezzatura a…", "mi manca…".
-- Le crea chiunque (anche l'operatore dall'app), le riceve un ruolo o una persona.
create table public.richieste (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('carta', 'attrezzatura', 'trasferimento', 'manutenzione', 'altro')),
  titolo        text not null,
  dettagli      text,
  da_id         uuid not null default auth.uid() references public.profili(id) on delete cascade,
  per_ruolo     public.ruolo,                                            -- es. gestore_operatori
  per_utente    uuid references public.profili(id) on delete set null,   -- oppure una persona precisa
  operatore_id  uuid references public.profili(id) on delete set null,   -- a chi va (carta, attrezzatura)
  magazzino_id  uuid references public.magazzini(id) on delete set null, -- dove va / da dove parte
  evento_id     uuid references public.eventi(id) on delete set null,
  quantita      integer check (quantita is null or quantita > 0),        -- carta: stampe
  scadenza      date,
  stato         text not null default 'aperta' check (stato in ('aperta', 'in_corso', 'fatta', 'annullata')),
  preso_da      uuid references public.profili(id) on delete set null,
  nota_chiusura text,
  creato_il     timestamptz not null default now(),
  chiuso_il     timestamptz,
  check (per_ruolo is not null or per_utente is not null)
);
create index richieste_stato_idx on public.richieste (stato, creato_il desc);
alter table public.richieste enable row level security;

-- Chi la vede: chi l'ha fatta, chi la riceve (persona o ruolo), l'operatore interessato, l'admin
create or replace function public.vedo_richiesta(r public.richieste) returns boolean
language sql stable security definer set search_path = public
as $$
  select r.da_id = auth.uid() or r.per_utente = auth.uid() or r.operatore_id = auth.uid()
      or r.per_ruolo = public.mio_ruolo() or public.mio_ruolo() = 'admin'
$$;
revoke execute on function public.vedo_richiesta(public.richieste) from public, anon;
grant execute on function public.vedo_richiesta(public.richieste) to authenticated;

create policy richieste_select on public.richieste for select to authenticated using (public.vedo_richiesta(richieste));
create policy richieste_insert on public.richieste for insert to authenticated with check (da_id = auth.uid());
create policy richieste_update on public.richieste for update to authenticated using (public.vedo_richiesta(richieste));

-- Notifiche: a chi la riceve quando nasce, a chi l'ha fatta quando cambia stato.
-- Una richiesta di carta segnata "fatta" registra da sola la ricarica dell'operatore.
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
    if new.stato = 'fatta' and new.tipo = 'carta' and new.operatore_id is not null and coalesce(new.quantita, 0) > 0 then
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
revoke execute on function public.richieste_automatismi() from public, anon, authenticated;
create trigger richieste_automatismi after insert or update on public.richieste
for each row execute function public.richieste_automatismi();

alter publication supabase_realtime add table public.richieste;
