-- Clienti: dati per la fattura obbligatori e sistemati, nessun doppione, chi vede e chi crea.
do $$
declare pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid(); go uuid := gen_random_uuid(); o1 uuid := gen_random_uuid();
  c1 uuid; c2 uuid; n int; s text; t int := 0; f text := '';
  piva text := lpad((floor(random() * 1e10))::bigint::text, 11, '9');
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[pa, pb, go, o1]) u;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'project', attivo = true, nome = 'Pb' where id = pb;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Go' where id = go;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1' where id = o1;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin
    insert into clienti (tipo, nome, partita_iva, codice_sdi, indirizzo, cap, citta, provincia, project_id)
    values ('azienda', '  Rossi Eventi srl ', 'IT ' || piva, 'm5uxcr1', 'Via Roma 1', '50100', 'Firenze', 'fi', pa) returning id into c1;
  exception when others then f := f || 'il project non crea un''azienda: ' || sqlerrm || '; '; end;
  t := t + 1; select nome || '|' || partita_iva || '|' || codice_sdi || '|' || provincia into s from clienti where id = c1;
  if s is distinct from 'Rossi Eventi srl|' || piva || '|M5UXCR1|FI' then f := f || 'dati non sistemati: ' || coalesce(s, '-') || '; '; end if;
  t := t + 1; begin
    insert into clienti (tipo, nome, codice_fiscale, indirizzo, cap, citta, provincia, project_id)
    values ('privato', 'Mario Bianchi', 'bnc mra 80a01 d612x', 'Via Po 3', '10100', 'Torino', 'TO', pa) returning id into c2;
  exception when others then f := f || 'il project non crea un privato: ' || sqlerrm || '; '; end;
  t := t + 1; begin insert into clienti (tipo, nome, partita_iva, indirizzo, cap, citta, provincia) values ('azienda', 'Senza SDI', '12345678901', 'x', '50100', 'Firenze', 'FI'); f := f || 'azienda senza SDI né PEC; '; exception when others then null; end;
  t := t + 1; begin insert into clienti (tipo, nome, partita_iva, pec, indirizzo, cap, citta, provincia) values ('azienda', 'Con PEC', '1234', 'a@pec.it', 'x', '50100', 'Firenze', 'FI'); f := f || 'partita IVA corta; '; exception when others then null; end;
  t := t + 1; begin insert into clienti (tipo, nome, partita_iva, pec, indirizzo, cap, citta, provincia) values ('azienda', 'Doppione', piva, 'a@pec.it', 'x', '50100', 'Firenze', 'FI'); f := f || 'stessa partita IVA due volte; '; exception when others then null; end;
  t := t + 1; begin insert into clienti (tipo, nome, codice_fiscale, indirizzo, cap, citta, provincia) values ('privato', 'Senza CAP', 'BNCMRA80A01D612X', 'x', '', 'Torino', 'TO'); f := f || 'cliente senza CAP; '; exception when others then null; end;
  t := t + 1; begin insert into clienti (tipo, nome, partita_iva, pec, indirizzo, cap, citta, provincia) values ('azienda', 'Con PEC giusta', '1' || substr(piva, 2), 'Amministrazione@PEC.it', 'x', '50100', 'Firenze', 'FI'); exception when others then f := f || 'azienda con PEC rifiutata: ' || sqlerrm || '; '; end;
  t := t + 1; begin insert into eventi (project_id, nome, indirizzo, citta, regione, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il, stato, cliente_id)
    values (pa, 'Con cliente', 'x', 'Firenze', 'Toscana', now() + interval '5 days', now() + interval '5 days 1 hour', now() + interval '5 days 2 hours', now() + interval '5 days 3 hours', 'da_assegnare', c1);
    exception when others then f := f || 'evento con cliente non creato: ' || sqlerrm || '; '; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', pb, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from clienti where id in (c1, c2); if n <> 2 then f := f || 'un altro project non vede i clienti comuni; '; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', go, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin insert into clienti (tipo, nome, codice_fiscale, indirizzo, cap, citta, provincia) values ('privato', 'Da gestore', 'BNCMRA80A01D612X', 'x', '10100', 'Torino', 'TO'); f := f || 'il gestore crea clienti; '; exception when others then null; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select count(*) into n from clienti; if n <> 0 then f := f || 'l''operatore vede i clienti; '; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
