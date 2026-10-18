-- Il vecchio schema (chat, richieste, magazzino, ore e costi previsti, tappe) non è più usato dall'app,
-- ma le sue tabelle e funzioni erano ancora raggiungibili dall'API: per esempio ore_lavorate (con le
-- tariffe) era leggibile dal gestore operatori, e chiudi_evento chiudeva un evento saltando i passaggi.
-- Qui si chiude l'accesso dall'API. Non si cancella nulla: i dati restano e si può riaprire con un grant.
-- Le funzioni interne (SECURITY DEFINER) continuano a funzionare.

-- Tabelle non più usate: nessun accesso da app o API
revoke all on table
  public.allegati, public.articoli, public.attivita, public.attrezzatura_evento,
  public.chat_letture, public.chat_messaggi, public.costi_evento, public.magazzini,
  public.messaggi, public.montaggio, public.movimenti_carta, public.ore_lavorate,
  public.richieste, public.spese
from anon, authenticated;

-- Ogni evento nuovo scriveva una "carta stimata" nei vecchi costi previsti
alter table public.eventi disable trigger eventi_carta_prevista;

-- Funzioni del vecchio flusso: non più chiamabili dall'API
revoke execute on function
  public.chat_non_letti(),
  public.check_in(uuid, double precision, double precision, text),
  public.chiudi_evento(uuid, integer, integer, text),
  public.costo_per_stampa(),
  public.invia_ricarica_carta(uuid, integer, text),
  public.media_stampe_per_evento(),
  public.persone_squadra(),
  public.registra_tappa(uuid, text, double precision, double precision),
  public.segna_attrezzatura(uuid, text),
  public.segna_visto(),
  public.segnala_carta(integer, uuid),
  public.voce_da_mcc(text)
from public, anon, authenticated;
