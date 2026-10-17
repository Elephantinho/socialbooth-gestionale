-- Altri buchi trovati con i test.

/* 1. Attrezzatura di un evento:
      - non se ne assegna più di quanta ne esiste in magazzino;
      - un pezzo già uscito e non rientrato non si toglie dalla lista (il magazzino lo darebbe per rientrato). */
create or replace function public.controlla_attrezzatura()
returns trigger language plpgsql security definer set search_path = public
as $$
declare a public.articoli;
begin
  if tg_op = 'DELETE' then
    select * into a from public.articoli where id = old.articolo_id;
    if old.prelevato_il is not null and old.rientrato_il is null and a.categoria is distinct from 'Consumabili'
       and exists (select 1 from public.eventi where id = old.evento_id) then
      raise exception '"%" è fuori dal magazzino: segna prima il rientro', a.nome;
    end if;
    return old;
  end if;
  select * into a from public.articoli where id = new.articolo_id;
  if new.quantita is null or new.quantita <= 0 then raise exception 'Quantità non valida'; end if;
  if new.quantita > a.quantita and (tg_op = 'INSERT' or new.quantita > old.quantita) then
    raise exception 'In magazzino ci sono solo % "%"', a.quantita, a.nome;
  end if;
  return new;
end $$;
revoke execute on function public.controlla_attrezzatura() from public, anon, authenticated;

create trigger a_controlla_attrezzatura before insert or update of quantita or delete on public.attrezzatura_evento
for each row execute function public.controlla_attrezzatura();

/* 2. Operatore disattivato (o non più operatore): i suoi eventi futuri non ancora iniziati
      tornano da assegnare e il project viene avvisato. */
create or replace function public.operatore_uscito()
returns trigger language plpgsql security definer set search_path = public
as $$
declare ev record;
begin
  if old.ruolo = 'operatore' and old.attivo and (not new.attivo or new.ruolo <> 'operatore') then
    for ev in select id, project_id from public.eventi
              where operatore_id = new.id and stato in ('proposto', 'confermato') and allestimento_il > now()
    loop
      update public.proposte set stato = 'revocata', risposta_il = now()
       where evento_id = ev.id and operatore_id = new.id and stato in ('in_attesa', 'accettata');
      update public.eventi set stato = 'da_assegnare', operatore_id = null where id = ev.id;
      perform public.notifica(ev.project_id, 'Evento da riassegnare',
        public.descrivi_evento(ev.id) || ': ' || trim(new.nome || ' ' || new.cognome) || ' non è più attivo.',
        '/gestione/eventi/' || ev.id);
    end loop;
  end if;
  return null;
end $$;
revoke execute on function public.operatore_uscito() from public, anon, authenticated;

create trigger operatore_uscito after update of attivo, ruolo on public.profili
for each row execute function public.operatore_uscito();
