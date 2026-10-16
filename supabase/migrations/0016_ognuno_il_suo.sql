-- Ogni ruolo vede e modifica solo quello che gli spetta.

-- Attività: il project vede le sue (create da lui, assegnate a lui o dei suoi eventi), non quelle degli altri
alter policy attivita_gestione on public.attivita
  using (public.vede_tutti_eventi() or creato_da = auth.uid() or assegnato_a = auth.uid()
         or (evento_id is not null and public.gestisco_evento(evento_id)))
  with check (public.e_gestione() and (public.vede_tutti_eventi() or creato_da = auth.uid() or assegnato_a = auth.uid()
         or (evento_id is not null and public.gestisco_evento(evento_id))));

-- Carte aziendali: solo chi gestisce i soldi (e l'operatore la sua)
alter policy carte_select on public.carte_aziendali using (operatore_id = auth.uid() or public.amministra());

-- Il gestore operatori modifica la parte operativa degli eventi (orari, luogo, magazzino, note)
create policy eventi_gestore_update on public.eventi for update to authenticated
  using (public.mio_ruolo() = 'gestore_operatori') with check (public.mio_ruolo() = 'gestore_operatori');

-- …ma non i soldi; e l'amministrazione tocca solo prezzo e fattura
create or replace function public.proteggi_evento()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  soldi text[] := array['prezzo_cliente', 'fattura_numero', 'fattura_data', 'fattura_importo', 'fattura_pagata'];
  r public.ruolo := public.mio_ruolo();
begin
  if auth.uid() is null then return new; end if;
  if r = 'gestore_operatori'
     and (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(new)) x(k, v) where k = any(soldi))
         is distinct from (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(old)) x(k, v) where k = any(soldi)) then
    raise exception 'Il gestore operatori non può cambiare prezzo e fattura';
  end if;
  if r = 'amministrazione'
     and (to_jsonb(new) - soldi - 'aggiornato_il') is distinct from (to_jsonb(old) - soldi - 'aggiornato_il') then
    raise exception 'L''amministrazione può cambiare solo prezzo e fattura';
  end if;
  return new;
end $$;
revoke execute on function public.proteggi_evento() from public, anon, authenticated;
create trigger a_proteggi_evento before update on public.eventi
for each row execute function public.proteggi_evento();
