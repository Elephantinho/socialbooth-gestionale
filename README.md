# Gestionale Social Booth

Gestionale per eventi social booth / photobooth, con tre lati:

- **Admin** – vede e controlla tutto (web)
- **Project** – crea gli eventi e li assegna agli operatori (web)
- **Operatore** – riceve gli incarichi, fa check-in e registra le ore (app Android)

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui, Framer Motion
- Supabase (database Postgres, login, file, tempo reale)
- Capacitor (app Android)

## Database

Le migrazioni sono in `supabase/migrations/`, in ordine numerico.

Regole principali:
- **Assegnazione automatica**: se in una regione c'è un solo operatore libero, l'evento gli viene proposto in automatico; altrimenti sceglie il project.
- **Compenso a ore**: ore in location + tempo di viaggio dal magazzino, moltiplicate per la tariffa oraria dell'operatore.
- **Sicurezza**: ogni ruolo vede solo i propri dati (Row Level Security di Postgres).
