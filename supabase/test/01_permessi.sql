-- Test dei permessi: chi vede cosa e chi può cambiare cosa, ruolo per ruolo.
-- Si lancia nel SQL editor: crea utenti finti, prova tutto e annulla ogni modifica alla fine
-- (l'ultima riga solleva un errore apposta con il risultato: niente resta nel database).
do $$
declare
  ad uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid();
  go uuid := gen_random_uuid(); am uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); ox uuid := gen_random_uuid();
  mg uuid; ar uuid; ea uuid; eb uuid; ec uuid; cl uuid; rq uuid; ca uuid; pr uuid;
  n int; t int := 0; f text := '';
begin
  /* ---------- dati di prova (come sistema) ---------- */
  insert into auth.users (id, email) select x, x || '@prova.local' from unnest(array[ad, pa, pb, go, am, o1, o2, ox]) x;
  update profili set ruolo = 'admin', attivo = true, nome = 'Ad' where id = ad;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'project', attivo = true, nome = 'Pb' where id = pb;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'amministrazione', attivo = true, nome = 'Am' where id = am;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1', tariffa_oraria = 15 where id = o1;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O2', tariffa_oraria = 15 where id = o2;
  update profili set ruolo = 'operatore', attivo = false, nome = 'Ox' where id = ox;
  insert into magazzini (nome, indirizzo, citta, regione) values ('Mag prova', 'Via A 1', 'Firenze', 'Toscana') returning id into mg;
  insert into articoli (magazzino_id, nome, categoria, quantita) values (mg, 'Booth prova', 'Booth', 2) returning id into ar;
  insert into clienti (nome, project_id) values ('Cliente prova', pa) returning id into cl;
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, operatore_id, prezzo_cliente, cliente_id)
    values (pa, 'Via B 2', 'Firenze', 'Toscana', now() + interval '3 days', now() + interval '3 days 1 hour', now() + interval '3 days 5 hours', now() + interval '3 days 6 hours', 'confermato', o1, 1000, cl)
    returning id into ea;
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, operatore_id, prezzo_cliente)
    values (pb, 'Via C 3', 'Roma', 'Lazio', now() + interval '4 days', now() + interval '4 days 1 hour', now() + interval '4 days 5 hours', now() + interval '4 days 6 hours', 'confermato', o2, 2000)
    returning id into eb;
  insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, prezzo_cliente)
    values (pa, 'Via D 4', 'Firenze', 'Toscana', now() + interval '10 days', now() + interval '10 days 1 hour', now() + interval '10 days 5 hours', now() + interval '10 days 6 hours', 'bozza', 500)
    returning id into ec;
  insert into proposte (evento_id, operatore_id, stato, scade_il) values (ea, o1, 'accettata', now() + interval '1 day') returning id into pr;
  insert into costi_evento (evento_id, fase, categoria, quantita, costo_unitario, pagato_con, stato) values (ea, 'previsto', 'noleggio_veicolo', 1, 100, 'azienda', 'approvato');
  insert into costi_evento (evento_id, fase, categoria, quantita, costo_unitario, pagato_con, stato) values (eb, 'previsto', 'noleggio_veicolo', 1, 100, 'azienda', 'approvato');
  insert into ore_lavorate (evento_id, operatore_id, check_out_il, minuti_in_location, tariffa_oraria) values (eb, o2, null, 0, 15);
  insert into carte_aziendali (nome, ultime_cifre, operatore_id) values ('Carta prova', '1234', o1) returning id into ca;
  insert into richieste (tipo, titolo, da_id, per_ruolo, operatore_id, quantita) values ('carta', 'Carta a O1', pa, 'gestore_operatori', o1, 700) returning id into rq;
  insert into chat_messaggi (canale, autore_id, testo) values ('dm:' || least(pa, go)::text || ':' || greatest(pa, go)::text, pa, 'segreto');
  insert into chat_messaggi (canale, autore_id, testo) values ('squadra', pa, 'ciao a tutti');
  perform notifica(o1, 'Prova', 'per o1', null);

  /* ---------- OPERATORE 1 ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 1 then f := f || 'o1 vede ' || n || ' eventi invece di 1; '; end if;
  t := t + 1; select count(*) into n from profili; if n <> 1 then f := f || 'o1 vede ' || n || ' profili; '; end if;
  t := t + 1; select count(*) into n from costi_evento where evento_id in (ea, eb); if n <> 0 then f := f || 'o1 vede i costi previsti; '; end if;
  t := t + 1; select count(*) into n from ore_lavorate where evento_id = eb; if n <> 0 then f := f || 'o1 vede le ore di o2; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali; if n <> 1 then f := f || 'o1 non vede solo la sua carta; '; end if;
  t := t + 1; select count(*) into n from clienti; if n <> 0 then f := f || 'o1 vede i clienti; '; end if;
  t := t + 1; select count(*) into n from richieste where id = rq; if n <> 1 then f := f || 'o1 non vede la richiesta che lo riguarda; '; end if;
  t := t + 1; select count(*) into n from chat_messaggi where canale like 'dm:%'; if n <> 0 then f := f || 'o1 legge i messaggi privati di altri; '; end if;
  t := t + 1; select count(*) into n from chat_messaggi where canale = 'squadra'; if n <> 1 then f := f || 'o1 non legge la chat squadra; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id <> o1; if n <> 0 then f := f || 'o1 vede notifiche di altri; '; end if;
  t := t + 1; select count(*) into n from impostazioni; if n = 0 then f := f || 'o1 non legge le impostazioni; '; end if;
  t := t + 1; update eventi set note = 'x' where id = ea; get diagnostics n = row_count; if n <> 0 then f := f || 'o1 modifica l''evento; '; end if;
  t := t + 1; update profili set nome = 'Hack' where id = o2; get diagnostics n = row_count; if n <> 0 then f := f || 'o1 modifica il profilo di o2; '; end if;
  t := t + 1; update profili set nome = 'Uno' where id = o1; get diagnostics n = row_count; if n <> 1 then f := f || 'o1 non cambia il suo nome; '; end if;
  t := t + 1; begin update profili set tariffa_oraria = 99 where id = o1; f := f || 'o1 si alza la tariffa; '; exception when others then null; end;
  t := t + 1; begin update profili set ruolo = 'admin' where id = o1; f := f || 'o1 si fa admin; '; exception when others then null; end;
  t := t + 1; begin update profili set carta_disponibile = 9999 where id = o1; f := f || 'o1 si cambia la carta a mano; '; exception when others then null; end;
  t := t + 1; begin update profili set attivo = false where id = o1; f := f || 'o1 si disattiva da solo; '; exception when others then null; end;
  t := t + 1; update ore_lavorate set stato = 'approvato' where evento_id = eb; get diagnostics n = row_count; if n <> 0 then f := f || 'o1 tocca ore altrui; '; end if;
  t := t + 1; begin insert into costi_evento (evento_id, operatore_id, fase, categoria, quantita, costo_unitario, pagato_con) values (eb, o1, 'finale', 'vitto', 1, 10, 'operatore'); f := f || 'o1 mette spese su un evento non suo; '; exception when others then null; end;
  t := t + 1; begin insert into costi_evento (evento_id, operatore_id, fase, categoria, quantita, costo_unitario, pagato_con, stato) values (ea, o1, 'finale', 'vitto', 1, 10, 'operatore', 'approvato'); f := f || 'o1 si approva una spesa; '; exception when others then null; end;
  t := t + 1; begin insert into costi_evento (evento_id, operatore_id, fase, categoria, quantita, costo_unitario, pagato_con) values (ea, o1, 'previsto', 'vitto', 1, 10, 'operatore'); f := f || 'o1 mette costi previsti; '; exception when others then null; end;
  t := t + 1; begin insert into costi_evento (evento_id, operatore_id, fase, categoria, quantita, costo_unitario, pagato_con) values (ea, o1, 'finale', 'vitto', 1, 10, 'operatore'); exception when others then f := f || 'o1 non riesce a mettere una spesa: ' || sqlerrm || '; '; end;
  t := t + 1; begin insert into costi_evento (evento_id, operatore_id, fase, categoria, quantita, costo_unitario, pagato_con) values (ea, o1, 'finale', 'vitto', -1, 10, 'operatore'); f := f || 'o1 mette una spesa negativa; '; exception when others then null; end;
  t := t + 1; begin insert into proposte (evento_id, operatore_id, scade_il) values (eb, o1, now() + interval '1 day'); f := f || 'o1 si crea una proposta; '; exception when others then null; end;
  t := t + 1; begin insert into notifiche (utente_id, titolo) values (o2, 'spam'); f := f || 'o1 manda notifiche; '; exception when others then null; end;
  t := t + 1; begin insert into chat_messaggi (canale, autore_id, testo) values ('squadra', o2, 'finto'); f := f || 'o1 scrive a nome di o2; '; exception when others then null; end;
  t := t + 1; begin insert into chat_messaggi (canale, autore_id, testo) values ('dm:' || least(pa, go)::text || ':' || greatest(pa, go)::text, o1, 'intruso'); f := f || 'o1 scrive in una chat privata altrui; '; exception when others then null; end;
  t := t + 1; begin insert into chat_messaggi (canale, autore_id, testo) values ('canale-strano-' || o1, o1, 'x'); f := f || 'o1 crea canali a caso; '; exception when others then null; end;
  t := t + 1; begin insert into zone_operatore (operatore_id, regione) values (o2, 'Sicilia'); f := f || 'o1 cambia le zone di o2; '; exception when others then null; end;
  t := t + 1; begin insert into indisponibilita (operatore_id, dal, al) values (o2, current_date, current_date); f := f || 'o1 segna indisponibile o2; '; exception when others then null; end;
  t := t + 1; begin insert into indisponibilita (operatore_id, dal, al) values (o1, current_date + 20, current_date + 21); exception when others then f := f || 'o1 non segna le sue ferie; '; end;
  t := t + 1; begin perform proponi_operatore(eb, o1); f := f || 'o1 si propone da solo; '; exception when others then null; end;
  t := t + 1; begin perform invia_ricarica_carta(o1, 5000); f := f || 'o1 si ricarica la carta; '; exception when others then null; end;
  t := t + 1; begin perform segnala_carta(10, o2); f := f || 'o1 cambia la carta di o2; '; exception when others then null; end;
  t := t + 1; begin perform registra_tappa(eb, 'partenza'); f := f || 'o1 registra tappe su un evento non suo; '; exception when others then null; end;
  t := t + 1; begin perform segna_attrezzatura(eb, 'prelievo'); f := f || 'o1 preleva attrezzatura di un evento non suo; '; exception when others then null; end;
  t := t + 1; begin update articoli set quantita = 0 where id = ar; get diagnostics n = row_count; if n <> 0 then f := f || 'o1 cambia il magazzino; '; end if; exception when others then null; end;
  t := t + 1; begin update richieste set stato = 'fatta' where id = rq; get diagnostics n = row_count; if n <> 0 then f := f || 'o1 chiude una richiesta non sua; '; end if; exception when others then null; end;
  reset role;

  /* ---------- OPERATORE NON ATTIVO ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', ox, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from chat_messaggi; if n <> 0 then f := f || 'operatore non attivo legge la chat; '; end if;
  t := t + 1; select count(*) into n from persone_squadra(); if n <> 0 then f := f || 'operatore non attivo vede la squadra; '; end if;
  t := t + 1; select count(*) into n from eventi; if n <> 0 then f := f || 'operatore non attivo vede eventi; '; end if;
  reset role;

  /* ---------- PROJECT A ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 2 then f := f || 'pa vede ' || n || ' eventi invece di 2; '; end if;
  t := t + 1; select count(*) into n from costi_evento where evento_id = eb; if n <> 0 then f := f || 'pa vede i costi di pb; '; end if;
  t := t + 1; select count(*) into n from costi_evento where evento_id = ea; if n = 0 then f := f || 'pa non vede i costi suoi; '; end if;
  t := t + 1; select count(*) into n from ore_lavorate where evento_id = eb; if n <> 0 then f := f || 'pa vede le ore di pb; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali; if n <> 0 then f := f || 'pa vede le carte aziendali; '; end if;
  t := t + 1; select count(*) into n from chat_messaggi where canale like 'dm:%'; if n <> 1 then f := f || 'pa non legge la sua chat privata; '; end if;
  t := t + 1; select count(*) into n from proposte where evento_id = ea; if n <> 1 then f := f || 'pa non vede le proposte dei suoi eventi; '; end if;
  t := t + 1; update eventi set note = 'x' where id = eb; get diagnostics n = row_count; if n <> 0 then f := f || 'pa modifica eventi di pb; '; end if;
  t := t + 1; update eventi set prezzo_cliente = 1200 where id = ea; get diagnostics n = row_count; if n <> 1 then f := f || 'pa non cambia il prezzo del suo evento; '; end if;
  t := t + 1; begin update eventi set project_id = pb where id = ea; f := f || 'pa regala l''evento a pb; '; exception when others then null; end;
  t := t + 1; begin update eventi set stato = 'completato' where id = ea; f := f || 'pa segna completato a mano; '; exception when others then null; end;
  t := t + 1; begin update eventi set stato = 'confermato', operatore_id = o2 where id = ec; f := f || 'pa conferma un operatore senza chiederglielo; '; exception when others then null; end;
  t := t + 1; begin update eventi set operatore_id = o2 where id = ea; f := f || 'pa cambia operatore senza proposta; '; exception when others then null; end;
  t := t + 1; begin insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, operatore_id)
    values (pa, 'x', 'Firenze', 'Toscana', now() + interval '5 days', now() + interval '5 days', now() + interval '5 days', now() + interval '5 days', 'confermato', o2);
    f := f || 'pa crea un evento già confermato; '; exception when others then null; end;
  t := t + 1; begin insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pb, 'x', 'Firenze', 'Toscana', now() + interval '5 days', now() + interval '5 days', now() + interval '5 days', now() + interval '5 days', 'bozza');
    f := f || 'pa crea eventi a nome di pb; '; exception when others then null; end;
  t := t + 1; begin insert into eventi (project_id, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'x', 'Firenze', 'Toscana', now() + interval '5 days 6 hours', now() + interval '5 days 7 hours', now() + interval '5 days 8 hours', now() + interval '5 days', 'bozza');
    f := f || 'pa crea un evento che finisce prima di iniziare; '; exception when others then null; end;
  t := t + 1; begin delete from eventi where id = ea; get diagnostics n = row_count; if n <> 0 then f := f || 'pa cancella un evento confermato; '; end if; exception when others then null; end;
  t := t + 1; begin update profili set tariffa_oraria = 1 where id = o1; get diagnostics n = row_count; if n <> 0 then f := f || 'pa cambia la tariffa; '; end if; exception when others then null; end;
  t := t + 1; begin update profili set attivo = true where id = ox; get diagnostics n = row_count; if n <> 0 then f := f || 'pa attiva operatori; '; end if; exception when others then null; end;
  t := t + 1; begin update articoli set quantita = 0 where id = ar; get diagnostics n = row_count; if n <> 0 then f := f || 'pa cambia l''inventario del magazzino; '; end if; exception when others then null; end;
  t := t + 1; begin update impostazioni set valore = 1 where chiave = 'soglia_carta'; get diagnostics n = row_count; if n <> 0 then f := f || 'pa cambia le impostazioni; '; end if; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(eb, o1); f := f || 'pa propone operatori su eventi di pb; '; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(ec, ox); f := f || 'pa propone un operatore non attivo; '; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(ec, go); f := f || 'pa propone il gestore come operatore; '; exception when others then null; end;
  t := t + 1; select count(*) into n from operatori_disponibili(eb); if n <> 0 then f := f || 'pa vede i disponibili per eventi di pb; '; end if;
  t := t + 1; update ore_lavorate set stato = 'approvato' where evento_id = eb; get diagnostics n = row_count; if n <> 0 then f := f || 'pa approva ore di pb; '; end if;
  t := t + 1; begin insert into richieste (tipo, titolo, da_id, per_ruolo) values ('altro', 'finta', pb, 'gestore_operatori'); f := f || 'pa scrive richieste a nome di pb; '; exception when others then null; end;
  t := t + 1; begin update richieste set stato = 'fatta' where id = rq; get diagnostics n = row_count; if n <> 0 then f := f || 'pa si chiude da solo la richiesta fatta al gestore; '; end if; exception when others then null; end;
  t := t + 1; begin update richieste set quantita = 99999 where id = rq; f := f || 'pa cambia la quantità di una richiesta inviata; '; exception when others then null; end;
  reset role;

  /* ---------- PROJECT B ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', pb, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from richieste where id = rq; if n <> 0 then f := f || 'pb vede le richieste di pa; '; end if;
  t := t + 1; select count(*) into n from clienti where id = cl; if n <> 1 then f := f || 'pb non vede i clienti comuni; '; end if;
  t := t + 1; select count(*) into n from chat_messaggi where canale like 'dm:%'; if n <> 0 then f := f || 'pb legge la chat privata pa-go; '; end if;
  reset role;

  /* ---------- GESTORE OPERATORI ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 3 then f := f || 'go vede ' || n || ' eventi invece di 3; '; end if;
  t := t + 1; select count(*) into n from costi_evento where evento_id in (ea, eb); if n <> 0 then f := f || 'go vede i costi; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali; if n <> 0 then f := f || 'go vede le carte; '; end if;
  t := t + 1; select count(*) into n from richieste where id = rq; if n <> 1 then f := f || 'go non vede la richiesta per lui; '; end if;
  t := t + 1; begin update eventi set note = 'portare prolunga' where id = ea; get diagnostics n = row_count; if n <> 1 then f := f || 'go non modifica le note; '; end if; exception when others then f := f || 'go non modifica le note: ' || sqlerrm || '; '; end;
  t := t + 1; begin update eventi set prezzo_cliente = 1 where id = ea; f := f || 'go cambia il prezzo; '; exception when others then null; end;
  t := t + 1; begin update eventi set fattura_pagata = true where id = ea; f := f || 'go segna pagata una fattura; '; exception when others then null; end;
  t := t + 1; begin update eventi set project_id = pb where id = ea; f := f || 'go sposta l''evento a un altro project; '; exception when others then null; end;
  t := t + 1; begin update eventi set stato = 'annullato' where id = ea; f := f || 'go annulla un evento; '; exception when others then null; end;
  t := t + 1; update profili set attivo = true where id = ox; get diagnostics n = row_count; if n <> 1 then f := f || 'go non attiva un operatore; '; end if;
  t := t + 1; begin update profili set tariffa_oraria = 50 where id = o1; f := f || 'go cambia la tariffa; '; exception when others then null; end;
  t := t + 1; begin update profili set ruolo = 'admin' where id = go; f := f || 'go si fa admin; '; exception when others then null; end;
  t := t + 1; update articoli set quantita = 3 where id = ar; get diagnostics n = row_count; if n <> 1 then f := f || 'go non aggiorna l''inventario; '; end if;
  t := t + 1; begin insert into costi_evento (evento_id, fase, categoria, quantita, costo_unitario, pagato_con) values (ea, 'previsto', 'vitto', 1, 10, 'azienda'); f := f || 'go mette costi; '; exception when others then null; end;
  t := t + 1; update ore_lavorate set stato = 'approvato' where evento_id = eb; get diagnostics n = row_count; if n <> 0 then f := f || 'go approva ore; '; end if;
  t := t + 1; begin perform proponi_operatore(eb, o1); exception when others then f := f || 'go non riesce a proporre: ' || sqlerrm || '; '; end;
  t := t + 1; begin update richieste set stato = 'fatta' where id = rq; get diagnostics n = row_count; if n <> 1 then f := f || 'go non chiude la richiesta per lui; '; end if; exception when others then f := f || 'go non chiude la richiesta: ' || sqlerrm || '; '; end;
  t := t + 1; begin perform invia_ricarica_carta(o2, 700); exception when others then f := f || 'go non manda la ricarica: ' || sqlerrm || '; '; end;
  t := t + 1; begin update impostazioni set valore = 1 where chiave = 'soglia_carta'; get diagnostics n = row_count; if n <> 0 then f := f || 'go cambia le impostazioni; '; end if; exception when others then null; end;
  reset role;

  /* ---------- AMMINISTRAZIONE ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', am, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 3 then f := f || 'am vede ' || n || ' eventi; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali; if n <> 1 then f := f || 'am non vede le carte; '; end if;
  t := t + 1; select count(*) into n from costi_evento where evento_id in (ea, eb); if n < 2 then f := f || 'am non vede i costi; '; end if;
  t := t + 1; begin update eventi set fattura_numero = '1/2026', fattura_importo = 1000 where id = ea; get diagnostics n = row_count; if n <> 1 then f := f || 'am non fattura; '; end if; exception when others then f := f || 'am non fattura: ' || sqlerrm || '; '; end;
  t := t + 1; begin update eventi set note = 'x' where id = ea; f := f || 'am cambia le note dell''evento; '; exception when others then null; end;
  t := t + 1; begin update eventi set stato = 'annullato' where id = ea; f := f || 'am annulla un evento; '; exception when others then null; end;
  t := t + 1; begin update profili set tariffa_oraria = 18 where id = o1; get diagnostics n = row_count; if n <> 1 then f := f || 'am non cambia la tariffa; '; end if; exception when others then f := f || 'am non cambia la tariffa: ' || sqlerrm || '; '; end;
  t := t + 1; begin update profili set attivo = false where id = o1; f := f || 'am disattiva operatori; '; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(ec, o1); f := f || 'am assegna operatori; '; exception when others then null; end;
  t := t + 1; begin perform invia_ricarica_carta(o1, 700); f := f || 'am manda carta; '; exception when others then null; end;
  t := t + 1; begin insert into location (indirizzo, citta, regione) values ('x', 'Firenze', 'Toscana'); f := f || 'am crea location; '; exception when others then null; end;
  t := t + 1; begin update articoli set quantita = 0 where id = ar; get diagnostics n = row_count; if n <> 0 then f := f || 'am cambia l''inventario; '; end if; exception when others then null; end;
  t := t + 1; update ore_lavorate set stato = 'approvato' where evento_id = eb; get diagnostics n = row_count; if n <> 1 then f := f || 'am non approva ore; '; end if;
  reset role;

  /* ---------- ADMIN ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 3 then f := f || 'admin non vede tutto; '; end if;
  t := t + 1; select count(*) into n from chat_messaggi where canale like 'dm:%'; if n <> 0 then f := f || 'admin legge le chat private degli altri; '; end if;
  t := t + 1; update impostazioni set valore = 250 where chiave = 'soglia_carta'; get diagnostics n = row_count; if n <> 1 then f := f || 'admin non cambia impostazioni; '; end if;
  t := t + 1; update profili set ruolo = 'project' where id = o2; get diagnostics n = row_count; if n <> 1 then f := f || 'admin non cambia ruoli; '; end if;
  t := t + 1; begin update eventi set project_id = pb where id = ec; exception when others then f := f || 'admin non sposta eventi tra project; '; end;
  reset role;

  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
