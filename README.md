# Gestionale Socialbooth

Gestionale per gli eventi photobooth: l'ufficio organizza e assegna gli eventi dal web,
l'operatore li segue dal telefono passo per passo, e i conti di ogni evento (prezzo, fattura,
incasso, spese) si tengono nello stesso posto.

Pubblicato su Vercel: https://socialbooth-gestionale.vercel.app · Database: Supabase.

## Ruoli

| Ruolo | Dove | Cosa vede e fa |
|---|---|---|
| **Admin** | web | Tutto, compresi utenti e ruoli |
| **Project** | web | Solo i suoi eventi: li crea, li assegna, ne vede costi e ricavi |
| **Gestore operatori** | web | Tutti gli eventi e gli operatori, nessun importo |
| **Amministrazione** | web | Tutti i soldi: prezzi, fatture, incassi, spese, carte aziendali |
| **Operatore** | telefono | I suoi incarichi: accetta, segue i passaggi, segna le spese |

Chi si registra nasce *non attivo*: gli operatori li attivano admin o gestore dalla pagina **Operatori**,
gli altri ruoli li assegna l'admin da **Utenti e ruoli**.

## Come funziona

- **Assegnazione** sempre manuale: si sceglie tra gli operatori liberi in zona (anche direttamente
  dalla riga dell'evento). L'operatore ha 24 ore per accettare; se rifiuta o non risponde, l'evento
  torna *da assegnare* e il project viene avvisato.
- **Passaggi dell'operatore**: check-in, attrezzatura, montato, smontato, rientrato, check-out. Si aprono
  il giorno prima, vanno in ordine e cambiano lo stato dell'evento (check-in → *in corso*, check-out →
  *completato*). L'ultimo tocco si annulla entro 10 minuti. Tutti vedono l'andamento in tempo reale.
- **Ritardi**: ogni 15 minuti il database controlla check-in, montaggio e check-out mancanti e avvisa
  una volta sola project, admin, gestore e operatore. I passaggi normali avvisano solo il project.
- **Conti**: i soldi stanno in tabelle separate (`conti_evento`, `spese_evento`), visibili solo a chi
  può vederli. La pagina Conti divide ricavi, costi e margine per mese, evento, operatore o regione.
- **Carte aziendali**: si salvano solo le ultime 4 cifre. Un pagamento con la carta fatto nello stesso
  giorno di un evento dell'operatore diventa da solo una spesa di quell'evento; altrimenti resta
  "da controllare" nella pagina Carte. La connessione automatica con la banca non è ancora attiva.
- **Notifiche sul telefono**: Android (Chrome) subito, iPhone dopo "Aggiungi a Home". Le manda la
  funzione `supabase/functions/invia-push`; le chiavi stanno nella tabella `segreti`, mai nel codice.

## Avvio in locale

```bash
npm install
npm run dev          # http://localhost:5173
```

Le chiavi pubbliche (publishable) di Supabase sono già nel codice e sono fatte per stare nel browser.
Per usare un altro progetto Supabase basta un file `.env` (vedi `.env.example`).
Le chiavi segrete (service role, chiavi push, Revolut) non vanno **mai** nel repository.

## Controlli

```bash
npm run verifica     # tutto: lint, tipi, test, codice inutilizzato, build
```

| Comando | Cosa fa |
|---|---|
| `npm run lint` | oxlint con regole severe (hook di React, stato negli effetti, cicli tra moduli) |
| `npm test` | controllo dei tipi e test delle regole pure in `test/` |
| `npm run inutilizzato` | knip: file, export e dipendenze non usati |
| `npm run build` | build di produzione |

I test del database sono in `supabase/test/` e si incollano nel SQL editor di Supabase. Creano utenti
finti, provano tutto e annullano ogni modifica: l'ultima riga solleva apposta un errore con il risultato
(`RISULTATO N test, 0 falliti`).

| File | Cosa prova | Controlli |
|---|---|---|
| `01_permessi.sql` | chi vede e chi cambia cosa, ruolo per ruolo; vecchio schema chiuso | 74 |
| `02_proposte.sql` | proposte, rifiuti, cambi, scadenza 24 ore, ferie, annullamenti | 32 |
| `03_passaggi.sql` | ordine dei passaggi, stati, notifiche, annullamento | 20 |
| `04_ritardi.sql` | avvisi di ritardo una volta sola, chiusura a mano | 12 |
| `05_soldi.sql` | abbinamento dei pagamenti con la carta, incassi, spese | 20 |

## Struttura del codice

```
src/
  modules/            la logica, divisa per argomento
    auth/             sessione.ts (chi è loggato), permessi.ts (chi può cosa), Protetto.tsx (pagine riservate)
    eventi/           api.ts (letture e scritture), logic/ (regole pure, testate), components/
    passaggi/         i passaggi dell'operatore e i ritardi
    conti/            prezzi, fatture, spese, carte e pagamenti
    assegnazione/     scelta dell'operatore
    anagrafiche/      operatori, tipi di booth, indisponibilità, utenti
    comunicazione/    notifiche in app e sul telefono
  ruoli/              solo le schermate, che usano i moduli
    gestione/         pannello web dell'ufficio
    operatore/        app sul telefono
  shared/
    lib/              date.ts (giorni secondo l'ora di Roma), tempo.ts (un solo orologio), formato.ts, …
    ui/               componenti comuni
    types/            supabase.ts (generato) e database.ts (scorciatoie)
supabase/
  migrations/         lo schema del database, in ordine numerico
  test/               i test del database
  functions/          funzioni sul server (notifiche push)
```

Regole del codice:

- Le pagine non chiamano Supabase: passano dagli hook in `modules/*/api.ts` (solo l'accesso usa il login direttamente).
- I giorni si trattano come testo `"AAAA-MM-GG"` secondo l'ora di Roma (`shared/lib/date.ts`), mai con il fuso del browser.
- L'ora corrente si legge con `useAdesso()`, non con `Date.now()` nel render.
- Le regole vere stanno nel database (Row Level Security e funzioni): l'app nasconde solo menu e pulsanti.

### Tipi del database

`src/shared/types/supabase.ts` è generato dallo schema e non si modifica a mano. Dopo una migrazione
si rigenera (Supabase CLI):

```bash
npx supabase gen types typescript --project-id ltfzqnljmnbiqmbmvvfk > src/shared/types/supabase.ts
```

e si rimette in cima la riga `/* oxlint-disable */`. Nel codice si usano le scorciatoie di
`database.ts`: `Riga<'eventi'>`, `Inserimento<'eventi'>`, `Enum<'regione'>`.

## Da configurare in Supabase

- *Authentication → URL Configuration*: *Site URL* e *Redirect URLs* con l'indirizzo dell'app pubblicata,
  così il link di conferma email riporta all'app.
- *Authentication → Password*: attivare la protezione contro le password già trapelate.

## Vecchio schema

Chat, richieste, magazzino, ore e costi previsti sono del vecchio gestionale: le tabelle sono ancora nel
database ma chiuse all'app (migrazione 0041). Si possono cancellare quando si è sicuri di non volerle più.
