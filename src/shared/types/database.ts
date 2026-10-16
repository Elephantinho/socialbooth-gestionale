// Tipi del database, generati da Supabase.
// Se cambi lo schema, rigenerali (vedi README) invece di modificarli a mano.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Regione = Database['public']['Enums']['regione']

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      articoli: {
        Row: {
          id: string; magazzino_id: string; nome: string; categoria: string; quantita: number; codice: string | null
          stato: Database['public']['Enums']['stato_articolo']; note: string | null; creato_il: string
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
        Row: { evento_id: string; articolo_id: string; quantita: number }
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
        }
        Insert: {
          id?: string; evento_id: string; fase: Database['public']['Enums']['fase_costo']; categoria: Database['public']['Enums']['categoria_costo']
          descrizione?: string | null; quantita?: number; costo_unitario: number; importo?: number | null
          pagato_con?: Database['public']['Enums']['pagamento']; carta_id?: string | null; operatore_id?: string | null
          scontrino?: string | null; stato?: Database['public']['Enums']['stato_approvazione']; creato_da?: string | null; creato_il?: string
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
          aggiornato_il: string; allestimento_il: string; citta: string; cliente_id: string | null; codice: number; creato_il: string
          fine_attivazione: string; hostess: boolean; id: string; indirizzo: string; inizio_attivazione: string; location_id: string | null
          magazzino_id: string | null; note: string | null; note_accesso: string | null; operatore_id: string | null; outfit: string | null
          project_id: string; referente_nome: string | null; referente_telefono: string | null; regione: Regione
          ritiro_magazzino_il: string | null; smontaggio_il: string; stato: Database['public']['Enums']['stato_evento']
          tipo_booth_id: string | null; viaggio_minuti: number | null; wifi: boolean; ztl: boolean
          lat: number | null; lng: number | null
          prezzo_cliente: number | null; fattura_numero: string | null; fattura_data: string | null
          fattura_importo: number | null; fattura_pagata: boolean; stampe_effettuate: number | null
        }
        Insert: {
          aggiornato_il?: string; allestimento_il: string; citta: string; cliente_id?: string | null; codice?: number; creato_il?: string
          fine_attivazione: string; hostess?: boolean; id?: string; indirizzo: string; inizio_attivazione: string; location_id?: string | null
          magazzino_id?: string | null; note?: string | null; note_accesso?: string | null; operatore_id?: string | null; outfit?: string | null
          project_id: string; referente_nome?: string | null; referente_telefono?: string | null; regione: Regione
          ritiro_magazzino_il?: string | null; smontaggio_il: string; stato?: Database['public']['Enums']['stato_evento']
          tipo_booth_id?: string | null; viaggio_minuti?: number | null; wifi?: boolean; ztl?: boolean
          lat?: number | null; lng?: number | null
          prezzo_cliente?: number | null; fattura_numero?: string | null; fattura_data?: string | null
          fattura_importo?: number | null; fattura_pagata?: boolean; stampe_effettuate?: number | null
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
        }
        Insert: {
          approvato_da?: string | null; approvato_il?: string | null; check_in_foto?: string | null; check_in_il?: string | null
          check_in_lat?: number | null; check_in_lng?: number | null; check_out_il?: string | null; compenso?: number | null; creato_il?: string
          evento_id: string; id?: string; minuti_in_location?: number; minuti_totali?: number | null; minuti_viaggio?: number
          nota_operatore?: string | null; operatore_id: string; stato?: Database['public']['Enums']['stato_approvazione']; tariffa_oraria?: number | null
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
          cognome: string; foto: string | null
        }
        Insert: {
          attivo?: boolean; creato_il?: string; id: string; magazzino_id?: string | null; nome?: string
          ruolo?: Database['public']['Enums']['ruolo']; tariffa_oraria?: number | null; telefono?: string | null
          cognome?: string; foto?: string | null
        }
        Update: Partial<Database['public']['Tables']['profili']['Insert']>
        Relationships: [
          { foreignKeyName: 'profili_magazzino_fk'; columns: ['magazzino_id']; isOneToOne: false; referencedRelation: 'magazzini'; referencedColumns: ['id'] },
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
      spese: {
        Row: {
          creato_il: string; descrizione: string | null; evento_id: string; id: string; importo: number; operatore_id: string
          scontrino: string | null; stato: Database['public']['Enums']['stato_approvazione']; tipo: string
        }
        Insert: {
          creato_il?: string; descrizione?: string | null; evento_id: string; id?: string; importo: number; operatore_id: string
          scontrino?: string | null; stato?: Database['public']['Enums']['stato_approvazione']; tipo: string
        }
        Update: Partial<Database['public']['Tables']['spese']['Insert']>
        Relationships: [
          { foreignKeyName: 'spese_evento_id_fkey'; columns: ['evento_id']; isOneToOne: false; referencedRelation: 'eventi'; referencedColumns: ['id'] },
          { foreignKeyName: 'spese_operatore_id_fkey'; columns: ['operatore_id']; isOneToOne: false; referencedRelation: 'profili'; referencedColumns: ['id'] },
        ]
      }
      tipi_booth: {
        Row: { id: string; nome: string }
        Insert: { id?: string; nome: string }
        Update: { id?: string; nome?: string }
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
      proponi_operatore: { Args: { p_evento: string; p_operatore: string }; Returns: undefined }
      rispondi_proposta: { Args: { p_accetta: boolean; p_proposta: string }; Returns: undefined }
      gestisco_evento: { Args: { p_evento: string }; Returns: boolean }
      lavoro_evento: { Args: { p_evento: string }; Returns: boolean }
    }
    Enums: {
      regione:
        | 'Abruzzo' | 'Basilicata' | 'Calabria' | 'Campania' | 'Emilia-Romagna' | 'Friuli-Venezia Giulia' | 'Lazio'
        | 'Liguria' | 'Lombardia' | 'Marche' | 'Molise' | 'Piemonte' | 'Puglia' | 'Sardegna' | 'Sicilia' | 'Toscana'
        | 'Trentino-Alto Adige' | 'Umbria' | "Valle d'Aosta" | 'Veneto'
      ruolo: 'admin' | 'project' | 'operatore'
      stato_approvazione: 'inviato' | 'approvato' | 'respinto'
      stato_evento: 'bozza' | 'da_assegnare' | 'proposto' | 'confermato' | 'in_corso' | 'completato' | 'annullato'
      stato_proposta: 'in_attesa' | 'accettata' | 'rifiutata' | 'scaduta' | 'revocata'
      stato_articolo: 'disponibile' | 'in_manutenzione' | 'fuori_uso'
      fase_costo: 'previsto' | 'finale'
      categoria_costo: 'noleggio_veicolo' | 'carburante' | 'pedaggi' | 'parcheggio' | 'carta_stampe' | 'vitto' | 'alloggio' | 'materiali' | 'altro'
      pagamento: 'carta_aziendale' | 'operatore' | 'azienda'
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
