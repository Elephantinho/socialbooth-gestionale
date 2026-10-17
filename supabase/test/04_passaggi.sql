-- Passaggi dell'operatore: ordine, stati, notifiche, chi vede, annullamento. Tutto annullato alla fine.
do $$
declare
  ad uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid(); go uuid := gen_random_uuid();
  o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid();
  e1 uuid; e2 uuid; n int; s text; t int := 0; f text := '';
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[ad, pa, pb, go, o1, o2]) u;
  update profili set ruolo = 'admin', attivo = true, nome = 'Ad' where id = ad;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'project', attivo = true, nome = 'Pb' where id = pb;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1', cognome = 'Uno' where id = o1;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O2' where id = o2;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'Test passaggi', 'x', 'Firenze', 'Toscana', 'confermato', o1, now() + interval '2 hours', now() + interval '3 hours', now() + interval '6 hours', now() + interval '7 hours') returning id into e1;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'Fra 3 giorni', 'x', 'Firenze', 'Toscana', 'confermato', o1, now() + interval '3 days', now() + interval '3 days 1 hour', now() + interval '3 days 4 hours', now() + interval '3 days 5 hours') returning id into e2;

  /* 1. Solo l'operatore dell'evento, e solo con la funzione */
  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform segna_passaggio(e1, 'check_in'); f := f || '1: un altro operatore fa il check-in; '; exception when others then null; end;
  t := t + 1; begin insert into passaggi_evento (evento_id, operatore_id, passaggio) values (e1, o2, 'check_in'); f := f || '1: scrittura diretta permessa; '; exception when others then null; end;
  reset role;

  /* 2. Troppo presto e fuori ordine */
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform segna_passaggio(e2, 'check_in'); f := f || '2: check-in 3 giorni prima; '; exception when others then null; end;
  t := t + 1; begin perform segna_passaggio(e1, 'montato'); f := f || '2: montato senza check-in; '; exception when others then null; end;

  /* 3. Check-in: evento in corso, ufficio avvisato */
  perform segna_passaggio(e1, 'check_in');
  reset role;
  t := t + 1; select stato || '/' || ultimo_passaggio into s from eventi where id = e1; if s <> 'in_corso/check_in' then f := f || '3: dopo check-in ' || s || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where titolo = 'O1 Uno ha fatto il check-in' and utente_id in (pa, ad, go); if n <> 3 then f := f || '3: avvisati ' || n || ' invece di 3; '; end if;
  t := t + 1; select count(*) into n from notifiche where titolo like 'O1 Uno%' and utente_id in (pb, o2, o1); if n <> 0 then f := f || '3: avvisato chi non c''entra; '; end if;
  set local role authenticated;
  t := t + 1; begin perform segna_passaggio(e1, 'check_in'); f := f || '3: doppio check-in; '; exception when others then null; end;
  t := t + 1; begin perform segna_passaggio(e1, 'smontato'); f := f || '3: salta passaggi; '; exception when others then null; end;

  /* 4. Tocco sbagliato: si annulla l'ultimo, fino a tornare confermato */
  perform segna_passaggio(e1, 'attrezzatura');
  perform annulla_passaggio(e1);
  reset role;
  t := t + 1; select stato || '/' || ultimo_passaggio into s from eventi where id = e1; if s <> 'in_corso/check_in' then f := f || '4: dopo annullamento ' || s || '; '; end if;
  set local role authenticated;
  perform annulla_passaggio(e1);
  reset role;
  t := t + 1; select stato || '/' || coalesce(ultimo_passaggio::text, '-') into s from eventi where id = e1; if s <> 'confermato/-' then f := f || '4: annullato il check-in: ' || s || '; '; end if;

  /* 5. Giro completo: dopo 10 minuti non si annulla; il check-out completa l'evento */
  set local role authenticated;
  perform segna_passaggio(e1, 'check_in');
  reset role;
  update passaggi_evento set fatto_il = now() - interval '11 minutes' where evento_id = e1 and annullato_il is null;
  set local role authenticated;
  t := t + 1; begin perform annulla_passaggio(e1); f := f || '5: annullato dopo 11 minuti; '; exception when others then null; end;
  perform segna_passaggio(e1, 'attrezzatura');
  perform segna_passaggio(e1, 'montato');
  perform segna_passaggio(e1, 'smontato');
  perform segna_passaggio(e1, 'rientrato');
  perform segna_passaggio(e1, 'check_out');
  reset role;
  t := t + 1; select stato || '/' || ultimo_passaggio into s from eventi where id = e1; if s <> 'completato/check_out' then f := f || '5: fine giro ' || s || '; '; end if;
  t := t + 1; select count(*) into n from passaggi_evento where evento_id = e1 and annullato_il is null; if n <> 6 then f := f || '5: passaggi validi ' || n || '; '; end if;
  t := t + 1; select count(*) into n from notifiche where utente_id = pa and titolo like 'O1 Uno%'; if n <> 8 then f := f || '5: notifiche al project ' || n || ' invece di 8; '; end if;

  /* 6. Chi vede i passaggi */
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from passaggi_evento where evento_id = e1; if n < 6 then f := f || '6: il project non vede i passaggi; '; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', pb, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from passaggi_evento where evento_id = e1; if n <> 0 then f := f || '6: un altro project vede i passaggi; '; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from passaggi_evento where evento_id = e1; if n < 6 then f := f || '6: il gestore non vede i passaggi; '; end if;
  reset role;

  /* 7. Dopo il check-out niente più passaggi */
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform segna_passaggio(e1, 'check_in'); f := f || '7: passaggi su evento completato; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
