-- Soldi: pagamenti con la carta aziendale abbinati da soli (regola: stesso giorno di un evento
-- dell'operatore, altrimenti "?"), sistemazione a mano, incasso, spese dell'operatore.
-- Tutto annullato alla fine.
do $$
declare
  pa uuid := gen_random_uuid(); am uuid := gen_random_uuid(); go uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid();
  e1 uuid; e2 uuid; p uuid; n int; s text; t int := 0; f text := '';
  -- ultime cifre che nessuna carta vera usa
  cifre text := (select lpad(x::text, 4, '0') from generate_series(0, 9999) x
                 where lpad(x::text, 4, '0') not in (select ultime_cifre from carte_aziendali) limit 1);
  domani timestamptz := date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome' + interval '1 day';
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[pa, am, go, o1, o2]) u;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'amministrazione', attivo = true, nome = 'Am' where id = am;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1' where id in (o1, o2);
  -- e1: domani 10–18; e2: dopodomani 9–13, entrambi di O1
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E1', 'x', 'Firenze', 'Toscana', 'confermato', o1, domani + interval '10 hours', domani + interval '11 hours', domani + interval '17 hours', domani + interval '18 hours') returning id into e1;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E2', 'x', 'Firenze', 'Toscana', 'confermato', o1, domani + interval '1 day 9 hours', domani + interval '1 day 10 hours', domani + interval '1 day 12 hours', domani + interval '1 day 13 hours') returning id into e2;
  insert into carte_aziendali (nome, ultime_cifre, operatore_id, note) values ('Carta prova', cifre, o1, '[PROVA]');

  /* 1. Stesso giorno dell'evento, anche prima del montaggio: abbinato, spesa creata con la voce giusta */
  insert into pagamenti_carte (rif_esterno, carta_ultime, importo, esercente, mcc, pagato_il)
    values ('PROVA-1-' || gen_random_uuid(), cifre, 60, 'Distributore', '5541', domani + interval '7 hours') returning id into p;
  t := t + 1; select stato || ':' || coalesce(evento_id::text, '-') into s from pagamenti_carte where id = p; if s <> 'abbinato:' || e1 then f := f || '1: ' || s || '; '; end if;
  t := t + 1; select count(*) into n from spese_evento where pagamento_id = p and evento_id = e1 and fonte = 'revolut' and pagata_con = 'carta_aziendale' and operatore_id = o1 and importo = 60; if n <> 1 then f := f || '1: spesa non creata; '; end if;
  t := t + 1; select voce::text into s from spese_evento where pagamento_id = p; if s <> 'carburante' then f := f || '1: voce ' || s || '; '; end if;

  /* 2. Giorno senza eventi (oggi): resta da controllare con il "?" */
  insert into pagamenti_carte (rif_esterno, carta_ultime, importo, pagato_il)
    values ('PROVA-2-' || gen_random_uuid(), cifre, 30, domani - interval '6 hours') returning id into p;
  t := t + 1; select stato || ':' || coalesce(operatore_id::text, '-') into s from pagamenti_carte where id = p; if s <> 'da_abbinare:' || o1 then f := f || '2: ' || s || '; '; end if;
  t := t + 1; select count(*) into n from pagamenti_carte where id = p and motivo like 'Pagato in un giorno senza eventi%'; if n <> 1 then f := f || '2: motivo mancante; '; end if;

  /* 3. Carta di nessuno e rimborsi: da controllare, nessuna spesa */
  insert into pagamenti_carte (rif_esterno, carta_ultime, importo, pagato_il) values ('PROVA-3-' || gen_random_uuid(), 'zzzz', 10, domani + interval '12 hours') returning id into p;
  t := t + 1; select motivo into s from pagamenti_carte where id = p; if s is distinct from 'Carta che non risulta di nessun operatore' then f := f || '3: carta sconosciuta: ' || coalesce(s, '-') || '; '; end if;
  insert into pagamenti_carte (rif_esterno, carta_ultime, importo, pagato_il) values ('PROVA-4-' || gen_random_uuid(), cifre, -20, domani + interval '12 hours') returning id into p;
  t := t + 1; select stato::text into s from pagamenti_carte where id = p; if s <> 'da_abbinare' then f := f || '3: rimborso abbinato da solo; '; end if;

  /* 4. Lo stesso pagamento arrivato due volte dalla banca non si registra due volte */
  t := t + 1; begin
    insert into pagamenti_carte (rif_esterno, carta_ultime, importo, pagato_il) select rif_esterno, carta_ultime, importo, pagato_il from pagamenti_carte where id = p;
    f := f || '4: pagamento doppio; '; exception when unique_violation then null; end;

  /* 5. Sistemazione a mano: solo amministrazione/admin */
  select id into p from pagamenti_carte where rif_esterno like 'PROVA-2-%' and carta_ultime = cifre;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform abbina_a_mano(p, e1); f := f || '5: il project abbina a mano; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform ignora_pagamento(p); f := f || '5: il gestore ignora un pagamento; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', am, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform abbina_a_mano(p, e1);
  reset role;
  t := t + 1; select stato || ':' || evento_id into s from pagamenti_carte where id = p; if s <> 'abbinato:' || e1 then f := f || '5: dopo abbinamento a mano ' || s || '; '; end if;
  set local role authenticated;
  t := t + 1; begin perform abbina_a_mano(p, e2); f := f || '5: abbinato due volte; '; exception when others then null; end;
  select id into p from pagamenti_carte where rif_esterno like 'PROVA-4-%' and carta_ultime = cifre;
  t := t + 1; begin perform abbina_a_mano(p, e1); f := f || '5: rimborso diventato spesa; '; exception when others then null; end;
  perform ignora_pagamento(p);
  reset role;
  t := t + 1; select stato::text into s from pagamenti_carte where id = p; if s <> 'ignorato' then f := f || '5: rimborso non ignorato; '; end if;

  /* 6. L'operatore non toglie le spese arrivate dalla banca */
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; update spese_evento set importo = 1 where evento_id = e1 and fonte = 'revolut'; get diagnostics n = row_count; if n <> 0 then f := f || '6: l''operatore cambia una spesa della banca; '; end if;
  t := t + 1; select count(*) into n from spese_evento where evento_id = e1; if n < 2 then f := f || '6: l''operatore non vede le sue spese; '; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from spese_evento where evento_id = e1; if n <> 0 then f := f || '6: un altro operatore vede le spese; '; end if;
  t := t + 1; begin insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (e1, 'vitto', 5, 'operatore', o2, o2); f := f || '6: spesa su un evento non suo; '; exception when others then null; end;
  reset role;

  /* 7. Incasso: la data si mette e si toglie da sola */
  insert into conti_evento (evento_id, prezzo, fattura_numero, fattura_importo) values (e1, 900, 'P-1', 900);
  update conti_evento set incassata = true where evento_id = e1;
  t := t + 1; select count(*) into n from conti_evento where evento_id = e1 and incassata_il is not null; if n <> 1 then f := f || '7: data di incasso mancante; '; end if;
  update conti_evento set incassata = false where evento_id = e1;
  t := t + 1; select count(*) into n from conti_evento where evento_id = e1 and incassata_il is null; if n <> 1 then f := f || '7: data di incasso rimasta; '; end if;

  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
