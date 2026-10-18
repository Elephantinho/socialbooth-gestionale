// GENERATO da Supabase: non modificare a mano. Per rigenerarlo vedi README ("Tipi del database").
/* oxlint-disable */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accessi_come: {
        Row: {
          admin_id: string
          id: string
          il: string
          utente_id: string
        }
        Insert: {
          admin_id: string
          id?: string
          il?: string
          utente_id: string
        }
        Update: {
          admin_id?: string
          id?: string
          il?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessi_come_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessi_come_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_principali: {
        Row: {
          aggiunto_il: string
          utente_id: string
        }
        Insert: {
          aggiunto_il?: string
          utente_id: string
        }
        Update: {
          aggiunto_il?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_principali_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: true
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      allegati: {
        Row: {
          caricato_da: string | null
          creato_il: string
          dimensione: number | null
          evento_id: string
          id: string
          nome: string
          percorso: string
          tipo: string | null
        }
        Insert: {
          caricato_da?: string | null
          creato_il?: string
          dimensione?: number | null
          evento_id: string
          id?: string
          nome: string
          percorso: string
          tipo?: string | null
        }
        Update: {
          caricato_da?: string | null
          creato_il?: string
          dimensione?: number | null
          evento_id?: string
          id?: string
          nome?: string
          percorso?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allegati_caricato_da_fkey"
            columns: ["caricato_da"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allegati_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      articoli: {
        Row: {
          aggiornato_il: string
          categoria: string
          codice: string | null
          creato_il: string
          id: string
          in_uso: number
          magazzino_id: string
          nome: string
          note: string | null
          quantita: number
          stato: Database["public"]["Enums"]["stato_articolo"]
        }
        Insert: {
          aggiornato_il?: string
          categoria?: string
          codice?: string | null
          creato_il?: string
          id?: string
          in_uso?: number
          magazzino_id: string
          nome: string
          note?: string | null
          quantita?: number
          stato?: Database["public"]["Enums"]["stato_articolo"]
        }
        Update: {
          aggiornato_il?: string
          categoria?: string
          codice?: string | null
          creato_il?: string
          id?: string
          in_uso?: number
          magazzino_id?: string
          nome?: string
          note?: string | null
          quantita?: number
          stato?: Database["public"]["Enums"]["stato_articolo"]
        }
        Relationships: [
          {
            foreignKeyName: "articoli_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita: {
        Row: {
          assegnato_a: string | null
          completata_il: string | null
          creato_da: string | null
          creato_il: string
          descrizione: string | null
          evento_id: string | null
          id: string
          priorita: Database["public"]["Enums"]["priorita"]
          scadenza: string | null
          stato: Database["public"]["Enums"]["stato_attivita"]
          titolo: string
        }
        Insert: {
          assegnato_a?: string | null
          completata_il?: string | null
          creato_da?: string | null
          creato_il?: string
          descrizione?: string | null
          evento_id?: string | null
          id?: string
          priorita?: Database["public"]["Enums"]["priorita"]
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["stato_attivita"]
          titolo: string
        }
        Update: {
          assegnato_a?: string | null
          completata_il?: string | null
          creato_da?: string | null
          creato_il?: string
          descrizione?: string | null
          evento_id?: string | null
          id?: string
          priorita?: Database["public"]["Enums"]["priorita"]
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["stato_attivita"]
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "attivita_assegnato_a_fkey"
            columns: ["assegnato_a"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      attrezzatura_evento: {
        Row: {
          articolo_id: string
          evento_id: string
          prelevato_il: string | null
          quantita: number
          rientrato_il: string | null
        }
        Insert: {
          articolo_id: string
          evento_id: string
          prelevato_il?: string | null
          quantita?: number
          rientrato_il?: string | null
        }
        Update: {
          articolo_id?: string
          evento_id?: string
          prelevato_il?: string | null
          quantita?: number
          rientrato_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attrezzatura_evento_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attrezzatura_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      carte_aziendali: {
        Row: {
          attiva: boolean
          circuito: string | null
          creato_il: string
          id: string
          nome: string
          note: string | null
          operatore_id: string | null
          ultime_cifre: string
        }
        Insert: {
          attiva?: boolean
          circuito?: string | null
          creato_il?: string
          id?: string
          nome: string
          note?: string | null
          operatore_id?: string | null
          ultime_cifre: string
        }
        Update: {
          attiva?: boolean
          circuito?: string | null
          creato_il?: string
          id?: string
          nome?: string
          note?: string | null
          operatore_id?: string | null
          ultime_cifre?: string
        }
        Relationships: [
          {
            foreignKeyName: "carte_aziendali_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_letture: {
        Row: {
          canale: string
          letto_il: string
          utente_id: string
        }
        Insert: {
          canale: string
          letto_il?: string
          utente_id?: string
        }
        Update: {
          canale?: string
          letto_il?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_letture_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messaggi: {
        Row: {
          autore_id: string
          canale: string
          creato_il: string
          id: string
          testo: string
        }
        Insert: {
          autore_id?: string
          canale: string
          creato_il?: string
          id?: string
          testo: string
        }
        Update: {
          autore_id?: string
          canale?: string
          creato_il?: string
          id?: string
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messaggi_autore_id_fkey"
            columns: ["autore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      clienti: {
        Row: {
          aggiornato_il: string
          cap: string | null
          citta: string | null
          codice_fiscale: string | null
          codice_sdi: string | null
          creato_il: string
          email: string | null
          id: string
          indirizzo: string | null
          nome: string
          note: string | null
          partita_iva: string | null
          pec: string | null
          project_id: string | null
          provincia: string | null
          telefono: string | null
          tipo: string
        }
        Insert: {
          aggiornato_il?: string
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          codice_sdi?: string | null
          creato_il?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          note?: string | null
          partita_iva?: string | null
          pec?: string | null
          project_id?: string | null
          provincia?: string | null
          telefono?: string | null
          tipo?: string
        }
        Update: {
          aggiornato_il?: string
          cap?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          codice_sdi?: string | null
          creato_il?: string
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          note?: string | null
          partita_iva?: string | null
          pec?: string | null
          project_id?: string | null
          provincia?: string | null
          telefono?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "clienti_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      conti_evento: {
        Row: {
          aggiornato_il: string
          evento_id: string
          fattura_data: string | null
          fattura_importo: number | null
          fattura_numero: string | null
          incassata: boolean
          incassata_il: string | null
          prezzo: number | null
        }
        Insert: {
          aggiornato_il?: string
          evento_id: string
          fattura_data?: string | null
          fattura_importo?: number | null
          fattura_numero?: string | null
          incassata?: boolean
          incassata_il?: string | null
          prezzo?: number | null
        }
        Update: {
          aggiornato_il?: string
          evento_id?: string
          fattura_data?: string | null
          fattura_importo?: number | null
          fattura_numero?: string | null
          incassata?: boolean
          incassata_il?: string | null
          prezzo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conti_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: true
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      costi_evento: {
        Row: {
          carta_id: string | null
          categoria: Database["public"]["Enums"]["categoria_costo"]
          costo_unitario: number
          creato_da: string | null
          creato_il: string
          descrizione: string | null
          evento_id: string
          fase: Database["public"]["Enums"]["fase_costo"]
          id: string
          importo: number | null
          operatore_id: string | null
          pagato_con: Database["public"]["Enums"]["pagamento"]
          quantita: number
          scontrino: string | null
          stampe: number | null
          stato: Database["public"]["Enums"]["stato_approvazione"]
        }
        Insert: {
          carta_id?: string | null
          categoria: Database["public"]["Enums"]["categoria_costo"]
          costo_unitario: number
          creato_da?: string | null
          creato_il?: string
          descrizione?: string | null
          evento_id: string
          fase: Database["public"]["Enums"]["fase_costo"]
          id?: string
          importo?: number | null
          operatore_id?: string | null
          pagato_con?: Database["public"]["Enums"]["pagamento"]
          quantita?: number
          scontrino?: string | null
          stampe?: number | null
          stato?: Database["public"]["Enums"]["stato_approvazione"]
        }
        Update: {
          carta_id?: string | null
          categoria?: Database["public"]["Enums"]["categoria_costo"]
          costo_unitario?: number
          creato_da?: string | null
          creato_il?: string
          descrizione?: string | null
          evento_id?: string
          fase?: Database["public"]["Enums"]["fase_costo"]
          id?: string
          importo?: number | null
          operatore_id?: string | null
          pagato_con?: Database["public"]["Enums"]["pagamento"]
          quantita?: number
          scontrino?: string | null
          stampe?: number | null
          stato?: Database["public"]["Enums"]["stato_approvazione"]
        }
        Relationships: [
          {
            foreignKeyName: "costi_evento_carta_id_fkey"
            columns: ["carta_id"]
            isOneToOne: false
            referencedRelation: "carte_aziendali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costi_evento_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costi_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costi_evento_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivi_push: {
        Row: {
          auth: string
          creato_il: string
          descrizione: string | null
          endpoint: string
          id: string
          p256dh: string
          utente_id: string
        }
        Insert: {
          auth: string
          creato_il?: string
          descrizione?: string | null
          endpoint: string
          id?: string
          p256dh: string
          utente_id?: string
        }
        Update: {
          auth?: string
          creato_il?: string
          descrizione?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivi_push_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi: {
        Row: {
          aggiornato_il: string
          allestimento_il: string
          avvisi_ritardo: string[]
          citta: string
          cliente_id: string | null
          codice: number
          creato_il: string
          fattura_data: string | null
          fattura_importo: number | null
          fattura_numero: string | null
          fattura_pagata: boolean
          fine_attivazione: string
          hostess: boolean
          id: string
          indirizzo: string
          inizio_attivazione: string
          lat: number | null
          lng: number | null
          location_id: string | null
          magazzino_id: string | null
          nome: string | null
          note: string | null
          note_accesso: string | null
          operatore_id: string | null
          outfit: string | null
          prezzo_cliente: number | null
          project_id: string
          promemoria_ore_inviato: boolean
          referente_nome: string | null
          referente_telefono: string | null
          regione: Database["public"]["Enums"]["regione"]
          ritiro_magazzino_il: string | null
          smontaggio_il: string
          stampe_effettuate: number | null
          stato: Database["public"]["Enums"]["stato_evento"]
          tipo_booth_id: string | null
          ultimo_passaggio: Database["public"]["Enums"]["passaggio"] | null
          viaggio_minuti: number | null
          wifi: boolean
          ztl: boolean
        }
        Insert: {
          aggiornato_il?: string
          allestimento_il: string
          avvisi_ritardo?: string[]
          citta: string
          cliente_id?: string | null
          codice?: number
          creato_il?: string
          fattura_data?: string | null
          fattura_importo?: number | null
          fattura_numero?: string | null
          fattura_pagata?: boolean
          fine_attivazione: string
          hostess?: boolean
          id?: string
          indirizzo: string
          inizio_attivazione: string
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          magazzino_id?: string | null
          nome?: string | null
          note?: string | null
          note_accesso?: string | null
          operatore_id?: string | null
          outfit?: string | null
          prezzo_cliente?: number | null
          project_id: string
          promemoria_ore_inviato?: boolean
          referente_nome?: string | null
          referente_telefono?: string | null
          regione: Database["public"]["Enums"]["regione"]
          ritiro_magazzino_il?: string | null
          smontaggio_il: string
          stampe_effettuate?: number | null
          stato?: Database["public"]["Enums"]["stato_evento"]
          tipo_booth_id?: string | null
          ultimo_passaggio?: Database["public"]["Enums"]["passaggio"] | null
          viaggio_minuti?: number | null
          wifi?: boolean
          ztl?: boolean
        }
        Update: {
          aggiornato_il?: string
          allestimento_il?: string
          avvisi_ritardo?: string[]
          citta?: string
          cliente_id?: string | null
          codice?: number
          creato_il?: string
          fattura_data?: string | null
          fattura_importo?: number | null
          fattura_numero?: string | null
          fattura_pagata?: boolean
          fine_attivazione?: string
          hostess?: boolean
          id?: string
          indirizzo?: string
          inizio_attivazione?: string
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          magazzino_id?: string | null
          nome?: string | null
          note?: string | null
          note_accesso?: string | null
          operatore_id?: string | null
          outfit?: string | null
          prezzo_cliente?: number | null
          project_id?: string
          promemoria_ore_inviato?: boolean
          referente_nome?: string | null
          referente_telefono?: string | null
          regione?: Database["public"]["Enums"]["regione"]
          ritiro_magazzino_il?: string | null
          smontaggio_il?: string
          stampe_effettuate?: number | null
          stato?: Database["public"]["Enums"]["stato_evento"]
          tipo_booth_id?: string | null
          ultimo_passaggio?: Database["public"]["Enums"]["passaggio"] | null
          viaggio_minuti?: number | null
          wifi?: boolean
          ztl?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "eventi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_tipo_booth_id_fkey"
            columns: ["tipo_booth_id"]
            isOneToOne: false
            referencedRelation: "tipi_booth"
            referencedColumns: ["id"]
          },
        ]
      }
      impostazioni: {
        Row: {
          chiave: string
          descrizione: string | null
          valore: number | null
        }
        Insert: {
          chiave: string
          descrizione?: string | null
          valore?: number | null
        }
        Update: {
          chiave?: string
          descrizione?: string | null
          valore?: number | null
        }
        Relationships: []
      }
      indisponibilita: {
        Row: {
          al: string
          dal: string
          id: string
          motivo: string | null
          operatore_id: string
        }
        Insert: {
          al: string
          dal: string
          id?: string
          motivo?: string | null
          operatore_id: string
        }
        Update: {
          al?: string
          dal?: string
          id?: string
          motivo?: string | null
          operatore_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indisponibilita_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      location: {
        Row: {
          citta: string
          creato_il: string
          foto_ingresso: string | null
          id: string
          indirizzo: string
          lat: number | null
          lng: number | null
          nome: string | null
          note_accesso: string | null
          regione: Database["public"]["Enums"]["regione"]
          wifi: boolean | null
          ztl: boolean | null
        }
        Insert: {
          citta: string
          creato_il?: string
          foto_ingresso?: string | null
          id?: string
          indirizzo: string
          lat?: number | null
          lng?: number | null
          nome?: string | null
          note_accesso?: string | null
          regione: Database["public"]["Enums"]["regione"]
          wifi?: boolean | null
          ztl?: boolean | null
        }
        Update: {
          citta?: string
          creato_il?: string
          foto_ingresso?: string | null
          id?: string
          indirizzo?: string
          lat?: number | null
          lng?: number | null
          nome?: string | null
          note_accesso?: string | null
          regione?: Database["public"]["Enums"]["regione"]
          wifi?: boolean | null
          ztl?: boolean | null
        }
        Relationships: []
      }
      magazzini: {
        Row: {
          aggiornato_il: string
          attivo: boolean
          carta_minima: number
          carta_stampe: number
          citta: string
          creato_il: string
          id: string
          indirizzo: string
          lat: number | null
          lng: number | null
          nome: string
          note: string | null
          regione: Database["public"]["Enums"]["regione"]
          responsabile_id: string | null
        }
        Insert: {
          aggiornato_il?: string
          attivo?: boolean
          carta_minima?: number
          carta_stampe?: number
          citta: string
          creato_il?: string
          id?: string
          indirizzo: string
          lat?: number | null
          lng?: number | null
          nome: string
          note?: string | null
          regione: Database["public"]["Enums"]["regione"]
          responsabile_id?: string | null
        }
        Update: {
          aggiornato_il?: string
          attivo?: boolean
          carta_minima?: number
          carta_stampe?: number
          citta?: string
          creato_il?: string
          id?: string
          indirizzo?: string
          lat?: number | null
          lng?: number | null
          nome?: string
          note?: string | null
          regione?: Database["public"]["Enums"]["regione"]
          responsabile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magazzini_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      messaggi: {
        Row: {
          autore_id: string
          creato_il: string
          evento_id: string
          id: string
          testo: string
        }
        Insert: {
          autore_id?: string
          creato_il?: string
          evento_id: string
          id?: string
          testo: string
        }
        Update: {
          autore_id?: string
          creato_il?: string
          evento_id?: string
          id?: string
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaggi_autore_id_fkey"
            columns: ["autore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaggi_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      montaggio: {
        Row: {
          aggiornato_il: string
          completato_il: string | null
          evento_id: string
          voci_fatte: string[]
        }
        Insert: {
          aggiornato_il?: string
          completato_il?: string | null
          evento_id: string
          voci_fatte?: string[]
        }
        Update: {
          aggiornato_il?: string
          completato_il?: string | null
          evento_id?: string
          voci_fatte?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "montaggio_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: true
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      movimenti_carta: {
        Row: {
          creato_il: string
          evento_id: string | null
          fatto_da: string | null
          id: string
          note: string | null
          operatore_id: string
          stampe: number
          tipo: string
        }
        Insert: {
          creato_il?: string
          evento_id?: string | null
          fatto_da?: string | null
          id?: string
          note?: string | null
          operatore_id: string
          stampe: number
          tipo: string
        }
        Update: {
          creato_il?: string
          evento_id?: string | null
          fatto_da?: string | null
          id?: string
          note?: string | null
          operatore_id?: string
          stampe?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_carta_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_carta_fatto_da_fkey"
            columns: ["fatto_da"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_carta_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      notifiche: {
        Row: {
          creata_il: string
          id: string
          letta: boolean
          link: string | null
          testo: string | null
          titolo: string
          utente_id: string
        }
        Insert: {
          creata_il?: string
          id?: string
          letta?: boolean
          link?: string | null
          testo?: string | null
          titolo: string
          utente_id: string
        }
        Update: {
          creata_il?: string
          id?: string
          letta?: boolean
          link?: string | null
          testo?: string | null
          titolo?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifiche_utente_id_fkey"
            columns: ["utente_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      ore_lavorate: {
        Row: {
          approvato_da: string | null
          approvato_il: string | null
          calcolo_automatico: boolean
          check_in_foto: string | null
          check_in_il: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_il: string | null
          compenso: number | null
          creato_il: string
          evento_id: string
          fine_il: string | null
          id: string
          minuti_in_location: number
          minuti_totali: number | null
          minuti_viaggio: number
          nota_operatore: string | null
          operatore_id: string
          partenza_il: string | null
          partenza_lat: number | null
          partenza_lng: number | null
          rientro_il: string | null
          rientro_lat: number | null
          rientro_lng: number | null
          stato: Database["public"]["Enums"]["stato_approvazione"]
          tariffa_oraria: number | null
        }
        Insert: {
          approvato_da?: string | null
          approvato_il?: string | null
          calcolo_automatico?: boolean
          check_in_foto?: string | null
          check_in_il?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_il?: string | null
          compenso?: number | null
          creato_il?: string
          evento_id: string
          fine_il?: string | null
          id?: string
          minuti_in_location?: number
          minuti_totali?: number | null
          minuti_viaggio?: number
          nota_operatore?: string | null
          operatore_id: string
          partenza_il?: string | null
          partenza_lat?: number | null
          partenza_lng?: number | null
          rientro_il?: string | null
          rientro_lat?: number | null
          rientro_lng?: number | null
          stato?: Database["public"]["Enums"]["stato_approvazione"]
          tariffa_oraria?: number | null
        }
        Update: {
          approvato_da?: string | null
          approvato_il?: string | null
          calcolo_automatico?: boolean
          check_in_foto?: string | null
          check_in_il?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_il?: string | null
          compenso?: number | null
          creato_il?: string
          evento_id?: string
          fine_il?: string | null
          id?: string
          minuti_in_location?: number
          minuti_totali?: number | null
          minuti_viaggio?: number
          nota_operatore?: string | null
          operatore_id?: string
          partenza_il?: string | null
          partenza_lat?: number | null
          partenza_lng?: number | null
          rientro_il?: string | null
          rientro_lat?: number | null
          rientro_lng?: number | null
          stato?: Database["public"]["Enums"]["stato_approvazione"]
          tariffa_oraria?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ore_lavorate_approvato_da_fkey"
            columns: ["approvato_da"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ore_lavorate_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ore_lavorate_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamenti_carte: {
        Row: {
          carta_ultime: string | null
          citta: string | null
          creato_il: string
          esercente: string | null
          evento_id: string | null
          id: string
          importo: number
          mcc: string | null
          motivo: string | null
          operatore_id: string | null
          pagato_il: string
          ricevute: string[]
          rif_esterno: string
          spesa_id: string | null
          stato: string
          titolare: string | null
          valuta: string
        }
        Insert: {
          carta_ultime?: string | null
          citta?: string | null
          creato_il?: string
          esercente?: string | null
          evento_id?: string | null
          id?: string
          importo: number
          mcc?: string | null
          motivo?: string | null
          operatore_id?: string | null
          pagato_il: string
          ricevute?: string[]
          rif_esterno: string
          spesa_id?: string | null
          stato?: string
          titolare?: string | null
          valuta?: string
        }
        Update: {
          carta_ultime?: string | null
          citta?: string | null
          creato_il?: string
          esercente?: string | null
          evento_id?: string | null
          id?: string
          importo?: number
          mcc?: string | null
          motivo?: string | null
          operatore_id?: string | null
          pagato_il?: string
          ricevute?: string[]
          rif_esterno?: string
          spesa_id?: string | null
          stato?: string
          titolare?: string | null
          valuta?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamenti_carte_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_carte_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamenti_carte_spesa_id_fkey"
            columns: ["spesa_id"]
            isOneToOne: false
            referencedRelation: "spese_evento"
            referencedColumns: ["id"]
          },
        ]
      }
      passaggi_evento: {
        Row: {
          annullato_il: string | null
          evento_id: string
          fatto_il: string
          id: string
          operatore_id: string
          passaggio: Database["public"]["Enums"]["passaggio"]
        }
        Insert: {
          annullato_il?: string | null
          evento_id: string
          fatto_il?: string
          id?: string
          operatore_id: string
          passaggio: Database["public"]["Enums"]["passaggio"]
        }
        Update: {
          annullato_il?: string | null
          evento_id?: string
          fatto_il?: string
          id?: string
          operatore_id?: string
          passaggio?: Database["public"]["Enums"]["passaggio"]
        }
        Relationships: [
          {
            foreignKeyName: "passaggi_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passaggi_evento_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      profili: {
        Row: {
          attivo: boolean
          carta_aggiornata_il: string | null
          carta_disponibile: number
          cognome: string
          creato_il: string
          foto: string | null
          id: string
          magazzino_id: string | null
          nome: string
          ruolo: Database["public"]["Enums"]["ruolo"]
          tariffa_oraria: number | null
          telefono: string | null
          visto_il: string | null
        }
        Insert: {
          attivo?: boolean
          carta_aggiornata_il?: string | null
          carta_disponibile?: number
          cognome?: string
          creato_il?: string
          foto?: string | null
          id: string
          magazzino_id?: string | null
          nome?: string
          ruolo?: Database["public"]["Enums"]["ruolo"]
          tariffa_oraria?: number | null
          telefono?: string | null
          visto_il?: string | null
        }
        Update: {
          attivo?: boolean
          carta_aggiornata_il?: string | null
          carta_disponibile?: number
          cognome?: string
          creato_il?: string
          foto?: string | null
          id?: string
          magazzino_id?: string | null
          nome?: string
          ruolo?: Database["public"]["Enums"]["ruolo"]
          tariffa_oraria?: number | null
          telefono?: string | null
          visto_il?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profili_magazzino_fk"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
        ]
      }
      proposte: {
        Row: {
          automatica: boolean
          creato_il: string
          evento_id: string
          id: string
          operatore_id: string
          risposta_il: string | null
          scade_il: string | null
          stato: Database["public"]["Enums"]["stato_proposta"]
        }
        Insert: {
          automatica?: boolean
          creato_il?: string
          evento_id: string
          id?: string
          operatore_id: string
          risposta_il?: string | null
          scade_il?: string | null
          stato?: Database["public"]["Enums"]["stato_proposta"]
        }
        Update: {
          automatica?: boolean
          creato_il?: string
          evento_id?: string
          id?: string
          operatore_id?: string
          risposta_il?: string | null
          scade_il?: string | null
          stato?: Database["public"]["Enums"]["stato_proposta"]
        }
        Relationships: [
          {
            foreignKeyName: "proposte_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposte_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      richieste: {
        Row: {
          carta_registrata_il: string | null
          chiuso_il: string | null
          creato_il: string
          da_id: string
          dettagli: string | null
          evento_id: string | null
          id: string
          magazzino_id: string | null
          nota_chiusura: string | null
          operatore_id: string | null
          per_ruolo: Database["public"]["Enums"]["ruolo"] | null
          per_utente: string | null
          preso_da: string | null
          quantita: number | null
          scadenza: string | null
          stato: string
          tipo: string
          titolo: string
        }
        Insert: {
          carta_registrata_il?: string | null
          chiuso_il?: string | null
          creato_il?: string
          da_id?: string
          dettagli?: string | null
          evento_id?: string | null
          id?: string
          magazzino_id?: string | null
          nota_chiusura?: string | null
          operatore_id?: string | null
          per_ruolo?: Database["public"]["Enums"]["ruolo"] | null
          per_utente?: string | null
          preso_da?: string | null
          quantita?: number | null
          scadenza?: string | null
          stato?: string
          tipo: string
          titolo: string
        }
        Update: {
          carta_registrata_il?: string | null
          chiuso_il?: string | null
          creato_il?: string
          da_id?: string
          dettagli?: string | null
          evento_id?: string | null
          id?: string
          magazzino_id?: string | null
          nota_chiusura?: string | null
          operatore_id?: string | null
          per_ruolo?: Database["public"]["Enums"]["ruolo"] | null
          per_utente?: string | null
          preso_da?: string | null
          quantita?: number | null
          scadenza?: string | null
          stato?: string
          tipo?: string
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "richieste_da_id_fkey"
            columns: ["da_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richieste_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richieste_magazzino_id_fkey"
            columns: ["magazzino_id"]
            isOneToOne: false
            referencedRelation: "magazzini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richieste_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richieste_per_utente_fkey"
            columns: ["per_utente"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "richieste_preso_da_fkey"
            columns: ["preso_da"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      segreti: {
        Row: {
          chiave: string
          valore: string
        }
        Insert: {
          chiave: string
          valore: string
        }
        Update: {
          chiave?: string
          valore?: string
        }
        Relationships: []
      }
      spese: {
        Row: {
          creato_il: string
          descrizione: string | null
          evento_id: string
          id: string
          importo: number
          operatore_id: string
          scontrino: string | null
          stato: Database["public"]["Enums"]["stato_approvazione"]
          tipo: string
        }
        Insert: {
          creato_il?: string
          descrizione?: string | null
          evento_id: string
          id?: string
          importo: number
          operatore_id: string
          scontrino?: string | null
          stato?: Database["public"]["Enums"]["stato_approvazione"]
          tipo: string
        }
        Update: {
          creato_il?: string
          descrizione?: string | null
          evento_id?: string
          id?: string
          importo?: number
          operatore_id?: string
          scontrino?: string | null
          stato?: Database["public"]["Enums"]["stato_approvazione"]
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "spese_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spese_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
      spese_evento: {
        Row: {
          creato_da: string
          creato_il: string
          descrizione: string | null
          evento_id: string
          fonte: string
          id: string
          importo: number
          operatore_id: string | null
          pagamento_id: string | null
          pagata_con: Database["public"]["Enums"]["pagata_con"]
          rimborsata_il: string | null
          scontrino: string | null
          voce: Database["public"]["Enums"]["voce_spesa"]
        }
        Insert: {
          creato_da?: string
          creato_il?: string
          descrizione?: string | null
          evento_id: string
          fonte?: string
          id?: string
          importo: number
          operatore_id?: string | null
          pagamento_id?: string | null
          pagata_con?: Database["public"]["Enums"]["pagata_con"]
          rimborsata_il?: string | null
          scontrino?: string | null
          voce: Database["public"]["Enums"]["voce_spesa"]
        }
        Update: {
          creato_da?: string
          creato_il?: string
          descrizione?: string | null
          evento_id?: string
          fonte?: string
          id?: string
          importo?: number
          operatore_id?: string | null
          pagamento_id?: string | null
          pagata_con?: Database["public"]["Enums"]["pagata_con"]
          rimborsata_il?: string | null
          scontrino?: string | null
          voce?: Database["public"]["Enums"]["voce_spesa"]
        }
        Relationships: [
          {
            foreignKeyName: "spese_evento_creato_da_fkey"
            columns: ["creato_da"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spese_evento_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spese_evento_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spese_evento_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: true
            referencedRelation: "pagamenti_carte"
            referencedColumns: ["id"]
          },
        ]
      }
      tipi_booth: {
        Row: {
          id: string
          linea: string
          nome: string
          ordine: number
          stampa: boolean
        }
        Insert: {
          id?: string
          linea?: string
          nome: string
          ordine?: number
          stampa?: boolean
        }
        Update: {
          id?: string
          linea?: string
          nome?: string
          ordine?: number
          stampa?: boolean
        }
        Relationships: []
      }
      zone_operatore: {
        Row: {
          operatore_id: string
          regione: Database["public"]["Enums"]["regione"]
        }
        Insert: {
          operatore_id: string
          regione: Database["public"]["Enums"]["regione"]
        }
        Update: {
          operatore_id?: string
          regione?: Database["public"]["Enums"]["regione"]
        }
        Relationships: [
          {
            foreignKeyName: "zone_operatore_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      riepilogo_mensile: {
        Row: {
          compenso: number | null
          eventi: number | null
          mese: string | null
          minuti_in_location: number | null
          minuti_totali: number | null
          minuti_viaggio: number | null
          operatore_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ore_lavorate_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "profili"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _chiudi_da_tappe: {
        Args: { p_evento: string; p_nota?: string }
        Returns: undefined
      }
      _muovi_carta: {
        Args: {
          p_delta: number
          p_evento: string
          p_note: string
          p_nuova: number
          p_operatore: string
          p_tipo: string
        }
        Returns: undefined
      }
      _operatori_disponibili: {
        Args: { p_evento: string }
        Returns: {
          attivo: boolean
          carta_aggiornata_il: string | null
          carta_disponibile: number
          cognome: string
          creato_il: string
          foto: string | null
          id: string
          magazzino_id: string | null
          nome: string
          ruolo: Database["public"]["Enums"]["ruolo"]
          tariffa_oraria: number | null
          telefono: string | null
          visto_il: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profili"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      _registra_pagamento: {
        Args: { p_evento: string; p_operatore: string; p_pagamento: string }
        Returns: undefined
      }
      abbina_a_mano: {
        Args: { p_evento: string; p_pagamento: string }
        Returns: undefined
      }
      abbina_pagamento: { Args: { p_pagamento: string }; Returns: undefined }
      accesso_percorso_evento: {
        Args: { p_gestione?: boolean; p_nome: string }
        Returns: boolean
      }
      carica_carta: {
        Args: { p_magazzino: string; p_stampe: number }
        Returns: number
      }
      allega_scontrino: {
        Args: { p_percorso: string; p_spesa: string }
        Returns: undefined
      }
      amministra: { Args: never; Returns: boolean }
      annulla_passaggio: { Args: { p_evento: string }; Returns: undefined }
      assegna_automaticamente: { Args: { p_evento: string }; Returns: string }
      avvisa_ufficio: {
        Args: { p_evento: string; p_titolo: string }
        Returns: undefined
      }
      chat_non_letti: {
        Args: never
        Returns: {
          canale: string
          non_letti: number
          ultimo: string
        }[]
      }
      check_in: {
        Args: {
          p_evento: string
          p_foto?: string
          p_lat: number
          p_lng: number
        }
        Returns: undefined
      }
      chiave_push: { Args: never; Returns: string }
      chiudi_evento: {
        Args: {
          p_evento: string
          p_minuti_location: number
          p_minuti_viaggio: number
          p_nota?: string
        }
        Returns: undefined
      }
      concludi_evento: { Args: { p_evento: string }; Returns: undefined }
      controlla_ritardi: { Args: never; Returns: undefined }
      controlla_scadenze: { Args: never; Returns: undefined }
      costo_per_stampa: { Args: never; Returns: number }
      descrivi_evento: { Args: { p_evento: string }; Returns: string }
      e_gestione: { Args: never; Returns: boolean }
      etichetta_passaggio: {
        Args: { p: Database["public"]["Enums"]["passaggio"] }
        Returns: string
      }
      gestisce_operatori: { Args: never; Returns: boolean }
      gestisco_evento: { Args: { p_evento: string }; Returns: boolean }
      ignora_pagamento: { Args: { p_pagamento: string }; Returns: undefined }
      invia_ricarica_carta: {
        Args: { p_note?: string; p_operatore: string; p_stampe: number }
        Returns: undefined
      }
      lavoro_evento: { Args: { p_evento: string }; Returns: boolean }
      media_stampe_per_evento: { Args: never; Returns: number }
      mio_ruolo: { Args: never; Returns: Database["public"]["Enums"]["ruolo"] }
      notifica: {
        Args: {
          p_link: string
          p_testo: string
          p_titolo: string
          p_utente: string
        }
        Returns: undefined
      }
      operatori_disponibili: {
        Args: { p_evento: string }
        Returns: {
          attivo: boolean
          carta_aggiornata_il: string | null
          carta_disponibile: number
          cognome: string
          creato_il: string
          foto: string | null
          id: string
          magazzino_id: string | null
          nome: string
          ruolo: Database["public"]["Enums"]["ruolo"]
          tariffa_oraria: number | null
          telefono: string | null
          visto_il: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profili"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ore_scadenza: { Args: never; Returns: string }
      persone_squadra: {
        Args: never
        Returns: {
          cognome: string
          foto: string
          id: string
          nome: string
          regioni: string[]
          ruolo: Database["public"]["Enums"]["ruolo"]
          visto_il: string
        }[]
      }
      posso_leggere_canale: { Args: { p_canale: string }; Returns: boolean }
      proponi_operatore: {
        Args: { p_evento: string; p_operatore: string }
        Returns: undefined
      }
      registra_tappa: {
        Args: {
          p_evento: string
          p_lat?: number
          p_lng?: number
          p_tappa: string
        }
        Returns: undefined
      }
      rispondi_proposta: {
        Args: { p_accetta: boolean; p_proposta: string }
        Returns: undefined
      }
      scadi_proposte_passate: { Args: never; Returns: undefined }
      segna_attrezzatura: {
        Args: { p_azione: string; p_evento: string }
        Returns: undefined
      }
      segna_passaggio: {
        Args: {
          p_evento: string
          p_passaggio: Database["public"]["Enums"]["passaggio"]
        }
        Returns: undefined
      }
      segna_rimborso: {
        Args: { p_rimborsate?: boolean; p_spese: string[] }
        Returns: number
      }
      segna_visto: { Args: never; Returns: undefined }
      segnala_carta: {
        Args: { p_operatore?: string; p_stampe: number }
        Returns: undefined
      }
      soglia_carta: { Args: never; Returns: number }
      sono_principale: { Args: never; Returns: boolean }
      vede_tutti_eventi: { Args: never; Returns: boolean }
      vedo_richiesta: {
        Args: { r: Database["public"]["Tables"]["richieste"]["Row"] }
        Returns: boolean
      }
      vedo_soldi: { Args: { p_evento: string }; Returns: boolean }
      voce_da_mcc: {
        Args: { p_mcc: string }
        Returns: Database["public"]["Enums"]["voce_spesa"]
      }
    }
    Enums: {
      categoria_costo:
        | "noleggio_veicolo"
        | "carburante"
        | "pedaggi"
        | "parcheggio"
        | "carta_stampe"
        | "vitto"
        | "alloggio"
        | "materiali"
        | "altro"
      fase_costo: "previsto" | "finale"
      pagamento: "carta_aziendale" | "operatore" | "azienda"
      pagata_con: "carta_aziendale" | "operatore" | "azienda"
      passaggio:
        | "check_in"
        | "attrezzatura"
        | "montato"
        | "smontato"
        | "rientrato"
        | "check_out"
      priorita: "bassa" | "media" | "alta"
      regione:
        | "Abruzzo"
        | "Basilicata"
        | "Calabria"
        | "Campania"
        | "Emilia-Romagna"
        | "Friuli-Venezia Giulia"
        | "Lazio"
        | "Liguria"
        | "Lombardia"
        | "Marche"
        | "Molise"
        | "Piemonte"
        | "Puglia"
        | "Sardegna"
        | "Sicilia"
        | "Toscana"
        | "Trentino-Alto Adige"
        | "Umbria"
        | "Valle d'Aosta"
        | "Veneto"
      ruolo:
        | "admin"
        | "project"
        | "operatore"
        | "gestore_operatori"
        | "amministrazione"
      stato_approvazione: "inviato" | "approvato" | "respinto"
      stato_articolo: "disponibile" | "in_manutenzione" | "fuori_uso"
      stato_attivita: "da_fare" | "in_corso" | "fatto"
      stato_evento:
        | "bozza"
        | "da_assegnare"
        | "proposto"
        | "confermato"
        | "in_corso"
        | "completato"
        | "annullato"
      stato_proposta:
        | "in_attesa"
        | "accettata"
        | "rifiutata"
        | "scaduta"
        | "revocata"
      voce_spesa:
        | "noleggio"
        | "carburante"
        | "pedaggi"
        | "parcheggio"
        | "vitto"
        | "alloggio"
        | "materiali"
        | "altro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_costo: [
        "noleggio_veicolo",
        "carburante",
        "pedaggi",
        "parcheggio",
        "carta_stampe",
        "vitto",
        "alloggio",
        "materiali",
        "altro",
      ],
      fase_costo: ["previsto", "finale"],
      pagamento: ["carta_aziendale", "operatore", "azienda"],
      pagata_con: ["carta_aziendale", "operatore", "azienda"],
      passaggio: [
        "check_in",
        "attrezzatura",
        "montato",
        "smontato",
        "rientrato",
        "check_out",
      ],
      priorita: ["bassa", "media", "alta"],
      regione: [
        "Abruzzo",
        "Basilicata",
        "Calabria",
        "Campania",
        "Emilia-Romagna",
        "Friuli-Venezia Giulia",
        "Lazio",
        "Liguria",
        "Lombardia",
        "Marche",
        "Molise",
        "Piemonte",
        "Puglia",
        "Sardegna",
        "Sicilia",
        "Toscana",
        "Trentino-Alto Adige",
        "Umbria",
        "Valle d'Aosta",
        "Veneto",
      ],
      ruolo: [
        "admin",
        "project",
        "operatore",
        "gestore_operatori",
        "amministrazione",
      ],
      stato_approvazione: ["inviato", "approvato", "respinto"],
      stato_articolo: ["disponibile", "in_manutenzione", "fuori_uso"],
      stato_attivita: ["da_fare", "in_corso", "fatto"],
      stato_evento: [
        "bozza",
        "da_assegnare",
        "proposto",
        "confermato",
        "in_corso",
        "completato",
        "annullato",
      ],
      stato_proposta: [
        "in_attesa",
        "accettata",
        "rifiutata",
        "scaduta",
        "revocata",
      ],
      voce_spesa: [
        "noleggio",
        "carburante",
        "pedaggi",
        "parcheggio",
        "vitto",
        "alloggio",
        "materiali",
        "altro",
      ],
    },
  },
} as const
