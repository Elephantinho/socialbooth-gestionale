-- Magazzini: admin e gestore li gestiscono, gli altri leggono; la carta non va sotto zero; gli strumenti li vede solo il pannello.
do $$
declare ge uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); o1 uuid := gen_random_uuid(); m1 uuid; n int; t int := 0; f text := '';
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[ge, pa, o1]) u;
  update profili set ruolo = 'gestore_operatori', attivo = true, nome = 'Ge' where id = ge;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O' where id = o1;

  perform set_config('request.jwt.claims', json_build_object('sub', ge, 'role', 'authenticated')::text, true); set local role authenticated;
  t := t + 1; begin insert into magazzini (nome, indirizzo, citta, regione, responsabile_id, carta_minima) values ('Magazzino prova', 'Via 1', 'Milano', 'Lombardia', o1, 400) returning id into m1;
    exception when others then f := f || 'il gestore non crea un magazzino: ' || sqlerrm || '; '; end;
  t := t + 1; begin insert into articoli (magazzino_id, nome, categoria, quantita) values (m1, 'Booth', 'booth', 2); exception when others then f := f || 'il gestore non aggiunge strumenti: ' || sqlerrm || '; '; end;
  t := t + 1; begin insert into articoli (magazzino_id, nome, categoria) values (m1, 'X', 'astronave'); f := f || 'accetta una categoria inventata; '; exception when others then null; end;
  t := t + 1; select carica_carta(m1, 800) into n; if n <> 800 then f := f || 'carico carta dà ' || n || '; '; end if;
  t := t + 1; select carica_carta(m1, -1000) into n; if n <> 0 then f := f || 'la carta va sotto zero: ' || n || '; '; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true); set local role authenticated;
  t := t + 1; select count(*) into n from articoli where magazzino_id = m1; if n <> 1 then f := f || 'il project non legge gli strumenti; '; end if;
  t := t + 1; begin perform carica_carta(m1, 400); f := f || 'il project cambia la carta; '; exception when others then null; end;
  t := t + 1; update magazzini set nome = 'Rubato' where id = m1; get diagnostics n = row_count; if n <> 0 then f := f || 'il project modifica un magazzino; '; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true); set local role authenticated;
  t := t + 1; select count(*) into n from magazzini where id = m1; if n <> 1 then f := f || 'l''operatore non legge il suo magazzino; '; end if;
  t := t + 1; select count(*) into n from articoli where magazzino_id = m1; if n <> 0 then f := f || 'l''operatore legge gli strumenti; '; end if;
  t := t + 1; begin perform carica_carta(m1, 400); f := f || 'l''operatore cambia la carta; '; exception when others then null; end;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
