import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

/**
 * Cliente Supabase para uso en APIs del servidor.
 * Se inicializa de forma lazy para evitar errores durante el build.
 */
export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!url || !key) {
            throw new Error('Supabase environment variables are not set')
        }

        _supabase = createClient(url, key)
    }
    return _supabase
}
