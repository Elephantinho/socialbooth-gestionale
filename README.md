# Gestionale Social Booth

Gestionale per eventi social booth / photobooth, con tre lati:

- **Admin** – vede e controlla tutto (web, `/gestione`)
- **Project** – crea gli eventi e li assegna agli operatori (web, `/gestione`)
- **Operatore** – riceve gli incarichi, fa check-in e registra le ore (app telefono, `/operatore`)

## Avvio in locale

```bash
npm install
cp .env.example .env   # chiavi pubbliche del progetto Supabase
npm run dev            # apre su http://localhost:5173
```

### Utenti e ruoli

- **Operatori**: si registrano da soli dalla pagina `/registrati` (nome, telefono, regioni in cui lavorano).
  Nascono *non attivi*: un admin li approva dalla pagina **Operatori**, dove imposta anche tariffa oraria e magazzino.
- **Admin e project**: si creano dalla dashboard di Supabase (*Authentication → Users → Add user*, con *Auto Confirm User*),
  poi si assegna il ruolo da **SQL Editor**:

```sql
update profili set ruolo = 'project', nome = 'Nome Cognome'
 where id = (select id from auth.users where email = 'email@esempio.it');
```

**Importante per la registrazione**: in Supabase, *Authentication → URL Configuration*, imposta come
*Site URL* l'indirizzo dell'app pubblicata (es. `https://socialbooth-gestionale.vercel.app`) e aggiungilo
anche tra i *Redirect URLs*. Così il link di conferma email riporta all'app.

## Funzionalità

**Operatore (telefono)**
- Home: prossimo evento con orari di ritiro, allestimento e attivazione; incarichi da accettare/rifiutare; riepilogo del mese
- Scheda evento: programma, navigatore, avvisi accesso/ZTL/Wi‑Fi, referente (chiama/WhatsApp), checklist, check-in GPS
- Chiusura evento: orari precompilati, viaggio andata/ritorno, spese da rimborsare, nota obbligatoria se cambiano gli orari
- Calendario (in programma / passati) e giorni di indisponibilità
- Le mie ore: per mese, con compenso e stato di approvazione
- Profilo: nome, telefono, magazzino, regioni
- Aggiornamenti in tempo reale (nuove proposte, modifiche)

**Project / Admin (web)**
- Panoramica: eventi del mese, da assegnare, in attesa, chiusure da approvare, compensi, eventi per regione, zone scoperte
- Eventi: filtri per stato, assegnazione manuale; dettaglio con modifica, annullamento/riapertura, cambio operatore, storico proposte
- Nuovo evento: location salvate, **tempo di viaggio calcolato in automatico** dal magazzino, orario di ritiro suggerito
- Operatori: approvazione, tariffa, magazzino, regioni, attivazione
- Magazzini e Location salvate
- Ore e compensi: per mese e per operatore, approvazione, esportazione Excel (CSV)

## Stack

- React + TypeScript + Vite
- Tailwind CSS (tema in `src/index.css`), Framer Motion, icone Lucide
- TanStack Query per i dati, React Router per le pagine
- Supabase: database Postgres, login, sicurezza per ruolo
- OpenStreetMap (Nominatim + OSRM) per posizioni e tempi di viaggio
- Capacitor per l'app Android (prossima fase)

## Struttura del codice

```
src/
  modules/              ← la logica, divisa per funzionalità
    auth/               login, sessione, protezione delle pagine per ruolo
    eventi/             api.ts (letture/scritture), logic/ (regole pure), components/
    assegnazione/       scelta dell'operatore
    anagrafiche/        clienti, tipi di booth, magazzini, location, operatori, indisponibilità
    viaggio/            indirizzo → coordinate, tempi di percorrenza (OpenStreetMap)
  ruoli/                ← solo le schermate, che usano i moduli
    operatore/          app telefono
    gestione/           pannello web project/admin
  shared/               ← pezzi comuni
    ui/                 Pulsante, Card, Campo, stati di caricamento/vuoto/errore
    lib/                client Supabase, formattazione date e importi
    types/database.ts   tipi del database (generati da Supabase)
supabase/migrations/    ← schema del database, in ordine numerico
```

Regola: le pagine non chiamano mai Supabase direttamente, passano sempre dagli hook in `modules/*/api.ts`.
Le regole di calcolo (orari, ritiro dal magazzino, ore) stanno in `modules/*/logic/` e non dipendono da React.

## Regole principali del database

- **Assegnazione automatica**: quando un evento passa a *da assegnare*, se nella sua regione c'è un solo operatore libero (zona giusta, non indisponibile, senza eventi sovrapposti) gli viene proposto in automatico. Altrimenti sceglie il project. Se l'operatore rifiuta, l'evento torna da assegnare e lui viene escluso.
- **Compenso a ore**: (minuti in location + minuti di viaggio andata e ritorno) × tariffa oraria. La tariffa viene fotografata al momento della chiusura dell'evento.
- **Sicurezza**: ogni ruolo vede solo i propri dati (Row Level Security). L'operatore modifica gli eventi solo tramite le funzioni `rispondi_proposta`, `check_in`, `chiudi_evento`.
