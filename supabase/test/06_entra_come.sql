-- "Entra come": solo l'admin principale risulta tale; la lista e il registro non sono leggibili dagli altri.
-- La funzione supabase/functions/entra-come fa lo stesso controllo sul server. Tutto annullato alla fine.
do $$
declare
  principale uuid := (select utente_id from admin_principali limit 1);
  ad uuid := gen_random_uuid(); o1 uuid := gen_random_uuid(); b boolean; n int; t int := 0; f text := '';
begin
  insert into auth.users (id, email) select u, u || '@prova.local' from unnest(array[ad, o1]) u;
  update profili set ruolo = 'admin', attivo = true, nome = 'Altro admin' where id = ad;
  update profili set ruolo = 'operatore', attivo = true, nome = 'O1' where id = o1;
  insert into accessi_come (admin_id, utente_id) values (principale, o1);

  t := t + 1; if principale is null then f := f || 'nessun admin principale; '; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', principale, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select sono_principale() into b; if not b then f := f || 'il principale non risulta tale; '; end if;
  t := t + 1; select count(*) into n from accessi_come where utente_id = o1; if n <> 1 then f := f || 'il principale non vede il registro; '; end if;
  t := t + 1; begin perform count(*) from admin_principali; f := f || 'lista dei principali leggibile; '; exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select sono_principale() into b; if b then f := f || 'un altro admin risulta principale; '; end if;
  t := t + 1; select count(*) into n from accessi_come; if n <> 0 then f := f || 'un altro admin legge il registro; '; end if;
  t := t + 1; begin insert into accessi_come (admin_id, utente_id) values (ad, o1); f := f || 'si scrive nel registro dall''app; '; exception when insufficient_privilege then null; end;
  t := t + 1; begin insert into admin_principali (utente_id) values (ad); f := f || 'un admin si fa principale da solo; '; exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select sono_principale() into b; if b then f := f || 'un operatore risulta principale; '; end if;
  reset role;

  -- Se il principale smette di essere admin, perde il potere
  perform set_config('request.jwt.claims', '', true);
  update profili set ruolo = 'project' where id = principale;
  perform set_config('request.jwt.claims', json_build_object('sub', principale, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := t + 1; select sono_principale() into b; if b then f := f || 'resta principale anche senza essere admin; '; end if;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  raise exception 'RISULTATO % test, % falliti: %', t, (length(f) - length(replace(f, ';', ''))), coalesce(nullif(f, ''), 'nessuno');
end $$;
