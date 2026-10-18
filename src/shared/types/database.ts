// Tipi del database: lo schema vero è in supabase.ts (generato, non si tocca a mano).
// Qui solo le scorciatoie usate nell'app: Riga<'eventi'>, Inserimento<'eventi'>, Enum<'regione'>.
import type { Database } from './supabase'

export type { Database } from './supabase'

type Pub = Database['public']
export type Riga<T extends keyof Pub['Tables']> = Pub['Tables'][T]['Row']
export type Inserimento<T extends keyof Pub['Tables']> = Pub['Tables'][T]['Insert']
export type Enum<T extends keyof Pub['Enums']> = Pub['Enums'][T]

export const REGIONI: Enum<'regione'>[] = [
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio',
  'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
  'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
]
