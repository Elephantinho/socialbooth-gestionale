-- Regola semplice: un pagamento con la carta è dell'evento se cade nello stesso giorno dell'evento
-- (dal giorno dell'allestimento al giorno dello smontaggio, ora di Roma). Altrimenti resta da controllare.
create or replace function public.abbina_pagamento(p_pagamento uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.pagamenti_carte;
  op uuid;
  giorno date;
  ev uuid;
begin
  select * into p from public.pagamenti_carte where id = p_pagamento;
  if p.stato <> 'da_abbinare' then return; end if;
  if p.importo <= 0 then
    update public.pagamenti_carte set motivo = 'Rimborso o storno: controlla a quale spesa si riferisce' where id = p.id; return;
  end if;
  select operatore_id into op from public.carte_aziendali
   where ultime_cifre = p.carta_ultime and attiva and operatore_id is not null limit 1;
  if op is null then
    update public.pagamenti_carte set motivo = 'Carta che non risulta di nessun operatore' where id = p.id; return;
  end if;

  giorno := (p.pagato_il at time zone 'Europe/Rome')::date;
  select id into ev from public.eventi
   where operatore_id = op and stato in ('confermato', 'in_corso', 'completato')
     and giorno between (allestimento_il at time zone 'Europe/Rome')::date and (smontaggio_il at time zone 'Europe/Rome')::date
   order by greatest(extract(epoch from allestimento_il - p.pagato_il), extract(epoch from p.pagato_il - smontaggio_il), 0)
   limit 1;
  if ev is null then
    update public.pagamenti_carte set operatore_id = op,
      motivo = 'Pagato in un giorno senza eventi: è una spesa di lavoro? (es. benzina il giorno prima)' where id = p.id;
    return;
  end if;
  perform public._registra_pagamento(p.id, ev, op);
end $$;
revoke execute on function public.abbina_pagamento(uuid) from public, anon, authenticated;
