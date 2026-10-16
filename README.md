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

| Ruolo | Vede | Panoramica |
|---|---|---|
| **Admin** | Tutto | Tutto |
| **Project** | Solo i suoi eventi: calendario, attività, operatori, ricavi e costi dei suoi eventi. Archivio: eventi passati, clienti, location | Da assegnare, carta dei suoi operatori, chi lavora oggi, i conti dei suoi eventi |
| **Gestore operatori** | Tutta l'operatività: tutti gli eventi (modifica orari, luogo, magazzino), operatori, magazzini, location, carta. Niente soldi | Da assegnare, operatori da approvare, carta, zone scoperte, mappa |
| **Amministrazione** | Conti: costi e compensi, previsione, regioni, carte, tariffe, fatture. Eventi in lettura (cambia solo prezzo e fattura) | Chiusure da approvare, da fatturare, da incassare, conti |
| **Operatore** | App sul telefono (a chiamata: pagato a ore per evento) | — |

Menu: **Lavoro** (Panoramica, Eventi in programma, Calendario, Attività) · **Squadra** · **Conti** ·
**Archivio** (Eventi passati, Clienti, Location) · **Sistema**. Ognuno vede solo le voci del suo ruolo.

I permessi stanno in un posto solo per lato: `src/modules/auth/permessi.tsx` (menu e pulsanti) e
le funzioni `e_gestione()`, `vede_tutti_eventi()`, `gestisce_operatori()`, `amministra()` nel database (migrazione 0015).

- **Operatori**: si registrano da soli dalla pagina `/registrati` (nome, telefono, regioni in cui lavorano).
  Nascono *non attivi*: admin o gestore operatori li approvano dalla pagina **Operatori**.
- **Gli altri ruoli**: la persona si registra, poi l'admin cambia il ruolo da **Utenti e ruoli**.

**Importante per la registrazione**: in Supabase, *Authentication → URL Configuration*, imposta come
*Site URL* l'indirizzo dell'app pubblicata (es. `https://socialbooth-gestionale.vercel.app`) e aggiungilo
anche tra i *Redirect URLs*. Così il link di conferma email riporta all'app.

## Funzionalità

**Operatore (telefono)**
- Home: prossimo evento, incarichi da accettare, carta rimasta, invito ad attivare le **notifiche sul telefono**
- Scheda evento: tappe con **ore automatiche**, programma, ZTL e meteo, mappa con parcheggi e servizi (si apre a richiesta),
  referente, **montaggio**: checklist dell'attrezzatura salvata e **foto del set** che arriva subito al project
- Spese con foto dello scontrino, stampe a fine evento, le mie ore con **riepilogo mensile in PDF**
- Calendario, giorni di indisponibilità, profilo con foto, regioni e notifiche

**Ufficio (web, ogni ruolo vede solo il suo)**
- Panoramica corta: cosa decidere, carta da mandare, chi lavora oggi, prossimi 7 giorni, conti del mese in breve
- Eventi in programma (elenco o **mappa**), con **brief incollato che compila il modulo**; eventi passati in Archivio
  con ricerca, da fatturare, da incassare ed **export per il commercialista**
- Assegnazione automatica e **operatore di riserva**: se uno rifiuta o non risponde, si propone il più vicino libero
- Operatori per regione, magazzini con attrezzatura che esce e rientra da sola, scorta di carta con avvisi
- Costi e compensi (approvazione), **Andamento**: com'è andata (mese, regione, operatori, clienti) e cosa arriva (previsione)
- Carte aziendali, clienti e location in Archivio, utenti e ruoli, impostazioni

**Notifiche sul telefono**: funzionano su Android (Chrome) anche senza installare nulla; su iPhone dopo
"Aggiungi a Home". Le manda la funzione `supabase/functions/invia-push` a ogni notifica nuova; le chiavi
stanno nella tabella `segreti` del database, mai nel codice.

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
    attrezzatura/       inventario dei magazzini e attrezzatura degli eventi (esce/rientra con le tappe)
    carta/              scorta di carta degli operatori, ricariche, avvisi
    luogo/              ZTL, parcheggi, servizi vicini, meteo
    comunicazione/      notifiche, chat dell'evento, documenti e foto
    attivita/           to-do e bacheca
  ruoli/                ← solo le schermate, che usano i moduli
    operatore/          app telefono
    gestione/           pannello web (admin, project, gestore operatori, amministrazione)
      panoramica/       la prima pagina, divisa in sezioni (DaFare, Adesso, MappaEventi, ContiDelMese…)
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
- **Magazzino automatico**: quando l'operatore registra "Parto dal magazzino" l'attrezzatura dell'evento risulta fuori (i consumabili si scalano), con "Rientrato" torna disponibile.
- **Carta**: le stampe dichiarate a fine evento scalano la scorta dell'operatore; sotto soglia (Impostazioni) o se non basta per i prossimi eventi diventa rossa e admin, gestori e project ricevono una notifica.
- **Previsione costi**: ogni nuovo evento riceve il costo previsto della carta (media stampe × costo per stampa); la pagina Previsione somma compensi, carta e costi previsti degli eventi futuri.
