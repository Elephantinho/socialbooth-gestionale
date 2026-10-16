-- Ogni 15 minuti: proposte scadute, promemoria ore, promemoria del giorno prima
create extension if not exists pg_cron;
select cron.schedule('controlla-scadenze', '*/15 * * * *', 'select public.controlla_scadenze()');
