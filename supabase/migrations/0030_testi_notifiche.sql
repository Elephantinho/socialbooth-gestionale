-- Testi delle notifiche più asciutti: niente "·" tra i pezzi, niente istruzioni ripetute.
-- "Photobooth · Firenze · 18/10" diventa "Photobooth a Firenze, 18/10".
do $$
declare f record; def text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in
             ('descrivi_evento', 'controlla_scadenze', 'invia_ricarica_carta', 'notifiche_proposte', 'notifiche_eventi', 'richieste_automatismi')
  loop
    def := pg_get_functiondef(f.oid);
    def := replace(def, $r$coalesce(t.nome, 'Evento') || ' · ' || e.citta || ' · ' ||$r$, $r$coalesce(t.nome, 'Evento') || ' a ' || e.citta || ', ' ||$r$);
    def := replace(def, $r$'Controllale · ' || $r$, '');
    def := replace(def, $r$'Premi \"Parto dal magazzino\" · ' || $r$, '');
    def := replace(def, $r$'Premi "Parto dal magazzino" · ' || $r$, '');
    def := replace(def, $r$'Controlla orari e dettagli · ' || $r$, '');
    def := replace(def, $r$coalesce(' · ' || p_note, '')$r$, $r$coalesce(', ' || p_note, '')$r$);
    def := replace(def, $r$|| ' · ' || public.descrivi_evento$r$, $r$|| ', ' || public.descrivi_evento$r$);
    def := replace(def, $r$coalesce(' · ' || new.dettagli, '')$r$, $r$coalesce(': ' || new.dettagli, '')$r$);
    def := replace(def, $r$coalesce(' · ' || new.nota_chiusura, '')$r$, $r$coalesce(': ' || new.nota_chiusura, '')$r$);
    execute def;
  end loop;
end $$;
