import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
    try {
        let userId: string | null = null
        let userEmail: string | null = null
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        const authHeader = req.headers.get('authorization') || ''
        const bearer = authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : ''

        if (bearer && url && anonKey) {
            const anonClient = createSupabaseClient(url, anonKey)
            const { data, error } = await anonClient.auth.getUser(bearer)
            if (!error && data?.user) {
                userId = data.user.id
                userEmail = data.user.email || null
            }
        }

        const supabase = await createClient()

        if (!userId) {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
            }
            userId = user.id
            userEmail = user.email || null
        }

        const selectWithPlanCols = 'id, nombre, slug, color_primario, estado, plan, selected_plan, selected_program_types, trial_hasta, logo_url'
        const selectLegacy = 'id, nombre, slug, color_primario, estado, plan, trial_hasta, logo_url'

        // 2. Buscar todos los tenants asociados a su ID
        let { data: tenants, error: dbError } = await supabase
            .from('tenants')
            .select(selectWithPlanCols)
            .eq('auth_user_id', userId)
            .order('nombre', { ascending: true })

        if (dbError) {
            const details = `${dbError.message || ''} ${dbError.details || ''}`.toLowerCase()
            const looksLikeMissingPlanCols =
                dbError.code === '42703'
                || details.includes('selected_plan')
                || details.includes('selected_program_types')

            if (looksLikeMissingPlanCols) {
                const legacy = await supabase
                    .from('tenants')
                    .select(selectLegacy)
                    .eq('auth_user_id', userId)
                    .order('nombre', { ascending: true })

                tenants = (legacy.data || []).map((t) => ({
                    ...t,
                    selected_plan: null,
                    selected_program_types: null
                }))
                dbError = legacy.error
            }
        }

        if (dbError) throw dbError

        // Auto-reparación: si no hay tenants por auth_user_id, intenta por email y vincula.
        if ((!tenants || tenants.length === 0) && userEmail) {
            const byEmail = await supabase
                .from('tenants')
                .select(selectLegacy)
                .eq('email', userEmail)
                .order('nombre', { ascending: true })

            if (!byEmail.error && byEmail.data && byEmail.data.length > 0) {
                const ids = byEmail.data.map(t => t.id)
                await supabase
                    .from('tenants')
                    .update({ auth_user_id: userId, updated_at: new Date().toISOString() })
                    .in('id', ids)

                tenants = byEmail.data.map((t) => ({
                    ...t,
                    selected_plan: null,
                    selected_program_types: null
                }))
            }
        }

        return NextResponse.json({ tenants });
    } catch (error: unknown) {
        console.error('Error fetching my-tenants:', error);
        const message = error instanceof Error ? error.message : 'Error interno'
        return NextResponse.json({ error: message, code: 'MY_TENANTS_FAILED' }, { status: 500 });
    }
}
