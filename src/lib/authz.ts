import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabase } from '@/lib/supabase/admin'

interface AuthUser {
    id: string
    email?: string
}

interface TenantOwner {
    id: string
    slug: string
    nombre: string | null
    auth_user_id: string | null
}

type AuthzResult<T> =
    | { ok: true; user: AuthUser; tenant?: T }
    | { ok: false; response: NextResponse }

export async function requireAuthenticatedUser(): Promise<AuthzResult<never>> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }
    }

    return {
        ok: true,
        user: {
            id: user.id,
            email: user.email
        }
    }
}

export async function getOptionalAuthenticatedUser(): Promise<AuthUser | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return {
        id: user.id,
        email: user.email
    }
}

export async function requireTenantOwnerById(tenantId: string): Promise<AuthzResult<TenantOwner>> {
    const auth = await requireAuthenticatedUser()
    if (!auth.ok) return auth

    const supabase = getSupabase()
    const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, slug, nombre, auth_user_id')
        .eq('id', tenantId)
        .maybeSingle()

    if (error) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Error consultando negocio' }, { status: 500 })
        }
    }

    if (!tenant) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }
    }

    if (tenant.auth_user_id !== auth.user.id) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'No autorizado para este negocio' }, { status: 403 })
        }
    }

    return {
        ok: true,
        user: auth.user,
        tenant: tenant as TenantOwner
    }
}

export async function requireTenantOwnerBySlug(slug: string): Promise<AuthzResult<TenantOwner>> {
    const auth = await requireAuthenticatedUser()
    if (!auth.ok) return auth

    const supabase = getSupabase()
    const { data: tenant, error } = await supabase
        .from('tenants')
        .select('id, slug, nombre, auth_user_id')
        .eq('slug', slug)
        .maybeSingle()

    if (error) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Error consultando negocio' }, { status: 500 })
        }
    }

    if (!tenant) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
        }
    }

    if (tenant.auth_user_id !== auth.user.id) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'No autorizado para este negocio' }, { status: 403 })
        }
    }

    return {
        ok: true,
        user: auth.user,
        tenant: tenant as TenantOwner
    }
}

export async function requireSuperAdmin(): Promise<AuthzResult<never>> {
    const auth = await requireAuthenticatedUser()
    if (!auth.ok) return auth

    const configured = process.env.SUPER_ADMIN_EMAILS || ''
    const allowlist = configured
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)

    const email = (auth.user.email || '').toLowerCase()

    const emailAllowed = allowlist.length > 0
        ? allowlist.includes(email)
        : email.endsWith('@acargoo.cl')

    if (!emailAllowed) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Acceso restringido a super admin' }, { status: 403 })
        }
    }

    return auth
}
