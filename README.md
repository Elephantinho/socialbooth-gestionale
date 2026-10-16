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

### Creare gli utenti

Per ora gli account si creano dalla dashboard di Supabase:

1. **Authentication → Users → Add user → Create new user**, con email e password, spuntando *Auto Confirm User*.
2. Ogni nuovo utente nasce come **operatore**. Per cambiargli ruolo, nome, tariffa o regioni, da **SQL Editor**:

```sql
-- rendere qualcuno admin o project
update profili set ruolo = 'admin', nome = 'Mohamed' where id = (select id from auth.users where email = 'tua@email.it');

-- operatore: nome, tariffa oraria e regioni coperte
update profili set nome = 'Mario Rossi', tariffa_oraria = 12 where id = (select id from auth.users where email = 'mario@email.it');
insert into zone_operatore (operatore_id, regione) select id, 'Toscana' from auth.users where email = 'mario@email.it';
```

(Le schermate per gestire operatori e magazzini dall'app arrivano nella prossima fase.)

## Stack

- React + TypeScript + Vite
- Tailwind CSS (tema in `src/index.css`), Framer Motion, icone Lucide
- TanStack Query per i dati, React Router per le pagine
- Supabase: database Postgres, login, sicurezza per ruolo
- Capacitor per l'app Android (prossima fase)

## Struttura del codice

```
src/
  modules/              ← la logica, divisa per funzionalità
    auth/               login, sessione, protezione delle pagine per ruolo
    eventi/             api.ts (letture/scritture), logic/ (regole pure), components/
    assegnazione/       scelta dell'operatore
    anagrafiche/        clienti, tipi di booth, magazzini, location salvate
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
