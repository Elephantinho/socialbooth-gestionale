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
- Home: prossimo evento, incarichi da accettare, attività da fare, riepilogo del mese, notifiche
- Scheda evento: programma, **mappa con parcheggi** (gratuiti, strisce bianche, a pagamento), **ZTL rilevata**, **meteo**,
  servizi vicini (distributore, bar, ferramenta, supermercato), referente, checklist dell'attrezzatura assegnata,
  documenti e foto del set, chat con il project
- **Ore automatiche**: tasti "Parto dal magazzino → Arrivato → Finito → Rientrato" con ora e posizione;
  arrivo e rientro riconosciuti anche dal GPS con l'app aperta; viaggio e ore in location calcolati da soli
- Spese con foto dello scontrino, pagate con carta aziendale o anticipate; stampe effettuate
- Calendario, giorni di indisponibilità, le mie ore con grafico, profilo con foto e regioni

**Project / Admin (web)**
- Panoramica: cose da fare subito, mappa di eventi e magazzini, ricavi/costi degli ultimi 6 mesi,
  conti per regione, classifiche di operatori e clienti, zone scoperte
- Eventi: elenco, calendario mensile, creazione con location salvate, **viaggio calcolato**, **ZTL suggerita**,
  assegnazione automatica, modifica, annullamento, duplica, chat, documenti, attività, costi e margine
- Attività in bacheca a colonne (trascinabili), anche legate agli eventi e assegnate agli operatori
- Operatori per regione con scheda personale (eventi, archivio, compensi, margini); clienti con fatturato e insoluti
- Magazzini per regione con import da Excel e inventario; location salvate; carte aziendali
- Costi e compensi per regione e per operatore, approvazione (anche tutte insieme), export Excel
- Utenti e ruoli, impostazioni (costo per stampa, ore per accettare un incarico)
- Notifiche in-app in tempo reale

**Automatismi lato server (ogni 15 minuti)**
- Proposte non accettate in tempo → evento di nuovo da assegnare (e riassegnato se c'è un solo operatore libero)
- Promemoria all'operatore: il giorno prima, all'ora di partenza, e se non ha chiuso l'evento
- Eventi dimenticati aperti → chiusi con orari stimati e operatore avvisato

## Stack

- React + TypeScript + Vite
- Tailwind CSS (tema in `src/index.css`), Framer Motion, icone Lucide
- TanStack Query per i dati, React Router per le pagine
- Supabase: database Postgres, login, sicurezza per ruolo
- OpenStreetMap: Nominatim (indirizzi), OSRM (tempi di viaggio), Overpass (ZTL, parcheggi, servizi), mappe Leaflet
- Open-Meteo per il meteo, Recharts per i grafici
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
    costi/              costi previsti/finali, carte aziendali, calcolo del margine (logic/riepilogo.ts)
    attrezzatura/       inventario dei magazzini e attrezzatura degli eventi
    luogo/              ZTL, parcheggi, servizi vicini, meteo
    comunicazione/      notifiche, chat dell'evento, documenti e foto
    attivita/           to-do e bacheca
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
