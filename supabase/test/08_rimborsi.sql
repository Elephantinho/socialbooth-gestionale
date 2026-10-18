-- Rimborsi: solo l'amministrazione li segna; solo le spese pagate di tasca; si possono annullare.
do $$
declare pa uuid := gen_random_uuid(); o1 uuid := gen_random_uuid(); am uuid := gen_random_uuid(); e1 uuid; s1 uuid; s2 uuid; n int; t int := 0; f text := '';
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[pa, o1, am]) u;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'amministrazione', attivo = true, nome = 'Am' where id = am;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O' where id = o1;
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E', 'x', 'Firenze', 'Toscana', 'confermato', o1, now() + interval '1 hour', now() + interval '2 hours', now() + interval '5 hours', now() + interval '6 hours') returning id into e1;
  insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (e1, 'vitto', 12.5, 'operatore', o1, o1) returning id into s1;
  insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (e1, 'carburante', 40, 'carta_aziendale', o1, o1) returning id into s2;
  perform set_config('request.jwt.claims', json_build_object('sub', pa, 'role', 'authenticated')::text, true); set local role authenticated;
  t := t + 1; begin perform segna_rimborso(array[s1]); f := f || 'il project segna rimborsi; '; exception when others then null; end;
  t := t + 1; begin update spese_evento set rimborsata_il = now() where id = s1; f := f || 'il project scrive la data di rimborso; '; exception when others then null; end;
  t := t + 1; begin update spese_evento set descrizione = 'ok' where id = s1; exception when others then f := f || 'il project non modifica la descrizione: ' || sqlerrm || '; '; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true); set local role authenticated;
  t := t + 1; begin perform segna_rimborso(array[s1]); f := f || 'l''operatore si rimborsa; '; exception when others then null; end;
  t := t + 1; select count(*) into n from spese_evento where id = s1 and rimborsata_il is null; if n <> 1 then f := f || 'l''operatore non vede la sua spesa da rimborsare; '; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', am, 'role', 'authenticated')::text, true); set local role authenticated;
  t := t + 1; select segna_rimborso(array[s1, s2]) into n; if n <> 1 then f := f || 'rimborsate ' || n || ' invece di 1 (la carta non si rimborsa); '; end if;
  t := t + 1; select segna_rimborso(array[s1], false) into n; if n <> 1 then f := f || 'non si annulla il rimborso; '; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
