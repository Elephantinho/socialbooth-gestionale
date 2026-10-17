-- Versione minima (eventi, calendario, operatori, assegnazione):
-- i controlli periodici non mandano più promemoria per tappe e chiusure, che nell'app non ci sono.
-- Le tabelle delle altre funzioni restano nel database, vuote e non usate.
create or replace function public.controlla_scadenze()
returns void language plpgsql security definer set search_path = public
as $$
declare p record;
begin
  -- Proposte scadute senza risposta: l'evento torna da assegnare (e passa alla riserva, se c'è)
  for p in update public.proposte set stato = 'scaduta', risposta_il = now()
           where stato = 'in_attesa' and scade_il < now() returning evento_id
  loop
    update public.eventi set stato = 'da_assegnare', operatore_id = null where id = p.evento_id and stato = 'proposto';
  end loop;

  -- Promemoria il giorno prima
  for p in select id, operatore_id from public.eventi
           where stato = 'confermato' and operatore_id is not null
             and allestimento_il between now() + interval '23 hours 45 minutes' and now() + interval '24 hours'
  loop
    perform public.notifica(p.operatore_id, 'Domani hai un evento', public.descrivi_evento(p.id), '/operatore/eventi/' || p.id);
  end loop;
end $$;
