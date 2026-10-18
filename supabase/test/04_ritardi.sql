-- Tanti eventi al giorno: i passaggi intermedi non avvisano; i ritardi avvisano ufficio e operatore
-- una volta sola; chiusura a mano. Tutto annullato alla fine.
do $$
declare
  ad uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); go uuid := gen_random_uuid(); am uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); o3 uuid := gen_random_uuid();
  e1 uuid; e2 uuid; e3 uuid; e4 uuid; n int; s text; t int := 0; f text := '';
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[ad, pa, go, am, o1, o2, o3]) u;
  update profili set ruolo = 'admin', attivo = true, nome = 'Ad' where id = ad;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'amministrazione', attivo = true, nome = 'Am' where id = am;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1' where id = o1;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O2' where id = o2;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O3' where id = o3;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E1', 'x', 'Firenze', 'Toscana', 'confermato', o1, now() - interval '10 minutes', now() + interval '1 hour', now() + interval '4 hours', now() + interval '5 hours') returning id into e1;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E2', 'x', 'Firenze', 'Toscana', 'confermato', o2, now() - interval '2 hours', now() - interval '5 minutes', now() + interval '3 hours', now() + interval '4 hours') returning id into e2;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E3', 'x', 'Firenze', 'Toscana', 'confermato', o3, now() - interval '12 hours', now() - interval '11 hours', now() - interval '6 hours', now() - interval '5 hours') returning id into e3;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E4', 'x', 'Firenze', 'Toscana', 'confermato', o1, now() - interval '3 hours', now() - interval '1 hour', now() + interval '2 hours', now() + interval '3 hours') returning id into e4;

  /* 1. Passaggio normale: nessun avviso */
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform segna_passaggio(e2, 'check_in');
  reset role;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo like 'O2 %'; if n <> 0 then f := f || '1: project avvisato di un passaggio intermedio; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id in (ad, go) and titolo like 'O2 %'; if n <> 0 then f := f || '1: admin/gestore ricevono i passaggi normali (' || n || '); '; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', o3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform segna_passaggio(e3, 'check_in'); perform segna_passaggio(e3, 'attrezzatura'); perform segna_passaggio(e3, 'montato'); perform segna_passaggio(e3, 'smontato');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform segna_passaggio(e4, 'check_in'); perform segna_passaggio(e4, 'attrezzatura'); perform segna_passaggio(e4, 'montato');
  reset role; perform set_config('request.jwt.claims', '', true);

  /* 2. Ritardi: project, admin, gestore e operatore; l'amministrazione no; niente su chi è in regola */
  perform controlla_scadenze();
  t := t + 1; select count(*) into n from notifiche where titolo = 'Check-in mancante' and utente_id in (pa, ad, go, o1); if n <> 4 then f := f || '2: check-in mancante avvisati ' || n || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where titolo = 'Non ancora montato' and utente_id in (pa, ad, go, o2); if n <> 4 then f := f || '2: non montato avvisati ' || n || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where titolo = 'Check-out mancante' and utente_id in (pa, ad, go, o3); if n <> 4 then f := f || '2: check-out mancante avvisati ' || n || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = am; if n <> 0 then f := f || '2: amministrazione avvisata; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo in ('Check-in mancante', 'Non ancora montato', 'Check-out mancante') and testo like 'E4%'; if n <> 0 then f := f || '2: avviso su evento in regola; '; end if;

  /* 3. Una volta sola */
  perform controlla_scadenze();
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo in ('Check-in mancante', 'Non ancora montato', 'Check-out mancante'); if n <> 3 then f := f || '3: avvisi ripetuti (' || n || '); '; end if;

  /* 4. Chiusura a mano: project sì, operatore e amministrazione no, evento futuro no */
  perform set_config('request.jwt.claims', json_build_object('sub', o3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform concludi_evento(e3); f := f || '4: l''operatore chiude a mano; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', am, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform concludi_evento(e3); f := f || '4: l''amministrazione chiude; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform concludi_evento(e3);
  reset role;
  t := t + 1; select stato::text into s from eventi where id = e3; if s <> 'completato' then f := f || '4: non completato; '; end if;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'Futuro', 'x', 'Firenze', 'Toscana', 'confermato', o2, now() + interval '2 days', now() + interval '2 days 1 hour', now() + interval '2 days 4 hours', now() + interval '2 days 5 hours') returning id into e1;
  set local role authenticated;
  t := t + 1; begin perform concludi_evento(e1); f := f || '4: chiuso un evento futuro; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
