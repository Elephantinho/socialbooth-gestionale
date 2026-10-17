// Tipi del database, generati da Supabase.
// Se cambi lo schema, rigenerali (vedi README) invece di modificarli a mano.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Regione = Database['public']['Enums']['regione']

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      impostazioni: {
        Row: { chiave: string; valore: number | null; descrizione: string | null }
        Insert: { chiave: string; valore?: number | null; descrizione?: string | null }
        Update: { chiave?: string; valore?: number | null; descrizione?: string | null }
        Relationships: []
      }
      movimenti_carta: {
        Row: {
          id: string; operatore_id: string; tipo: 'ricarica' | 'consumo' | 'correzione'; stampe: number
          evento_id: string | null; note: string | null; fatto_da: string | null; creato_il: string
        }
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'movimenti_carta_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
        ]
      }
      dispositivi_push: {
        Row: { id: string; utente_id: string; endpoint: string; p256dh: string; auth: string; descrizione: string | null; creato_il: string }
        Insert: { id?: string; utente_id?: string; endpoint: string; p256dh: string; auth: string; descrizione?: string | null; creato_il?: string }
        Update: Partial<Database['public']['Tables']['dispositivi_push']['Insert']>
        Relationships: []
      }
      montaggio: {
        Row: { evento_id: string; voci_fatte: string[]; completato_il: string | null; aggiornato_il: string }
        Insert: { evento_id: string; voci_fatte?: string[]; completato_il?: string | null; aggiornato_il?: string }
        Update: Partial<Database['public']['Tables']['montaggio']['Insert']>
        Relationships: []
      }
      richieste: {
        Row: {
          id: string; tipo: 'carta' | 'attrezzatura' | 'trasferimento' | 'manutenzione' | 'altro'; titolo: string; dettagli: string | null
          da_id: string; per_ruolo: Database['public']['Enums']['ruolo'] | null; per_utente: string | null
          operatore_id: string | null; magazzino_id: string | null; evento_id: string | null; quantita: number | null; scadenza: string | null
          stato: 'aperta' | 'in_corso' | 'fatta' | 'annullata'; preso_da: string | null; nota_chiusura: string | null
          creato_il: string; chiuso_il: string | null
        }
        Insert: {
          id?: string; tipo: 'carta' | 'attrezzatura' | 'trasferimento' | 'manutenzione' | 'altro'; titolo: string; dettagli?: string | null
          da_id?: string; per_ruolo?: Database['public']['Enums']['ruolo'] | null; per_utente?: string | null
          operatore_id?: string | null; magazzino_id?: string | null; evento_id?: string | null; quantita?: number | null; scadenza?: string | null
          stato?: 'aperta' | 'in_corso' | 'fatta' | 'annullata'; preso_da?: string | null; nota_chiusura?: string | null; chiuso_il?: string | null
        }
        Update: Partial<Database['public']['Tables']['richieste']['Insert']>
        Relationships: [
          { foreignKeyName: 'richieste_da_id_fkey'; columns: ['da_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'richieste_per_utente_fkey'; columns: ['per_utente']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'richieste_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'richieste_preso_da_fkey'; columns: ['preso_da']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'richieste_magazzino_id_fkey'; columns: ['magazzino_id']; isOneToOne: false; referencedRelation: 'magazzini'; referencedColumns: ['id'] },
          { foreignKeyName: 'richieste_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
        ]
      }
      chat_messaggi: {
        Row: { id: string; canale: string; autore_id: string; testo: string; creato_il: string }
        Insert: { id?: string; canale: string; autore_id?: string; testo: string; creato_il?: string }
        Update: Partial<Database['public']['Tables']['chat_messaggi']['Insert']>
        Relationships: []
      }
      chat_letture: {
        Row: { utente_id: string; canale: string; letto_il: string }
        Insert: { utente_id?: string; canale: string; letto_il?: string }
        Update: Partial<Database['public']['Tables']['chat_letture']['Insert']>
        Relationships: []
      }
      notifiche: {
        Row: { id: string; utente_id: string; titolo: string; testo: string | null; link: string | null; letta: boolean; creata_il: string }
        Insert: { id?: string; utente_id: string; titolo: string; testo?: string | null; link?: string | null; letta?: boolean; creata_il?: string }
        Update: Partial<Database['public']['Tables']['notifiche']['Insert']>
        Relationships: []
      }
      allegati: {
        Row: { id: string; evento_id: string; nome: string; percorso: string; tipo: string | null; dimensione: number | null; caricato_da: string | null; creato_il: string }
        Insert: { id?: string; evento_id: string; nome: string; percorso: string; tipo?: string | null; dimensione?: number | null; caricato_da?: string | null; creato_il?: string }
        Update: Partial<Database['public']['Tables']['allegati']['Insert']>
        Relationships: [
          { foreignKeyName: 'allegati_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
          { foreignKeyName: 'allegati_caricato_da_fkey'; columns: ['caricato_da']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      articoli: {
        Row: {
          id: string; magazzino_id: string; nome: string; categoria: string; quantita: number; codice: string | null
          stato: Database['public']['Enums']['stato_articolo']; note: string | null; creato_il: string; in_uso: number
        }
        Insert: {
          id?: string; magazzino_id: string; nome: string; categoria?: string; quantita?: number; codice?: string | null
          stato?: Database['public']['Enums']['stato_articolo']; note?: string | null; creato_il?: string
        }
        Update: Partial<Database['public']['Tables']['articoli']['Insert']>
        Relationships: [
          { foreignKeyName: 'articoli_magazzino_id_fkey'; columns: ['magazzino_id']; isOneToOne: false; referencedRelation: 'magazzini'; referencedColumns: ['id'] },
        ]
      }
      attrezzatura_evento: {
        Row: { evento_id: string; articolo_id: string; quantita: number; prelevato_il: string | null; rientrato_il: string | null }
        Insert: { evento_id: string; articolo_id: string; quantita?: number }
        Update: { evento_id?: string; articolo_id?: string; quantita?: number }
        Relationships: [
          { foreignKeyName: 'attrezzatura_evento_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
          { foreignKeyName: 'attrezzatura_evento_articolo_id_fkey'; columns: ['articolo_id']; isOneToOne: false; referencedRelation: 'articoli'; referencedColumns: ['id'] },
        ]
      }
      carte_aziendali: {
        Row: {
          id: string; nome: string; ultime_cifre: string; circuito: string | null; operatore_id: string | null
          attiva: boolean; note: string | null; creato_il: string
        }
        Insert: {
          id?: string; nome: string; ultime_cifre: string; circuito?: string | null; operatore_id?: string | null
          attiva?: boolean; note?: string | null; creato_il?: string
        }
        Update: Partial<Database['public']['Tables']['carte_aziendali']['Insert']>
        Relationships: [
          { foreignKeyName: 'carte_aziendali_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      costi_evento: {
        Row: {
          id: string; evento_id: string; fase: Database['public']['Enums']['fase_costo']; categoria: Database['public']['Enums']['categoria_costo']
          descrizione: string | null; quantita: number; costo_unitario: number; importo: number | null
          pagato_con: Database['public']['Enums']['pagamento']; carta_id: string | null; operatore_id: string | null
          scontrino: string | null; stato: Database['public']['Enums']['stato_approvazione']; creato_da: string | null; creato_il: string
          stampe: number | null
        }
        Insert: {
          id?: string; evento_id: string; fase: Database['public']['Enums']['fase_costo']; categoria: Database['public']['Enums']['categoria_costo']
          descrizione?: string | null; quantita?: number; costo_unitario: number; importo?: number | null
          pagato_con?: Database['public']['Enums']['pagamento']; carta_id?: string | null; operatore_id?: string | null
          scontrino?: string | null; stato?: Database['public']['Enums']['stato_approvazione']; creato_da?: string | null; creato_il?: string
          stampe?: number | null
        }
        Update: Partial<Database['public']['Tables']['costi_evento']['Insert']>
        Relationships: [
          { foreignKeyName: 'costi_evento_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
          { foreignKeyName: 'costi_evento_carta_id_fkey'; columns: ['carta_id']; isOneToOne: false; referencedRelation: 'carte_aziendali'; referencedColumns: ['id'] },
          { foreignKeyName: 'costi_evento_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'costi_evento_creato_da_fkey'; columns: ['creato_da']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      clienti: {
        Row: { creato_il: string; email: string | null; id: string; nome: string; note: string | null; project_id: string | null; telefono: string | null }
        Insert: { creato_il?: string; email?: string | null; id?: string; nome: string; note?: string | null; project_id?: string | null; telefono?: string | null }
        Update: { creato_il?: string; email?: string | null; id?: string; nome?: string; note?: string | null; project_id?: string | null; telefono?: string | null }
        Relationships: [
          { foreignKeyName: 'clienti_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      eventi: {
        Row: {
          aggiornato_il: string; allestimento_il: string; citta: string; cliente_id: string | null; codice: number; creato_il: string; nome: string | null; avvisi_ritardo: string[]; ultimo_passaggio: Database['public']['Enums']['passaggio'] | null
          fine_attivazione: string; hostess: boolean; id: string; indirizzo: string; inizio_attivazione: string; location_id: string | null
          magazzino_id: string | null; note: string | null; note_accesso: string | null; operatore_id: string | null; outfit: string | null
          project_id: string; referente_nome: string | null; referente_telefono: string | null; regione: Regione
          ritiro_magazzino_il: string | null; smontaggio_il: string; stato: Database['public']['Enums']['stato_evento']
          tipo_booth_id: string | null; viaggio_minuti: number | null; wifi: boolean; ztl: boolean
          lat: number | null; lng: number | null
          prezzo_cliente: number | null; fattura_numero: string | null; fattura_data: string | null
          fattura_importo: number | null; fattura_pagata: boolean; stampe_effettuate: number | null
          promemoria_ore_inviato: boolean
        }
        Insert: {
          aggiornato_il?: string; allestimento_il: string; citta: string; cliente_id?: string | null; codice?: number; creato_il?: string; nome?: string | null; ultimo_passaggio?: Database['public']['Enums']['passaggio'] | null
          fine_attivazione: string; hostess?: boolean; id?: string; indirizzo: string; inizio_attivazione: string; location_id?: string | null
          magazzino_id?: string | null; note?: string | null; note_accesso?: string | null; operatore_id?: string | null; outfit?: string | null
          project_id: string; referente_nome?: string | null; referente_telefono?: string | null; regione: Regione
          ritiro_magazzino_il?: string | null; smontaggio_il: string; stato?: Database['public']['Enums']['stato_evento']
          tipo_booth_id?: string | null; viaggio_minuti?: number | null; wifi?: boolean; ztl?: boolean
          lat?: number | null; lng?: number | null
          prezzo_cliente?: number | null; fattura_numero?: string | null; fattura_data?: string | null
          fattura_importo?: number | null; fattura_pagata?: boolean; stampe_effettuate?: number | null
          promemoria_ore_inviato?: boolean
        }
        Update: Partial<Database['public']['Tables']['eventi']['Insert']>
        Relationships: [
          { foreignKeyName: 'eventi_cliente_id_fkey'; columns: ['cliente_id']; isOneToOne: false; referencedRelation: 'clienti'; referencedColumns: ['id'] },
          { foreignKeyName: 'eventi_location_id_fkey'; columns: ['location_id']; isOneToOne: false; referencedRelation: 'location'; referencedColumns: ['id'] },
          { foreignKeyName: 'eventi_magazzino_id_fkey'; columns: ['magazzino_id']; isOneToOne: false; referencedRelation: 'magazzini'; referencedColumns: ['id'] },
          { foreignKeyName: 'eventi_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'eventi_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'eventi_tipo_booth_id_fkey'; columns: ['tipo_booth_id']; isOneToOne: false; referencedRelation: 'tipi_booth'; referencedColumns: ['id'] },
        ]
      }
      indisponibilita: {
        Row: { al: string; dal: string; id: string; motivo: string | null; operatore_id: string }
        Insert: { al: string; dal: string; id?: string; motivo?: string | null; operatore_id: string }
        Update: { al?: string; dal?: string; id?: string; motivo?: string | null; operatore_id?: string }
        Relationships: [
          { foreignKeyName: 'indisponibilita_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      location: {
        Row: {
          citta: string; creato_il: string; foto_ingresso: string | null; id: string; indirizzo: string; lat: number | null; lng: number | null
          nome: string | null; note_accesso: string | null; regione: Regione; wifi: boolean | null; ztl: boolean | null
        }
        Insert: {
          citta: string; creato_il?: string; foto_ingresso?: string | null; id?: string; indirizzo: string; lat?: number | null; lng?: number | null
          nome?: string | null; note_accesso?: string | null; regione: Regione; wifi?: boolean | null; ztl?: boolean | null
        }
        Update: Partial<Database['public']['Tables']['location']['Insert']>
        Relationships: []
      }
      magazzini: {
        Row: { citta: string; id: string; indirizzo: string; lat: number | null; lng: number | null; nome: string; note: string | null; regione: Regione }
        Insert: { citta: string; id?: string; indirizzo: string; lat?: number | null; lng?: number | null; nome: string; note?: string | null; regione: Regione }
        Update: Partial<Database['public']['Tables']['magazzini']['Insert']>
        Relationships: []
      }
      ore_lavorate: {
        Row: {
          approvato_da: string | null; approvato_il: string | null; check_in_foto: string | null; check_in_il: string | null
          check_in_lat: number | null; check_in_lng: number | null; check_out_il: string | null; compenso: number | null; creato_il: string
          evento_id: string; id: string; minuti_in_location: number; minuti_totali: number | null; minuti_viaggio: number
          nota_operatore: string | null; operatore_id: string; stato: Database['public']['Enums']['stato_approvazione']; tariffa_oraria: number | null
          partenza_il: string | null; partenza_lat: number | null; partenza_lng: number | null; fine_il: string | null
          rientro_il: string | null; rientro_lat: number | null; rientro_lng: number | null; calcolo_automatico: boolean
        }
        Insert: {
          approvato_da?: string | null; approvato_il?: string | null; check_in_foto?: string | null; check_in_il?: string | null
          check_in_lat?: number | null; check_in_lng?: number | null; check_out_il?: string | null; compenso?: number | null; creato_il?: string
          evento_id: string; id?: string; minuti_in_location?: number; minuti_totali?: number | null; minuti_viaggio?: number
          nota_operatore?: string | null; operatore_id: string; stato?: Database['public']['Enums']['stato_approvazione']; tariffa_oraria?: number | null
          partenza_il?: string | null; partenza_lat?: number | null; partenza_lng?: number | null; fine_il?: string | null
          rientro_il?: string | null; rientro_lat?: number | null; rientro_lng?: number | null; calcolo_automatico?: boolean
        }
        Update: Partial<Database['public']['Tables']['ore_lavorate']['Insert']>
        Relationships: [
          { foreignKeyName: 'ore_lavorate_approvato_da_fkey'; columns: ['approvato_da']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
          { foreignKeyName: 'ore_lavorate_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
          { foreignKeyName: 'ore_lavorate_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      profili: {
        Row: {
          attivo: boolean; creato_il: string; id: string; magazzino_id: string | null; nome: string
          ruolo: Database['public']['Enums']['ruolo']; tariffa_oraria: number | null; telefono: string | null
          cognome: string; foto: string | null; carta_disponibile: number; carta_aggiornata_il: string | null; visto_il: string | null
        }
        Insert: {
          attivo?: boolean; creato_il?: string; id: string; magazzino_id?: string | null; nome?: string
          ruolo?: Database['public']['Enums']['ruolo']; tariffa_oraria?: number | null; telefono?: string | null
          cognome?: string; foto?: string | null; carta_disponibile?: number
        }
        Update: Partial<Database['public']['Tables']['profili']['Insert']>
        Relationships: [
          { foreignKeyName: 'profili_magazzino_fk'; columns: ['magazzino_id']; isOneToOne: false; referencedRelation: 'magazzini'; referencedColumns: ['id'] },
        ]
      }
      passaggi_evento: {
        Row: { id: string; evento_id: string; operatore_id: string; passaggio: Database['public']['Enums']['passaggio']; fatto_il: string; annullato_il: string | null }
        Insert: { id?: string; evento_id: string; operatore_id: string; passaggio: Database['public']['Enums']['passaggio']; fatto_il?: string; annullato_il?: string | null }
        Update: Partial<Database['public']['Tables']['passaggi_evento']['Insert']>
        Relationships: [
          { foreignKeyName: 'passaggi_evento_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
        ]
      }
      proposte: {
        Row: {
          automatica: boolean; creato_il: string; evento_id: string; id: string; operatore_id: string
          risposta_il: string | null; scade_il: string | null; stato: Database['public']['Enums']['stato_proposta']
        }
        Insert: {
          automatica?: boolean; creato_il?: string; evento_id: string; id?: string; operatore_id: string
          risposta_il?: string | null; scade_il?: string | null; stato?: Database['public']['Enums']['stato_proposta']
        }
        Update: Partial<Database['public']['Tables']['proposte']['Insert']>
        Relationships: [
          { foreignKeyName: 'proposte_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
          { foreignKeyName: 'proposte_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      tipi_booth: {
        Row: { id: string; nome: string; linea: string; ordine: number; stampa: boolean }
        Insert: { id?: string; nome: string; linea?: string; ordine?: number; stampa?: boolean }
        Update: { id?: string; nome?: string; linea?: string; ordine?: number; stampa?: boolean }
        Relationships: []
      }
      zone_operatore: {
        Row: { operatore_id: string; regione: Regione }
        Insert: { operatore_id: string; regione: Regione }
        Update: { operatore_id?: string; regione?: Regione }
        Relationships: [
          { foreignKeyName: 'zone_operatore_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: {
      riepilogo_mensile: {
        Row: {
          compenso: number | null; eventi: number | null; mese: string | null; minuti_in_location: number | null
          minuti_totali: number | null; minuti_viaggio: number | null; operatore_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_in: { Args: { p_evento: string; p_foto?: string; p_lat: number; p_lng: number }; Returns: undefined }
      chiudi_evento: { Args: { p_evento: string; p_minuti_location: number; p_minuti_viaggio: number; p_nota?: string }; Returns: undefined }
      mio_ruolo: { Args: never; Returns: Database['public']['Enums']['ruolo'] }
      operatori_disponibili: {
        Args: { p_evento: string }
        Returns: Database['public']['Tables']['profili']['Row'][]
        SetofOptions: { from: '*'; to: 'profili'; isOneToOne: false; isSetofReturn: true }
      }
      segna_passaggio: { Args: { p_evento: string; p_passaggio: Database['public']['Enums']['passaggio'] }; Returns: undefined }
      annulla_passaggio: { Args: { p_evento: string }; Returns: undefined }
      concludi_evento: { Args: { p_evento: string }; Returns: undefined }
      proponi_operatore: { Args: { p_evento: string; p_operatore: string }; Returns: undefined }
      rispondi_proposta: { Args: { p_accetta: boolean; p_proposta: string }; Returns: undefined }
      gestisco_evento: { Args: { p_evento: string }; Returns: boolean }
      costo_per_stampa: { Args: never; Returns: number }
      media_stampe_per_evento: { Args: never; Returns: number }
      invia_ricarica_carta: { Args: { p_operatore: string; p_stampe: number; p_note?: string }; Returns: undefined }
      segna_attrezzatura: { Args: { p_evento: string; p_azione: 'prelievo' | 'rientro' }; Returns: undefined }
      persone_squadra: { Args: never; Returns: { id: string; nome: string; cognome: string; foto: string | null; ruolo: Database['public']['Enums']['ruolo']; visto_il: string | null; regioni: string[] }[] }
      chat_non_letti: { Args: never; Returns: { canale: string; non_letti: number; ultimo: string }[] }
      segna_visto: { Args: never; Returns: undefined }
      chiave_push: { Args: never; Returns: string | null }
      segnala_carta: { Args: { p_stampe: number; p_operatore?: string }; Returns: undefined }
      registra_tappa: { Args: { p_evento: string; p_tappa: string; p_lat?: number; p_lng?: number }; Returns: undefined }
      lavoro_evento: { Args: { p_evento: string }; Returns: boolean }
    }
    Enums: {
      regione:
        | 'Abruzzo' | 'Basilicata' | 'Calabria' | 'Campania' | 'Emilia-Romagna' | 'Friuli-Venezia Giulia' | 'Lazio'
        | 'Liguria' | 'Lombardia' | 'Marche' | 'Molise' | 'Piemonte' | 'Puglia' | 'Sardegna' | 'Sicilia' | 'Toscana'
        | 'Trentino-Alto Adige' | 'Umbria' | "Valle d'Aosta" | 'Veneto'
      ruolo: 'admin' | 'project' | 'gestore_operatori' | 'amministrazione' | 'operatore'
      stato_approvazione: 'inviato' | 'approvato' | 'respinto'
      passaggio: 'check_in' | 'attrezzatura' | 'montato' | 'smontato' | 'rientrato' | 'check_out'
      stato_evento: 'bozza' | 'da_assegnare' | 'proposto' | 'confermato' | 'in_corso' | 'completato' | 'annullato'
      stato_proposta: 'in_attesa' | 'accettata' | 'rifiutata' | 'scaduta' | 'revocata'
      stato_articolo: 'disponibile' | 'in_manutenzione' | 'fuori_uso'
      fase_costo: 'previsto' | 'finale'
      categoria_costo: 'noleggio_veicolo' | 'carburante' | 'pedaggi' | 'parcheggio' | 'carta_stampe' | 'vitto' | 'alloggio' | 'materiali' | 'altro'
      pagamento: 'carta_aziendale' | 'operatore' | 'azienda'
      stato_attivita: 'da_fare' | 'in_corso' | 'fatto'
      priorita: 'bassa' | 'media' | 'alta'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

// Scorciatoie: Riga<'eventi'>, Inserimento<'eventi'>, Enum<'regione'>
type Pub = Database['public']
export type Riga<T extends keyof Pub['Tables']> = Pub['Tables'][T]['Row']
export type Inserimento<T extends keyof Pub['Tables']> = Pub['Tables'][T]['Insert']
export type Enum<T extends keyof Pub['Enums']> = Pub['Enums'][T]

export const REGIONI: Enum<'regione'>[] = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio',
  'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
]
