-- Casi limite: riserva più vicina, riserva spenta, attrezzatura, operatori disattivati, carta, montaggio.
do $$
declare
  pa uuid := gen_random_uuid(); go uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); o4 uuid := gen_random_uuid();
  mf uuid; mp uuid; booth uuid; e1 uuid; e2 uuid; e3 uuid; pr uuid;
  n int; s text; t int := 0; f text := '';
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[pa, go, o1, o2, o4]) u;
  insert into magazzini (nome, indirizzo, citta, regione, lat, lng) values ('Firenze', 'x', 'Firenze', 'Toscana', 43.77, 11.25) returning id into mf;
  insert into magazzini (nome, indirizzo, citta, regione, lat, lng) values ('Pisa', 'x', 'Pisa', 'Toscana', 43.71, 10.40) returning id into mp;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1', magazzino_id = mf where id = o1;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O2', magazzino_id = mp where id = o2;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O4', magazzino_id = mf where id = o4;
  -- solo questi tre in Toscana per i test: gli operatori veri restano fuori perché non hanno zona "Molise"
  insert into zone_operatore (operatore_id, regione) values (o1, 'Molise'), (o2, 'Molise'), (o4, 'Molise');
  insert into articoli (magazzino_id, nome, categoria, quantita) values (mf, 'Booth', 'Booth', 2) returning id into booth;
  update impostazioni set valore = 1 where chiave = 'riserva_automatica';

  /* 1. Riserva: dopo il rifiuto di O1 restano O2 (Pisa) e O4 (Firenze): per un evento a Firenze sceglie O4 */
  insert into eventi (project_id, indirizzo, citta, regione, lat, lng, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'x', 'Campobasso', 'Molise', 43.78, 11.26, now() + interval '3 days', now() + interval '3 days 1 hour', now() + interval '3 days 4 hours', now() + interval '3 days 5 hours', 'bozza')
    returning id into e1;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  perform proponi_operatore(e1, o1);
  select id into pr from proposte where evento_id = e1 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  perform rispondi_proposta(pr, false);
  perform set_config('request.jwt.claims', '', true);
  t := t + 1; select operatore_id::text into s from eventi where id = e1; if s is distinct from o4::text then f := f || '1: la riserva non è la più vicina; '; end if;

  /* 2. Riserva spenta: dopo il rifiuto l'evento resta da assegnare */
  update impostazioni set valore = 0 where chiave = 'riserva_automatica';
  insert into eventi (project_id, indirizzo, citta, regione, lat, lng, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'x', 'Campobasso', 'Molise', 43.78, 11.26, now() + interval '6 days', now() + interval '6 days 1 hour', now() + interval '6 days 4 hours', now() + interval '6 days 5 hours', 'bozza')
    returning id into e2;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  perform proponi_operatore(e2, o1);
  select id into pr from proposte where evento_id = e2 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  perform rispondi_proposta(pr, false);
  perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato || coalesce(operatore_id::text, '') into s from eventi where id = e2; if s <> 'da_assegnare' then f := f || '2: riserva spenta ma propone lo stesso; '; end if;
  update impostazioni set valore = 1 where chiave = 'riserva_automatica';

  /* 3. Attrezzatura: non più di quanta ne esiste; un pezzo fuori non si toglie dalla lista */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin insert into attrezzatura_evento (evento_id, articolo_id, quantita) values (e1, booth, 5); f := f || '3: assegnati 5 booth su 2; '; exception when others then null; end;
  t := t + 1; begin insert into attrezzatura_evento (evento_id, articolo_id, quantita) values (e1, booth, 0); f := f || '3: assegnati 0 booth; '; exception when others then null; end;
  t := t + 1; begin insert into attrezzatura_evento (evento_id, articolo_id, quantita) values (e1, booth, 1); exception when others then f := f || '3: non assegna 1 booth: ' || sqlerrm || '; '; end;
  reset role;
  update attrezzatura_evento set prelevato_il = now() where evento_id = e1;
  t := t + 1; select in_uso into n from articoli where id = booth; if n <> 1 then f := f || '3: in uso ' || n || '; '; end if;
  set local role authenticated;
  t := t + 1; begin delete from attrezzatura_evento where evento_id = e1; f := f || '3: tolto un booth che è fuori; '; exception when others then null; end;
  reset role;
  t := t + 1; select in_uso into n from articoli where id = booth; if n <> 1 then f := f || '3: dopo il tentativo in uso ' || n || '; '; end if;
  update attrezzatura_evento set rientrato_il = now() where evento_id = e1;
  t := t + 1; select in_uso into n from articoli where id = booth; if n <> 0 then f := f || '3: rientro non registrato; '; end if;
  set local role authenticated;
  t := t + 1; begin delete from attrezzatura_evento where evento_id = e1; exception when others then f := f || '3: non si toglie un pezzo rientrato: ' || sqlerrm || '; '; end;
  reset role;

  /* 4. Operatore disattivato con un evento confermato: l'evento torna libero e va alla riserva */
  insert into eventi (project_id, indirizzo, citta, regione, lat, lng, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'x', 'Campobasso', 'Molise', 43.78, 11.26, now() + interval '9 days', now() + interval '9 days 1 hour', now() + interval '9 days 4 hours', now() + interval '9 days 5 hours', 'bozza')
    returning id into e3;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  perform proponi_operatore(e3, o2);
  select id into pr from proposte where evento_id = e3 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  perform rispondi_proposta(pr, true);
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update profili set attivo = false where id = o2;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select coalesce(operatore_id::text, 'nessuno') into s from eventi where id = e3; if s = o2::text then f := f || '4: evento ancora a un operatore disattivato; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Evento da riassegnare'; if n <> 1 then f := f || '4: project non avvisato; '; end if;
  t := t + 1; select count(*) into n from proposte where evento_id = e3 and stato = 'in_attesa' and operatore_id in (o1, o4); if n <> 1 then f := f || '4: nessuna riserva proposta (' || n || '); '; end if;

  /* 5. Carta: conteggio negativo = 0, ricarica a chi non è operatore rifiutata */
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  perform segnala_carta(-50);
  t := t + 1; select carta_disponibile into n from profili where id = o1; if n <> 0 then f := f || '5: carta negativa (' || n || '); '; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  t := t + 1; begin perform invia_ricarica_carta(pa, 700); f := f || '5: ricarica mandata a un project; '; exception when others then null; end;
  t := t + 1; begin perform invia_ricarica_carta(o1, 0); f := f || '5: ricarica di 0 stampe; '; exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);

  /* 6. Montaggio: lo spunta solo chi lavora all'evento */
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin insert into montaggio (evento_id, voci_fatte) values (e2, array['luci']); f := f || '6: montaggio spuntato da chi non lavora all''evento; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
