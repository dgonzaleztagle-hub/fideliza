import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/authz'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * POST /api/admin/tenants/create
 *
 * Crea un nuevo tenant (negocio) desde el panel de super admin de Vuelve+.
 * Flujo:
 * 1. Crea un usuario Supabase Auth con email/password generado
 * 2. Crea el tenant en la tabla `tenants` vinculado a ese usuario
 * 3. Crea el programa de lealtad inicial en `programs`
 * 4. Devuelve el tenant_id, slug y credenciales generadas
 *
 * Body: { nombre, email, rubro, color_primario?, puntos_meta?, descripcion_premio? }
 */
export async function POST(req: NextRequest) {
    // Solo super admin puede crear tenants
    const admin = await requireSuperAdmin()
    if (!admin.ok) return admin.response

    try {
        const body = await req.json().catch(() => null)
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
        }

        const {
            nombre,
            email,
            rubro = 'Negocio Local',
            color_primario = '#3b82f6',
            puntos_meta = 10,
            descripcion_premio = 'Premio Sorpresa',
            plan = 'trial'
        } = body as {
            nombre?: string
            email?: string
            rubro?: string
            color_primario?: string
            puntos_meta?: number
            descripcion_premio?: string
            plan?: string
        }

        if (!nombre || !email) {
            return NextResponse.json({ error: 'nombre y email son obligatorios' }, { status: 400 })
        }

        // Generar slug a partir del nombre
        const slug = nombre
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) + '-' + Date.now().toString(36)

        // Generar password temporal seguro
        const tempPassword = crypto.randomBytes(12).toString('base64url')

        // Crear cliente admin de Supabase
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // 1. Crear usuario Supabase Auth
        const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password: tempPassword,
            email_confirm: true // Auto-confirmar el email
        })

        if (userError) {
            // Si el usuario ya existe, intentar buscarlo
            if (userError.message.includes('already been registered')) {
                return NextResponse.json({
                    error: `El email ${email} ya está registrado en Supabase. Usa otro email o busca el tenant existente.`
                }, { status: 409 })
            }
            console.error('[Admin/create] Error creando usuario:', userError.message)
            return NextResponse.json({ error: 'Error creando usuario: ' + userError.message }, { status: 500 })
        }

        const authUserId = newUser.user.id

        const supabase = getSupabase()

        // 2. Crear tenant en la tabla
        const trialHasta = new Date()
        trialHasta.setDate(trialHasta.getDate() + 14) // 14 días de trial

        const qrCode = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vuelve.vip'}/qr/${slug}`

        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                nombre: nombre.trim(),
                slug,
                rubro,
                color_primario,
                plan,
                estado: 'activo',
                trial_hasta: trialHasta.toISOString(),
                qr_code: qrCode,
                auth_user_id: authUserId
            })
            .select('id, slug, nombre')
            .single()

        if (tenantError || !tenant) {
            // Si el tenant falla, limpiar el usuario creado
            await adminClient.auth.admin.deleteUser(authUserId)
            console.error('[Admin/create] Error creando tenant:', tenantError?.message)
            return NextResponse.json({ error: 'Error creando negocio en la base de datos' }, { status: 500 })
        }

        // 3. Crear el programa de lealtad inicial
        const { error: programError } = await supabase
            .from('programs')
            .insert({
                tenant_id: tenant.id,
                puntos_meta: Math.max(1, Number(puntos_meta) || 10),
                descripcion_premio: descripcion_premio || 'Premio Sorpresa',
                tipo_premio: 'descuento',
                tipo_programa: 'sellos',
                activo: true,
                config: {}
            })

        if (programError) {
            console.warn('[Admin/create] Tenant creado pero programa falló:', programError.message)
            // No fallamos — el tenant existe, el programa se puede crear después
        }

        return NextResponse.json({
            ok: true,
            tenant_id: tenant.id,
            tenant_slug: tenant.slug,
            tenant_nombre: tenant.nombre,
            email: email.trim().toLowerCase(),
            temp_password: tempPassword,
            panel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://vuelve.vip'}/cliente?slug=${slug}`,
            message: `Negocio "${nombre}" creado correctamente. Credenciales generadas.`
        })

    } catch (err) {
        console.error('[Admin/create] Error inesperado:', err)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
