-- L'operatore ha sempre 24 ore per accettare: valore fisso, non più modificabile dall'app.
create or replace function public.ore_scadenza() returns interval
language sql immutable set search_path = '' as $$ select interval '24 hours' $$;
