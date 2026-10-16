-- Due ruoli in più per dividere il lavoro dell'ufficio:
--   gestore_operatori: approva e organizza gli operatori, assegna gli eventi, manda la carta. Non vede i soldi.
--   amministrazione:   costi, compensi, fatture, carte aziendali. Vede tutti gli eventi.
-- (i nuovi valori vanno aggiunti in una migrazione a parte, prima di usarli)
alter type public.ruolo add value if not exists 'gestore_operatori';
alter type public.ruolo add value if not exists 'amministrazione';
