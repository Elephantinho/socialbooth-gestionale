# Gestionale Social Booth

Gestionale per eventi social booth / photobooth, con tre lati:

- **Admin** – vede e controlla tutto (web, `/gestione`)
- **Project** – crea gli eventi e li assegna agli operatori (web, `/gestione`)
- **Operatore** – riceve gli incarichi e li accetta o rifiuta (app telefono, `/operatore`)

## Avvio in locale

```bash
npm install
cp .env.example .env   # chiavi pubbliche del progetto Supabase
npm run dev            # apre su http://localhost:5173
```

### Utenti e ruoli

| Ruolo | Cosa fa |
|---|---|
| **Admin** | Tutto, compresi utenti e ruoli |
| **Project** | Crea i propri eventi e li assegna |
| **Gestore operatori** | Vede tutti gli eventi, gestisce operatori e assegnazioni |
| **Amministrazione** | Vede eventi e operatori |
| **Operatore** | App sul telefono |

I permessi stanno in un posto solo per lato: `src/modules/auth/permessi.tsx` (menu e pulsanti) e
le funzioni `e_gestione()`, `vede_tutti_eventi()`, `gestisce_operatori()`, `amministra()` nel database (migrazione 0015).

- **Operatori**: si registrano da soli dalla pagina `/registrati` (nome, telefono, regioni in cui lavorano).
  Nascono *non attivi*: admin o gestore operatori li approvano dalla pagina **Operatori**.
- **Gli altri ruoli**: la persona si registra, poi l'admin cambia il ruolo da **Utenti e ruoli**.

**Importante per la registrazione**: in Supabase, *Authentication → URL Configuration*, imposta come
*Site URL* l'indirizzo dell'app pubblicata (es. `https://socialbooth-gestionale.vercel.app`) e aggiungilo
anche tra i *Redirect URLs*. Così il link di conferma email riporta all'app.

## Funzionalità

Versione minima, da far crescere un pezzo alla volta. La versione completa precedente
(costi, magazzini, carta, richieste, chat, andamento…) è nel ramo `versione-completa`.

**Ufficio (web)**
- Eventi in programma divisi per stato, e passati; creazione, modifica, duplica, annullamento
- Calendario del mese
- Assegnazione sempre manuale: si sceglie tra gli operatori liberi in zona. L'operatore ha 24 ore per accettare;
  se rifiuta o non risponde, l'evento torna da assegnare e il project riceve una notifica
- Operatori per regione, attivazione dei nuovi, utenti e ruoli

**Operatore (telefono)**
- Incarichi da accettare o rifiutare, prossimo evento con programma, indirizzo, referente e note
- Calendario con i giorni di indisponibilità, profilo con regioni e notifiche

**Notifiche sul telefono**: funzionano su Android (Chrome) anche senza installare nulla; su iPhone dopo
"Aggiungi a Home". Le manda la funzione `supabase/functions/invia-push` a ogni notifica nuova; le chiavi
stanno nella tabella `segreti` del database, mai nel codice.

## Stack

- React + TypeScript + Vite
- Tailwind CSS (tema in `src/index.css`), Framer Motion, icone Lucide
- TanStack Query per i dati, React Router per le pagine
- Supabase: database Postgres, login, sicurezza per ruolo, notifiche sul telefono
- Capacitor per l'app Android (prossima fase)

## Struttura del codice

```
src/
  modules/              ← la logica, divisa per funzionalità
    auth/               login, sessione, permessi per ruolo
    eventi/             api.ts (letture/scritture), logic/ (regole pure), components/
    assegnazione/       scelta dell'operatore
    anagrafiche/        tipi di booth, operatori, indisponibilità, utenti
    comunicazione/      notifiche in app e sul telefono
  ruoli/                ← solo le schermate, che usano i moduli
    operatore/          app telefono
    gestione/           pannello web
  shared/               ← pezzi comuni: ui/, lib/, types/database.ts
supabase/migrations/    ← schema del database, in ordine numerico
```

Regola: le pagine non chiamano mai Supabase direttamente, passano dagli hook in `modules/*/api.ts`.

## Regole principali del database

- **Assegnazione**: sempre manuale. Chi crea l'evento sceglie l'operatore tra quelli liberi (zona giusta, non indisponibile, senza eventi sovrapposti). Se l'operatore rifiuta o non risponde in tempo, l'evento torna *da assegnare* e il project riceve una notifica.
- **Stati**: proposto e confermato li mettono solo le funzioni (`proponi_operatore`, `rispondi_proposta`), non si forzano dall'app.
- **Sicurezza**: ogni ruolo vede solo i propri dati (Row Level Security); chi si registra resta non attivo finché non viene attivato.

## Test

- `npm test`: controlla i tipi e lancia i test delle regole pure (orari, fuso orario, eventi passati, permessi).
- `supabase/test/*.sql`: test del database da incollare nel SQL editor di Supabase. Creano utenti finti, provano tutto e annullano ogni modifica alla fine (l'ultima riga solleva apposta un errore con il risultato: `RISULTATO N test, 0 falliti`).
  - `01_permessi.sql`: chi vede e chi può cambiare cosa, ruolo per ruolo (111 controlli)
  - `02_automatismi.sql`: proposte, rifiuti, scadenze, ferie, tappe, chiusure, carta, magazzino, richieste, chat (58 controlli; tappe, carta, magazzino e richieste riguardano funzioni ora spente nell'app ma ancora nel database)
  - `03_casi_limite.sql`: nessuna riserva automatica, attrezzatura, operatori disattivati, carta (17 controlli)
