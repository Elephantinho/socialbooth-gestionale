import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chiave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !chiave) {
  throw new Error('Mancano VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY: copia .env.example in .env')
}

/** Unico client Supabase dell'app. Importalo da qui, non crearne altri. */
export const supabase = createClient<Database>(url, chiave, {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Trasforma l'errore di Supabase in un'eccezione, così TanStack Query lo gestisce. */
export function ok<T>(risposta: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (risposta.error) throw new Error(risposta.error.message)
  // Le funzioni che non restituiscono nulla (rpc void) danno null: va bene così
  return risposta.data as NonNullable<T>
}
