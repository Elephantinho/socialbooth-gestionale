-- Spese con la carta aziendale: arrivano dalla banca (Revolut), l'operatore aggiunge solo lo scontrino.
-- A mano l'operatore segna solo le spese pagate di tasca sua: così niente è contato due volte.

alter policy spese_operatore_nuova on public.spese_evento
  with check (operatore_id = auth.uid() and creato_da = auth.uid() and pagata_con = 'operatore' and public.lavoro_evento(evento_id));

/**
 * Allega la foto dello scontrino a una spesa (di solito arrivata dalla banca).
 * - l'operatore: solo a una sua spesa, una volta sola, con una foto caricata nella sua cartella dell'evento
 * - l'ufficio che vede i soldi dell'evento: a qualsiasi spesa, anche per sostituirla
 */
create or replace function public.allega_scontrino(p_spesa uuid, p_percorso text) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.spese_evento;
begin
  select * into s from public.spese_evento where id = p_spesa;
  if not found then raise exception 'Spesa non trovata'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'scontrini' and o.name = p_percorso) then
    raise exception 'Foto non trovata: riprova a caricarla';
  end if;
  if public.vedo_soldi(s.evento_id) then
    update public.spese_evento set scontrino = p_percorso where id = p_spesa;
    return;
  end if;
  if s.operatore_id is distinct from auth.uid() then raise exception 'Questa spesa non è tua'; end if;
  if s.scontrino is not null then raise exception 'Lo scontrino c''è già'; end if;
  if p_percorso not like s.evento_id::text || '/' || auth.uid()::text || '/%' then raise exception 'Foto nella cartella sbagliata'; end if;
  update public.spese_evento set scontrino = p_percorso where id = p_spesa;
end $$;
revoke execute on function public.allega_scontrino(uuid, text) from public, anon;
grant execute on function public.allega_scontrino(uuid, text) to authenticated;
