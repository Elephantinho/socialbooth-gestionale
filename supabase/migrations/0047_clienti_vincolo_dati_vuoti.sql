-- Il controllo dei dati di fattura lasciava passare i campi vuoti (in SQL un confronto con un valore
-- mancante è "sconosciuto", e un vincolo "sconosciuto" passa). Ora un dato mancante è un errore.
alter table public.clienti drop constraint clienti_dati_fattura;
alter table public.clienti add constraint clienti_dati_fattura check (coalesce(
  length(nome) between 2 and 200
  and indirizzo is not null and citta is not null
  and coalesce(cap ~ '^\d{5}$', false) and coalesce(provincia ~ '^[A-Z]{2}$', false)
  and case tipo
    when 'azienda' then coalesce(partita_iva ~ '^\d{11}$', false)
      and (coalesce(codice_sdi ~ '^[A-Z0-9]{7}$', false) or coalesce(pec ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$', false))
    else coalesce(codice_fiscale ~ '^[A-Z0-9]{16}$', false)
  end, false)
) not valid;
