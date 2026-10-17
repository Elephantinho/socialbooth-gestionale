-- Test degli automatismi, scenario per scenario: assegnazioni, rifiuti, riserve, scadenze, tappe,
-- chiusure, carta, magazzino, richieste, chat. Tutto viene annullato alla fine.
do $$
declare
  ad uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); go uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); o3 uuid := gen_random_uuid();
  mf uuid; mp uuid; booth uuid; carta uuid;
  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid; e6 uuid; e7 uuid; rq uuid; pr uuid;
  n int; x numeric; s text; t int := 0; f text := '';
  dm text;
begin
  /* ---------- dati di prova ---------- */
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[ad, pa, go, o1, o2, o3]) u;
  insert into magazzini (nome, indirizzo, citta, regione, lat, lng) values ('Firenze', 'x', 'Firenze', 'Toscana', 43.77, 11.25) returning id into mf;
  insert into magazzini (nome, indirizzo, citta, regione, lat, lng) values ('Pisa', 'x', 'Pisa', 'Toscana', 43.71, 10.40) returning id into mp;
  update profili set ruolo = 'admin', attivo = true, nome = 'Ad' where id = ad;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1', tariffa_oraria = 20, magazzino_id = mf where id = o1;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O2', tariffa_oraria = 20, magazzino_id = mp where id = o2;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O3', tariffa_oraria = 20, magazzino_id = mf where id = o3;
  insert into zone_operatore (operatore_id, regione) values (o1, 'Toscana'), (o2, 'Toscana');
  insert into zone_operatore (operatore_id, regione) values (o3, 'Liguria');
  insert into articoli (magazzino_id, nome, categoria, quantita) values (mf, 'Booth', 'Booth', 2) returning id into booth;
  insert into articoli (magazzino_id, nome, categoria, quantita) values (mf, 'Rotolo carta', 'Consumabili', 10) returning id into carta;
  update impostazioni set valore = 200 where chiave = 'soglia_carta';
  update impostazioni set valore = 1 where chiave = 'riserva_automatica';
  update impostazioni set valore = 24 where chiave = 'ore_scadenza_proposta';
  perform set_config('app.carta', 'si', true);
  update profili set carta_disponibile = 500, carta_aggiornata_il = now() where id in (o1, o2);
  perform set_config('app.carta', 'no', true);

  /* ===== 1. Nuovo evento in Toscana: due operatori liberi, nessuno ha rifiutato → nessuna scelta automatica ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into eventi (project_id, indirizzo, citta, regione, lat, lng, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, prezzo_cliente, viaggio_minuti)
    values (pa, 'Via 1', 'Firenze', 'Toscana', 43.78, 11.26, now() + interval '2 days', now() + interval '2 days 1 hour', now() + interval '2 days 5 hours', now() + interval '2 days 6 hours', 'da_assegnare', 1500, 30)
    returning id into e1;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato into s from eventi where id = e1; if s <> 'da_assegnare' then f := f || '1: con due liberi lo assegna da solo (' || s || '); '; end if;

  /* ===== 2. Il project propone O1; O1 rifiuta → il sistema propone la riserva più vicina (O2, unico rimasto) ===== */
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
  t := t + 1; select operatore_id::text into s from eventi where id = e1; if s is distinct from o2::text then f := f || '2: dopo il rifiuto non propone O2; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Incarico rifiutato'; if n <> 1 then f := f || '2: project non avvisato del rifiuto; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Proposto un operatore di riserva'; if n <> 1 then f := f || '2: project non avvisato della riserva; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = o1 and titolo = 'Non sei più assegnato'; if n <> 0 then f := f || '2: O1 avvisato di essere tolto dopo aver rifiutato lui; '; end if;
  t := t + 1; begin
    perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
    perform rispondi_proposta(pr, true); f := f || '2: O1 accetta dopo aver rifiutato; ';
  exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);

  /* ===== 3. Anche O2 rifiuta → nessuno libero: avviso al project, evento da assegnare ===== */
  select id into pr from proposte where evento_id = e1 and operatore_id = o2 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform rispondi_proposta(pr, false);
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato || coalesce(operatore_id::text, '') into s from eventi where id = e1; if s <> 'da_assegnare' then f := f || '3: stato dopo due rifiuti: ' || s || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Nessun operatore libero'; if n <> 1 then f := f || '3: niente avviso "nessun operatore libero"; '; end if;

  /* ===== 4. Evento con un solo operatore libero → proposto da solo; accetta; il project lo toglie → non viene riproposto ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, prezzo_cliente)
    values (pa, 'Via 2', 'Genova', 'Liguria', now() + interval '3 days', now() + interval '3 days 1 hour', now() + interval '3 days 5 hours', now() + interval '3 days 6 hours', 'da_assegnare', 900)
    returning id into e2;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato || ':' || coalesce(operatore_id::text, '') into s from eventi where id = e2; if s <> 'proposto:' || o3 then f := f || '4: unico libero non proposto (' || s || '); '; end if;
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
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Via 3', 'Firenze', 'Toscana', now() + interval '5 days', now() + interval '5 days 1 hour', now() + interval '5 days 5 hours', now() + interval '5 days 6 hours', 'da_assegnare')
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

  /* ===== 6. Proposta scaduta: niente risposta fuori tempo; il controllo la chiude e passa alla riserva ===== */
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
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Via 4', 'Firenze', 'Toscana', date_trunc('day', now()) + interval '8 days 10 hours', date_trunc('day', now()) + interval '8 days 11 hours',
            date_trunc('day', now()) + interval '8 days 15 hours', date_trunc('day', now()) + interval '8 days 16 hours', 'bozza')
    returning id into e4;
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Via 5', 'Firenze', 'Toscana', date_trunc('day', now()) + interval '8 days 12 hours', date_trunc('day', now()) + interval '8 days 13 hours',
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

  /* ===== 9. Evento già passato: niente assegnazione automatica; proposte vecchie scadono ===== */
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Via 6', 'Genova', 'Liguria', now() - interval '2 days', now() - interval '2 days' + interval '1 hour', now() - interval '2 days' + interval '5 hours', now() - interval '2 days' + interval '6 hours', 'da_assegnare')
    returning id into e6;
  t := t + 1; select stato::text into s from eventi where id = e6; if s <> 'da_assegnare' then f := f || '9: evento passato assegnato da solo; '; end if;

  /* ===== 10. Giornata di lavoro completa di O2 su e5 ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update eventi set viaggio_minuti = 45, magazzino_id = mf where id = e5;
  insert into attrezzatura_evento (evento_id, articolo_id, quantita) values (e5, booth, 1), (e5, carta, 2);
  reset role;
  update indisponibilita set dal = '2000-01-01', al = '2000-01-01' where operatore_id = o2;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform proponi_operatore(e5, o2);
  reset role;
  select id into pr from proposte where evento_id = e5 and operatore_id = o2 and stato = 'in_attesa';
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform rispondi_proposta(pr, true);
  -- partenza troppo presto (evento fra 8 giorni)
  t := t + 1; begin perform registra_tappa(e5, 'partenza'); f := f || '10: parte 8 giorni prima; '; exception when others then null; end;
  reset role; perform set_config('request.jwt.claims', '', true);
  -- il tempo passa: l'evento è iniziato 6 ore fa
  update eventi set allestimento_il = now() - interval '6 hours', inizio_attivazione = now() - interval '5 hours', fine_attivazione = now() - interval '2 hours', smontaggio_il = now() - interval '1 hour' where id = e5;
  t := t + 1; select count(*) into n from notifiche where utente_id = o2 and titolo = 'Evento modificato'; if n < 1 then f := f || '10: operatore non avvisato del cambio orari; '; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform registra_tappa(e5, 'partenza');
  reset role;
  t := t + 1; select in_uso into n from articoli where id = booth; if n <> 1 then f := f || '10: booth non risulta fuori dal magazzino (' || n || '); '; end if;
  t := t + 1; select quantita into n from articoli where id = carta; if n <> 8 then f := f || '10: rotoli non scalati (' || n || '); '; end if;
  -- orari realistici delle tappe
  update ore_lavorate set partenza_il = now() - interval '7 hours', check_in_il = now() - interval '6 hours', fine_il = now() - interval '1 hour' where evento_id = e5;
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform registra_tappa(e5, 'rientro');
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select stato::text into s from eventi where id = e5; if s <> 'completato' then f := f || '10: evento non completato al rientro (' || s || '); '; end if;
  t := t + 1; select minuti_in_location || '/' || minuti_viaggio || '/' || compenso into s from ore_lavorate where evento_id = e5;
    if s <> '300/120/140.00' then f := f || '10: ore calcolate male (location/viaggio/compenso = ' || s || ', attesi 300/120/140.00); '; end if;
  t := t + 1; select in_uso into n from articoli where id = booth; if n <> 0 then f := f || '10: booth non rientrato (' || n || '); '; end if;
  t := t + 1; select quantita into n from articoli where id = carta; if n <> 8 then f := f || '10: rotoli tornati in magazzino dopo l''uso (' || n || '); '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo = 'Ore da approvare'; if n <> 1 then f := f || '10: project non avvisato delle ore (' || n || '); '; end if;
  -- l'operatore dichiara 350 stampe: la carta scende sotto soglia e avvisa una volta sola
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into costi_evento (evento_id, operatore_id, fase, categoria, quantita, costo_unitario, descrizione, pagato_con) values (e5, o2, 'finale', 'carta_stampe', 350, 0, 'Stampe', 'azienda');
  insert into costi_evento (evento_id, operatore_id, fase, categoria, quantita, costo_unitario, descrizione, pagato_con) values (e5, o2, 'finale', 'parcheggio', 1, 12.5, 'Parcheggio', 'operatore');
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select carta_disponibile into n from profili where id = o2; if n <> 150 then f := f || '10: carta dopo 350 stampe = ' || n || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = go and titolo = 'Carta in esaurimento'; if n <> 1 then f := f || '10: gestore avvisato ' || n || ' volte della carta; '; end if;
  -- l'ufficio respinge le stampe: la carta torna
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update costi_evento set stato = 'respinto' where evento_id = e5 and categoria = 'carta_stampe' and fase = 'finale';
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select carta_disponibile into n from profili where id = o2; if n <> 500 then f := f || '10: carta non restituita dopo il rifiuto (' || n || '); '; end if;
  -- approvazione
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update ore_lavorate set stato = 'approvato', approvato_da = pa, approvato_il = now() where evento_id = e5;
  update costi_evento set stato = 'approvato' where evento_id = e5 and fase = 'finale' and stato = 'inviato';
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select count(*) into n from notifiche where utente_id = o2 and titolo = 'Ore approvate'; if n <> 1 then f := f || '10: operatore non avvisato dell''approvazione; '; end if;
  t := t + 1; select stato::text into s from costi_evento where evento_id = e5 and categoria = 'parcheggio'; if s <> 'approvato' then f := f || '10: spesa non approvata; '; end if;
  t := t + 1; begin
    perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
    perform registra_tappa(e5, 'partenza'); f := f || '10: tappe dopo la chiusura; ';
  exception when others then null; end;
  perform set_config('request.jwt.claims', '', true);

  /* ===== 11. Chiusura a mano con valori assurdi ===== */
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, operatore_id)
    values (pa, 'Via 7', 'Firenze', 'Toscana', now() - interval '5 hours', now() - interval '4 hours', now() - interval '2 hours', now() - interval '1 hour', 'confermato', o1)
    returning id into e7;
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  t := t + 1; begin perform chiudi_evento(e7, -60, 0, null); f := f || '11: chiusura con minuti negativi; '; exception when others then null; end;
  t := t + 1; begin perform chiudi_evento(e7, 300, 5000, null); f := f || '11: chiusura con 83 ore di viaggio; '; exception when others then null; end;
  t := t + 1; begin perform chiudi_evento(e7, 240, 60, 'traffico'); exception when others then f := f || '11: chiusura valida rifiutata: ' || sqlerrm || '; '; end;
  perform set_config('request.jwt.claims', '', true);
  t := t + 1; select compenso into x from ore_lavorate where evento_id = e7; if x is distinct from 100.00 then f := f || '11: compenso ' || coalesce(x::text, 'nullo') || ' invece di 100; '; end if;

  /* ===== 13. Richieste: carta per O1 chiesta dal project, fatta dal gestore, una volta sola ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into richieste (tipo, titolo, da_id, per_ruolo, operatore_id, quantita, stato) values ('carta', 'Carta a O1', pa, 'gestore_operatori', o1, 700, 'fatta') returning id into rq;
  reset role;
  t := t + 1; select stato::text into s from richieste where id = rq; if s <> 'aperta' then f := f || '13: richiesta nata già ' || s || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = go and titolo like 'Nuova richiesta%'; if n <> 1 then f := f || '13: gestore non avvisato della richiesta; '; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update richieste set stato = 'in_corso', preso_da = go where id = rq;
  update richieste set stato = 'fatta' where id = rq;
  update richieste set stato = 'aperta' where id = rq;
  update richieste set stato = 'fatta' where id = rq;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select carta_disponibile into n from profili where id = o1; if n <> 1200 then f := f || '13: carta di O1 = ' || n || ' (attesi 1200: una sola ricarica); '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo like 'Fatto:%'; if n < 1 then f := f || '13: project non avvisato che è fatto; '; end if;
  t := t + 1; select chiuso_il is not null into s from richieste where id = rq; if s <> 'true' then f := f || '13: richiesta fatta senza data di chiusura; '; end if;

  /* ===== 14. Chat privata: notifica e non letti ===== */
  dm := 'dm:' || least(pa, go)::text || ':' || greatest(pa, go)::text;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into chat_messaggi (canale, autore_id, testo) values (dm, pa, 'mi mandi la carta a O1?');
  insert into chat_messaggi (canale, autore_id, testo) values ('squadra', pa, 'buongiorno');
  reset role;
  t := t + 1; select count(*) into n from notifiche where utente_id = go and titolo = 'Messaggio da Pa'; if n <> 1 then f := f || '14: notifica chat privata ' || n || '; '; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select coalesce(sum(non_letti), 0) into n from chat_non_letti() where canale = dm; if n <> 1 then f := f || '14: non letti ' || n || ' invece di 1; '; end if;
  insert into chat_letture (utente_id, canale, letto_il) values (go, dm, now() + interval '1 second');
  t := t + 1; select coalesce(sum(non_letti), 0) into n from chat_non_letti() where canale = dm; if n <> 0 then f := f || '14: dopo la lettura restano ' || n || ' non letti; '; end if;
  reset role; perform set_config('request.jwt.claims', '', true);
  t := t + 1; select count(*) into n from notifiche where titolo like 'Messaggio da%' and utente_id <> go; if n <> 0 then f := f || '14: chat della squadra manda notifiche a tutti; '; end if;

  /* ===== 15. Cancellazione: un evento annullato si può cancellare, uno completato no ===== */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin delete from eventi where id = e4; get diagnostics n = row_count; if n <> 1 then f := f || '15: evento annullato non cancellabile; '; end if; exception when others then f := f || '15: ' || sqlerrm || '; '; end;
  t := t + 1; begin delete from eventi where id = e5; f := f || '15: evento completato cancellato; '; exception when others then null; end;
  reset role;

  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
