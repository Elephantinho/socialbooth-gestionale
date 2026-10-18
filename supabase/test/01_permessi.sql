-- Permessi, ruolo per ruolo, sullo schema attuale: chi vede quali eventi, chi vede i soldi,
-- chi può cambiare cosa, e che il vecchio schema non sia più raggiungibile.
-- Si lancia nel SQL editor: crea utenti finti, prova tutto e alla fine solleva un errore apposta
-- con il risultato, così ogni modifica viene annullata.
do $$
declare
  ad uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid();
  go uuid := gen_random_uuid(); am uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); ox uuid := gen_random_uuid();
  ea uuid; eb uuid; ec uuid; n int; s text; t int := 0; f text := '';
begin
  /* ---------- dati di prova (come sistema) ---------- */
  insert into auth.users (id, email) select x, x || '@prova.local' from unnest(array[ad, pa, pb, go, am, o1, o2, ox]) x;
  update profili set ruolo = 'admin', attivo = true, nome = 'Ad' where id = ad;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'project', attivo = true, nome = 'Pb' where id = pb;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'amministrazione', attivo = true, nome = 'Am' where id = am;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1' where id = o1;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O2' where id = o2;
  update profili set ruolo = 'operatore', attivo = false, nome = 'Ox' where id = ox;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, operatore_id)
    values (pa, 'Evento A', 'Via B 2', 'Firenze', 'Toscana', now() + interval '3 days', now() + interval '3 days 1 hour', now() + interval '3 days 5 hours', now() + interval '3 days 6 hours', 'confermato', o1)
    returning id into ea;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, operatore_id)
    values (pb, 'Evento B', 'Via C 3', 'Roma', 'Lazio', now() + interval '4 days', now() + interval '4 days 1 hour', now() + interval '4 days 5 hours', now() + interval '4 days 6 hours', 'confermato', o2)
    returning id into eb;
  insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'Evento C', 'Via D 4', 'Firenze', 'Toscana', now() + interval '10 days', now() + interval '10 days 1 hour', now() + interval '10 days 5 hours', now() + interval '10 days 6 hours', 'da_assegnare')
    returning id into ec;
  insert into conti_evento (evento_id, prezzo) values (ea, 1000), (eb, 2000);
  insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (ea, 'carburante', 40, 'operatore', o1, o1), (eb, 'altro', 12, 'carta_aziendale', o2, o2);
  insert into carte_aziendali (nome, ultime_cifre, operatore_id, note) values ('Carta prova', '1234', o1, '[PROVA]');
  insert into pagamenti_carte (rif_esterno, carta_ultime, importo, pagato_il) values ('PROVA-' || gen_random_uuid(), '1234', 25, now() - interval '20 days');

  /* ---------- OPERATORE ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 1 then f := f || 'o1 vede ' || n || ' eventi invece di 1; '; end if;
  t := t + 1; select count(*) into n from profili; if n <> 1 then f := f || 'o1 vede ' || n || ' profili; '; end if;
  t := t + 1; select count(*) into n from conti_evento; if n <> 0 then f := f || 'o1 vede prezzi e fatture; '; end if;
  t := t + 1; select count(*) into n from spese_evento where evento_id in (ea, eb); if n <> 1 then f := f || 'o1 vede ' || n || ' spese invece della sua; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali; if n <> 1 then f := f || 'o1 vede ' || n || ' carte invece della sua; '; end if;
  t := t + 1; select count(*) into n from pagamenti_carte; if n <> 0 then f := f || 'o1 vede i pagamenti della banca; '; end if;
  t := t + 1; update eventi set note = 'x' where id = ea; get diagnostics n = row_count; if n <> 0 then f := f || 'o1 modifica l''evento; '; end if;
  t := t + 1; update profili set nome = 'Hack' where id = o2; get diagnostics n = row_count; if n <> 0 then f := f || 'o1 modifica il profilo di o2; '; end if;
  t := t + 1; update profili set nome = 'Uno' where id = o1; get diagnostics n = row_count; if n <> 1 then f := f || 'o1 non cambia il suo nome; '; end if;
  t := t + 1; begin update profili set ruolo = 'admin' where id = o1; f := f || 'o1 si fa admin; '; exception when others then null; end;
  t := t + 1; begin update profili set attivo = false where id = o1; f := f || 'o1 si disattiva da solo; '; exception when others then null; end;
  t := t + 1; begin insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (ea, 'vitto', 10, 'operatore', o1, o1); exception when others then f := f || 'o1 non segna una spesa: ' || sqlerrm || '; '; end;
  t := t + 1; begin insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (eb, 'vitto', 10, 'operatore', o1, o1); f := f || 'o1 segna spese su un evento non suo; '; exception when others then null; end;
  t := t + 1; begin insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (ea, 'vitto', 10, 'operatore', o2, o1); f := f || 'o1 segna spese a nome di o2; '; exception when others then null; end;
  t := t + 1; begin insert into conti_evento (evento_id, prezzo) values (ec, 1); f := f || 'o1 mette un prezzo; '; exception when others then null; end;
  t := t + 1; begin insert into proposte (evento_id, operatore_id, scade_il) values (ec, o1, now() + interval '1 day'); f := f || 'o1 si crea una proposta; '; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(ec, o1); f := f || 'o1 si propone da solo; '; exception when others then null; end;
  t := t + 1; begin insert into notifiche (utente_id, titolo) values (o2, 'spam'); f := f || 'o1 manda notifiche; '; exception when others then null; end;
  t := t + 1; begin insert into zone_operatore (operatore_id, regione) values (o2, 'Sicilia'); f := f || 'o1 cambia le zone di o2; '; exception when others then null; end;
  t := t + 1; begin insert into indisponibilita (operatore_id, dal, al) values (o1, current_date + 20, current_date + 21); exception when others then f := f || 'o1 non segna le sue ferie; '; end;
  t := t + 1; begin perform concludi_evento(ea); f := f || 'o1 chiude l''evento a mano; '; exception when others then null; end;
  reset role;

  /* ---------- OPERATORE NON ATTIVO ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', ox, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi; if n <> 0 then f := f || 'operatore non attivo vede eventi; '; end if;
  reset role;

  /* ---------- PROJECT A ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 2 then f := f || 'pa vede ' || n || ' eventi invece di 2; '; end if;
  t := t + 1; select count(*) into n from conti_evento where evento_id in (ea, eb); if n <> 1 then f := f || 'pa vede ' || n || ' conti invece del suo; '; end if;
  t := t + 1; select count(*) into n from spese_evento where evento_id = eb; if n <> 0 then f := f || 'pa vede le spese di pb; '; end if;
  t := t + 1; select count(*) into n from spese_evento where evento_id = ea; if n = 0 then f := f || 'pa non vede le spese sue; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali; if n <> 0 then f := f || 'pa vede le carte aziendali; '; end if;
  t := t + 1; select count(*) into n from pagamenti_carte; if n <> 0 then f := f || 'pa vede i pagamenti della banca; '; end if;
  t := t + 1; update conti_evento set prezzo = 1200 where evento_id = ea; get diagnostics n = row_count; if n <> 1 then f := f || 'pa non cambia il prezzo del suo evento; '; end if;
  t := t + 1; update conti_evento set prezzo = 1 where evento_id = eb; get diagnostics n = row_count; if n <> 0 then f := f || 'pa cambia il prezzo di pb; '; end if;
  t := t + 1; update eventi set note = 'x' where id = eb; get diagnostics n = row_count; if n <> 0 then f := f || 'pa modifica eventi di pb; '; end if;
  t := t + 1; begin update eventi set project_id = pb where id = ea; f := f || 'pa regala l''evento a pb; '; exception when others then null; end;
  t := t + 1; begin update eventi set stato = 'completato' where id = ea; f := f || 'pa segna completato a mano; '; exception when others then null; end;
  t := t + 1; begin update eventi set stato = 'confermato', operatore_id = o2 where id = ec; f := f || 'pa conferma un operatore senza chiederglielo; '; exception when others then null; end;
  t := t + 1; begin insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pb, 'x', 'x', 'Firenze', 'Toscana', now() + interval '5 days', now() + interval '5 days', now() + interval '5 days', now() + interval '5 days', 'da_assegnare');
    f := f || 'pa crea eventi a nome di pb; '; exception when others then null; end;
  t := t + 1; begin insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato)
    values (pa, 'x', 'x', 'Firenze', 'Toscana', now() + interval '5 days 6 hours', now() + interval '5 days 7 hours', now() + interval '5 days 8 hours', now() + interval '5 days', 'da_assegnare');
    f := f || 'pa crea un evento che finisce prima di iniziare; '; exception when others then null; end;
  t := t + 1; begin update profili set attivo = true where id = ox; get diagnostics n = row_count; if n <> 0 then f := f || 'pa attiva operatori; '; end if; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(eb, o1); f := f || 'pa propone operatori su eventi di pb; '; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(ec, ox); f := f || 'pa propone un operatore non attivo; '; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(ec, go); f := f || 'pa propone il gestore come operatore; '; exception when others then null; end;
  t := t + 1; select count(*) into n from operatori_disponibili(eb); if n <> 0 then f := f || 'pa vede i disponibili per eventi di pb; '; end if;
  t := t + 1; begin perform proponi_operatore(ec, o2); exception when others then f := f || 'pa non propone sul suo evento: ' || sqlerrm || '; '; end;
  reset role;

  /* ---------- PROJECT B ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', pb, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 1 then f := f || 'pb vede ' || n || ' eventi invece di 1; '; end if;
  t := t + 1; select count(*) into n from proposte where evento_id = ec; if n <> 0 then f := f || 'pb vede le proposte di pa; '; end if;
  reset role;

  /* ---------- GESTORE OPERATORI: tutti gli eventi, nessun importo ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 3 then f := f || 'go vede ' || n || ' eventi invece di 3; '; end if;
  t := t + 1; select count(*) into n from conti_evento; if n <> 0 then f := f || 'go vede i prezzi; '; end if;
  t := t + 1; select count(*) into n from spese_evento; if n <> 0 then f := f || 'go vede le spese; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali; if n <> 0 then f := f || 'go vede le carte; '; end if;
  t := t + 1; select count(*) into n from pagamenti_carte; if n <> 0 then f := f || 'go vede i pagamenti; '; end if;
  t := t + 1; begin update eventi set note = 'portare prolunga' where id = ea; get diagnostics n = row_count; if n <> 1 then f := f || 'go non modifica le note; '; end if; exception when others then f := f || 'go non modifica le note: ' || sqlerrm || '; '; end;
  t := t + 1; begin insert into conti_evento (evento_id, prezzo) values (ec, 1); f := f || 'go mette un prezzo; '; exception when others then null; end;
  t := t + 1; begin update eventi set project_id = pb where id = ea; f := f || 'go sposta l''evento a un altro project; '; exception when others then null; end;
  t := t + 1; update profili set attivo = true where id = ox; get diagnostics n = row_count; if n <> 1 then f := f || 'go non attiva un operatore; '; end if;
  t := t + 1; begin update profili set ruolo = 'admin' where id = go; f := f || 'go si fa admin; '; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(eb, o1); exception when others then f := f || 'go non riesce a proporre: ' || sqlerrm || '; '; end;
  reset role;

  /* ---------- AMMINISTRAZIONE: tutti i soldi, niente operatori ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', am, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 3 then f := f || 'am vede ' || n || ' eventi; '; end if;
  t := t + 1; select count(*) into n from conti_evento where evento_id in (ea, eb); if n <> 2 then f := f || 'am non vede tutti i conti; '; end if;
  t := t + 1; select count(*) into n from carte_aziendali where operatore_id = o1; if n <> 1 then f := f || 'am non vede le carte; '; end if;
  t := t + 1; select count(*) into n from pagamenti_carte where rif_esterno like 'PROVA-%'; if n < 1 then f := f || 'am non vede i pagamenti; '; end if;
  t := t + 1; update conti_evento set fattura_numero = '1/2026', fattura_importo = 1000 where evento_id = ea; get diagnostics n = row_count; if n <> 1 then f := f || 'am non fattura; '; end if;
  t := t + 1; select coalesce(incassata_il::text, '-') into s from conti_evento where evento_id = ea; if s <> '-' then f := f || 'am: incassata senza segnarla; '; end if;
  t := t + 1; update conti_evento set incassata = true where evento_id = ea; select coalesce(incassata_il::text, '-') into s from conti_evento where evento_id = ea; if s = '-' then f := f || 'am: data di incasso non messa da sola; '; end if;
  t := t + 1; begin update eventi set note = 'x' where id = ea; f := f || 'am cambia le note dell''evento; '; exception when others then null; end;
  t := t + 1; begin update profili set attivo = false where id = o1; get diagnostics n = row_count; if n <> 0 then f := f || 'am disattiva operatori; '; end if; exception when others then null; end;
  t := t + 1; begin perform proponi_operatore(ec, o1); f := f || 'am assegna operatori; '; exception when others then null; end;
  reset role;

  /* ---------- ADMIN ---------- */
  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from eventi where id in (ea, eb, ec); if n <> 3 then f := f || 'admin non vede tutto; '; end if;
  t := t + 1; select count(*) into n from conti_evento where evento_id in (ea, eb); if n <> 2 then f := f || 'admin non vede i conti; '; end if;
  t := t + 1; update profili set ruolo = 'project' where id = o2; get diagnostics n = row_count; if n <> 1 then f := f || 'admin non cambia ruoli; '; end if;
  t := t + 1; begin update eventi set project_id = pb where id = ec; exception when others then f := f || 'admin non sposta eventi tra project; '; end;

  /* ---------- VECCHIO SCHEMA: chiuso a tutti, anche all'admin ---------- */
  t := t + 1; begin perform count(*) from ore_lavorate; f := f || 'ore_lavorate ancora leggibile; '; exception when insufficient_privilege then null; end;
  t := t + 1; begin perform count(*) from costi_evento; f := f || 'costi_evento ancora leggibile; '; exception when insufficient_privilege then null; end;
  t := t + 1; begin perform count(*) from chat_messaggi; f := f || 'chat ancora leggibile; '; exception when insufficient_privilege then null; end;
  t := t + 1; begin perform chiudi_evento(ea, 0, 0, null); f := f || 'chiudi_evento ancora chiamabile; '; exception when insufficient_privilege then null; end;
  t := t + 1; begin perform check_in(ea, 0, 0, null); f := f || 'check_in vecchio ancora chiamabile; '; exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
