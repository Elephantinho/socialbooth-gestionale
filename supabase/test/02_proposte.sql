-- Proposte e assegnazioni, scenario per scenario: niente assegnazione automatica, rifiuti, cambio
-- operatore, scadenze (24 ore), sovrapposizioni e ferie, annullamento, operatore disattivato.
-- Tutto viene annullato alla fine.
do $$
declare
  ad uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); go uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); o3 uuid := gen_random_uuid();
  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid; e6 uuid; e7 uuid; pr uuid;
  n int; s text; t int := 0; f text := '';
begin
  /* ---------- dati di prova ---------- */
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[ad, pa, go, o1, o2, o3]) u;
  update profili set ruolo = 'admin', attivo = true, nome = 'Ad' where id = ad;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1' where id = o1;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O2' where id = o2;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O3' where id = o3;
  insert into zone_operatore (operatore_id, regione) values (o1, 'Toscana'), (o2, 'Toscana'), (o3, 'Liguria');

  /* ===== 0. La proposta scade dopo 24 ore ===== */
  t := t + 1; if ore_scadenza() <> interval '24 hours' then f := f || '0: scadenza ' || ore_scadenza() || '; '; end if;

  /* ===== 1. Nuovo evento in Toscana: resta da assegnare, nessuna proposta automatica ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into eventi (project_id, nome, indirizzo, citta, regione, lat, lng, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Prova', 'Via 1', 'Firenze', 'Toscana', 43.78, 11.26, now() + interval '2 days', now() + interval '2 days 1 hour', now() + interval '2 days 5 hours', now() + interval '2 days 6 hours', 'da_assegnare')
    returning id into e1;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato into s from eventi where id = e1; if s <> 'da_assegnare' then f := f || '1: con due liberi lo assegna da solo (' || s || '); '; end if;

  /* ===== 2. Il project propone O1; O1 rifiuta → l'evento torna da assegnare, nessuna riserva automatica ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform proponi_operatore(e1, o1);
  reset role;
  t := t + 1; select count(*) into n from notifiche where utente_id = o1 and titolo = 'Nuovo incarico da accettare'; if n <> 1 then f := f || '2: O1 non avvisato della proposta; '; end if;
  select id into pr from proposte where evento_id = e1 and operatore_id = o1 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform rispondi_proposta(pr, false);
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select operatore_id::text into s from eventi where id = e1; if s is not null then f := f || '2: dopo il rifiuto qualcuno viene proposto da solo; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Incarico rifiutato'; if n <> 1 then f := f || '2: project non avvisato del rifiuto; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Proposto un operatore di riserva'; if n <> 0 then f := f || '2: riserva automatica ancora attiva; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = o1 and titolo = 'Non sei più assegnato'; if n <> 0 then f := f || '2: O1 avvisato di essere tolto dopo aver rifiutato lui; '; end if;
  t := t + 1; begin
    perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
    perform rispondi_proposta(pr, true); f := f || '2: O1 accetta dopo aver rifiutato; ';
  exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);

  /* ===== 3. Il project propone O2, anche O2 rifiuta → evento da assegnare ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform proponi_operatore(e1, o2);
  reset role;
  select id into pr from proposte where evento_id = e1 and operatore_id = o2 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform rispondi_proposta(pr, false);
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato || coalesce(operatore_id::text, '') into s from eventi where id = e1; if s <> 'da_assegnare' then f := f || '3: stato dopo due rifiuti: ' || s || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Incarico rifiutato'; if n <> 2 then f := f || '3: project non avvisato del secondo rifiuto; '; end if;

  /* ===== 4. Un solo operatore libero → NON proposto da solo; il project lo propone, accetta, poi lo toglie ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Prova', 'Via 2', 'Genova', 'Liguria', now() + interval '3 days', now() + interval '3 days 1 hour', now() + interval '3 days 5 hours', now() + interval '3 days 6 hours', 'da_assegnare')
    returning id into e2;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato || ':' || coalesce(operatore_id::text, '') into s from eventi where id = e2; if s <> 'da_assegnare:' then f := f || '4: unico libero proposto da solo (' || s || '); '; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform proponi_operatore(e2, o3);
  reset role; perform set_config('request.jwt.claims', '', true);
  select id into pr from proposte where evento_id = e2 and operatore_id = o3 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o3, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform rispondi_proposta(pr, true);
  reset role;
  t := t + 1; select stato into s from eventi where id = e2; if s <> 'confermato' then f := f || '4: dopo accettazione stato ' || s || '; '; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update eventi set stato = 'da_assegnare', operatore_id = null where id = e2;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select coalesce(operatore_id::text, 'nessuno') into s from eventi where id = e2; if s = o3::text then f := f || '4: l''operatore tolto viene riproposto subito; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = o3 and titolo = 'Non sei più assegnato'; if n <> 1 then f := f || '4: operatore tolto non avvisato; '; end if;
  t := t + 1; select stato::text into s from proposte where id = pr; if s <> 'revocata' then f := f || '4: proposta dell''operatore tolto resta ' || s || '; '; end if;

  /* ===== 5. Cambio operatore con una nuova proposta: il vecchio non può più rispondere ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Prova', 'Via 3', 'Firenze', 'Toscana', now() + interval '5 days', now() + interval '5 days 1 hour', now() + interval '5 days 5 hours', now() + interval '5 days 6 hours', 'da_assegnare')
    returning id into e3;
  perform proponi_operatore(e3, o1);
  select id into pr from proposte where evento_id = e3 and operatore_id = o1 and stato = 'in_attesa';
  perform proponi_operatore(e3, o2);
  reset role;
  t := t + 1; select count(*) into n from proposte where evento_id = e3 and stato = 'in_attesa'; if n <> 1 then f := f || '5: ' || n || ' proposte aperte insieme; '; end if;
  t := t + 1; begin
    perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
    perform rispondi_proposta(pr, true); f := f || '5: il vecchio operatore accetta una proposta revocata; ';
  exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);
  t := t + 1; select operatore_id::text into s from eventi where id = e3; if s <> o2::text then f := f || '5: operatore sbagliato dopo il cambio; '; end if;

  /* ===== 6. Proposta scaduta: niente risposta fuori tempo; il controllo la chiude e l'evento torna da assegnare ===== */
  select id into pr from proposte where evento_id = e3 and operatore_id = o2 and stato = 'in_attesa';
  update proposte set scade_il = now() - interval '1 minute' where id = pr;
  t := t + 1; begin
    perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
    perform rispondi_proposta(pr, true); f := f || '6: accetta una proposta scaduta; ';
  exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);
  perform controlla_scadenze();
  t := t + 1; select stato::text into s from proposte where id = pr; if s <> 'scaduta' then f := f || '6: proposta non scaduta (' || s || '); '; end if;
  -- O1 era stato tolto (revocata) e O2 è scaduto: nessuno libero
  t := t + 1; select stato || coalesce(operatore_id::text, '') into s from eventi where id = e3; if s <> 'da_assegnare' then f := f || '6: dopo la scadenza ' || s || '; '; end if;

  /* ===== 7. Sovrapposizioni e ferie ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Prova', 'Via 4', 'Firenze', 'Toscana', date_trunc('day', now()) + interval '8 days 10 hours', date_trunc('day', now()) + interval '8 days 11 hours',
            date_trunc('day', now()) + interval '8 days 15 hours', date_trunc('day', now()) + interval '8 days 16 hours', 'bozza')
    returning id into e4;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Prova', 'Via 5', 'Firenze', 'Toscana', date_trunc('day', now()) + interval '8 days 12 hours', date_trunc('day', now()) + interval '8 days 13 hours',
            date_trunc('day', now()) + interval '8 days 17 hours', date_trunc('day', now()) + interval '8 days 18 hours', 'bozza')
    returning id into e5;
  perform proponi_operatore(e4, o1);
  reset role;
  t := t + 1; select count(*) into n from _operatori_disponibili(e5) where id = o1; if n <> 0 then f := f || '7: O1 libero per un evento che si sovrappone; '; end if;
  t := t + 1; select count(*) into n from _operatori_disponibili(e5) where id = o2; if n <> 1 then f := f || '7: O2 non risulta libero; '; end if;
  insert into indisponibilita (operatore_id, dal, al) values (o2, (now() + interval '8 days')::date, (now() + interval '8 days')::date);
  t := t + 1; select count(*) into n from _operatori_disponibili(e5) where id = o2; if n <> 0 then f := f || '7: O2 in ferie risulta libero; '; end if;
  -- evento che inizia la sera prima e finisce nel giorno di ferie
  update eventi set allestimento_il = date_trunc('day', now()) + interval '7 days 20 hours', inizio_attivazione = date_trunc('day', now()) + interval '7 days 21 hours',
                    fine_attivazione = date_trunc('day', now()) + interval '8 days 1 hour', smontaggio_il = date_trunc('day', now()) + interval '8 days 2 hours' where id = e5;
  t := t + 1; select count(*) into n from _operatori_disponibili(e5) where id = o2; if n <> 0 then f := f || '7: ferie il secondo giorno dell''evento ignorate; '; end if;

  /* ===== 8. Annullamento: l'operatore viene avvisato, le proposte aperte chiuse, l'evento non lo occupa più ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update eventi set stato = 'annullato' where id = e4;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select count(*) into n from notifiche where utente_id = o1 and titolo = 'Evento annullato'; if n <> 1 then f := f || '8: operatore non avvisato dell''annullamento; '; end if;
  t := t + 1; select count(*) into n from proposte where evento_id = e4 and stato = 'in_attesa'; if n <> 0 then f := f || '8: proposte ancora aperte su evento annullato; '; end if;
  update eventi set allestimento_il = date_trunc('day', now()) + interval '8 days 12 hours', inizio_attivazione = date_trunc('day', now()) + interval '8 days 13 hours',
                    fine_attivazione = date_trunc('day', now()) + interval '8 days 17 hours', smontaggio_il = date_trunc('day', now()) + interval '8 days 18 hours' where id = e5;
  t := t + 1; select count(*) into n from _operatori_disponibili(e5) where id = o1; if n <> 1 then f := f || '8: evento annullato occupa ancora O1; '; end if;

  /* ===== 9. Evento già passato: resta da assegnare ===== */
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Prova', 'Via 6', 'Genova', 'Liguria', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', now() - interval '2 days' + interval '5 hours', now() - interval '2 days' + interval '6 hours', 'da_assegnare')
    returning id into e6;
  t := t + 1; select stato::text into s from eventi where id = e6; if s <> 'da_assegnare' then f := f || '9: evento passato assegnato da solo; '; end if;

  /* ===== 10. Operatore disattivato con un evento confermato: l'evento torna da assegnare, nessuna riserva ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Prova', 'Via 7', 'Firenze', 'Toscana', now() + interval '9 days', now() + interval '9 days 1 hour', now() + interval '9 days 4 hours', now() + interval '9 days 5 hours', 'da_assegnare')
    returning id into e7;
  perform proponi_operatore(e7, o2);
  reset role;
  select id into pr from proposte where evento_id = e7 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform rispondi_proposta(pr, true);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update profili set attivo = false where id = o2;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato || ':' || coalesce(operatore_id::text, '') into s from eventi where id = e7; if s <> 'da_assegnare:' then f := f || '10: evento ancora a un operatore disattivato (' || s || '); '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Evento da riassegnare'; if n <> 1 then f := f || '10: project non avvisato; '; end if;
  t := t + 1; select count(*) into n from proposte where evento_id = e7 and stato = 'in_attesa'; if n <> 0 then f := f || '10: riserva proposta da sola; '; end if;

  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
