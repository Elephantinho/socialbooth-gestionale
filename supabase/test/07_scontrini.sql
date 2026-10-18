-- Spese con la carta: arrivano dalla banca e l'operatore allega solo lo scontrino; a mano solo spese di tasca.
do $$
declare pa uuid := gen_random_uuid(); o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); am uuid := gen_random_uuid();
  e1 uuid; p uuid; sp uuid; s text; t int := 0; f text := '';
  cifre text := (select lpad(x::text, 4, '0') from generate_series(0, 9999) x where lpad(x::text, 4, '0') not in (select ultime_cifre from carte_aziendali) limit 1);
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[pa, o1, o2, am]) u;
  update profili set ruolo = 'project', attivo = true, nome = 'Pa' where id = pa;
  update profili set ruolo = 'amministrazione', attivo = true, nome = 'Am' where id = am;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O' where id in (o1, o2);
  insert into eventi (project_id, nome, indirizzo, citta, regione, stato, operatore_id, allestimento_il, inizio_attivazione, fine_attivazione, smontaggio_il)
    values (pa, 'E', 'x', 'Firenze', 'Toscana', 'confermato', o1, now() + interval '1 hour', now() + interval '2 hours', now() + interval '5 hours', now() + interval '6 hours') returning id into e1;
  insert into carte_aziendali (nome, ultime_cifre, operatore_id, note) values ('Carta', cifre, o1, '[PROVA]');
  insert into pagamenti_carte (rif_esterno, carta_ultime, importo, mcc, pagato_il) values ('PROVA-S-' || gen_random_uuid(), cifre, 50, '5541', now() + interval '30 minutes') returning id into p;
  select spesa_id into sp from pagamenti_carte where id = p;
  t := t + 1; if sp is null then f := f || 'pagamento non diventato spesa; '; end if;
  -- foto "caricate" (come farebbe lo storage)
  insert into storage.objects (bucket_id, name) values ('scontrini', e1 || '/' || o1 || '/a.jpg'), ('scontrini', e1 || '/' || o2 || '/b.jpg'), ('scontrini', e1 || '/' || am || '/c.jpg');

  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (e1, 'carburante', 30, 'carta_aziendale', o1, o1); f := f || 'operatore segna a mano una spesa con la carta; '; exception when others then null; end;
  t := t + 1; begin insert into spese_evento (evento_id, voce, importo, pagata_con, operatore_id, creato_da) values (e1, 'vitto', 12, 'operatore', o1, o1); exception when others then f := f || 'operatore non segna la spesa di tasca: ' || sqlerrm || '; '; end;
  t := t + 1; begin perform allega_scontrino(sp, e1 || '/' || o2 || '/b.jpg'); f := f || 'foto della cartella di un altro; '; exception when others then null; end;
  t := t + 1; begin perform allega_scontrino(sp, e1 || '/' || o1 || '/manca.jpg'); f := f || 'foto inesistente accettata; '; exception when others then null; end;
  t := t + 1; begin perform allega_scontrino(sp, e1 || '/' || o1 || '/a.jpg'); exception when others then f := f || 'operatore non allega: ' || sqlerrm || '; '; end;
  t := t + 1; begin perform allega_scontrino(sp, e1 || '/' || o1 || '/a.jpg'); f := f || 'scontrino cambiato una seconda volta; '; exception when others then null; end;
  reset role;
  t := t + 1; select scontrino into s from spese_evento where id = sp; if s is distinct from e1 || '/' || o1 || '/a.jpg' then f := f || 'scontrino non salvato; '; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', o2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform allega_scontrino(sp, e1 || '/' || o2 || '/b.jpg'); f := f || 'un altro operatore allega; '; exception when others then null; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', am, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; begin perform allega_scontrino(sp, e1 || '/' || am || '/c.jpg'); exception when others then f := f || 'amministrazione non sostituisce: ' || sqlerrm || '; '; end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
