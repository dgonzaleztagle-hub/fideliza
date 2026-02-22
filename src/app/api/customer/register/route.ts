import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

function normalizeWhatsapp(value: string): string {
    return value.replace(/[^\d+]/g, '')
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function buildDbErrorDetail(error: { message?: string | null; details?: string | null; hint?: string | null }): string {
    const parts = [error.message, error.details, error.hint]
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
    return parts.join(' | ')
}

// POST /api/customer/register
// Registra un nuevo cliente para un tenant
export async function POST(req: NextRequest) {
    const requestId = req.headers.get('x-client-request-id')?.trim() || null
    const errorResponse = (
        status: number,
        message: string,
        code: string,
        extra?: Record<string, unknown>
    ) =>
        NextResponse.json(
            {
                error: message,
                error_code: code,
                request_id: requestId || undefined,
                ...(extra || {})
            },
            { status }
        )

    try {
        const supabase = getSupabase()
        const { tenant_id, nombre, whatsapp, email, referido_por, fecha_nacimiento } = await req.json()
        const normalizedName = typeof nombre === 'string' ? nombre.trim() : ''
        const normalizedWhatsapp = typeof whatsapp === 'string' ? normalizeWhatsapp(whatsapp) : ''
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
        const normalizedBirthdate = typeof fecha_nacimiento === 'string' ? fecha_nacimiento.trim() : ''
        const ip = getClientIp(req.headers)

        if (!tenant_id || !normalizedName || !normalizedWhatsapp) {
            return errorResponse(400, 'Faltan campos requeridos: tenant_id, nombre, whatsapp', 'CUSTOMER_REGISTER_REQUIRED_FIELDS')
        }
        if (normalizedWhatsapp.length < 8) {
            return errorResponse(400, 'WhatsApp inválido', 'CUSTOMER_REGISTER_WHATSAPP_INVALID')
        }
        if (normalizedName.length < 2 || normalizedName.length > 120) {
            return errorResponse(400, 'Nombre inválido', 'CUSTOMER_REGISTER_NAME_INVALID')
        }
        if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return errorResponse(400, 'Email inválido', 'CUSTOMER_REGISTER_EMAIL_INVALID')
        }
        if (normalizedBirthdate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthdate)) {
            return errorResponse(400, 'Fecha de nacimiento inválida', 'CUSTOMER_REGISTER_BIRTHDATE_INVALID')
        }

        const rate = checkRateLimit(`customer-register:${ip}:${tenant_id}`, 25, 10 * 60 * 1000)
        if (!rate.allowed) {
            const response = errorResponse(
                429,
                'Demasiados intentos de registro. Intenta nuevamente en unos minutos.',
                'CUSTOMER_REGISTER_RATE_LIMIT'
            )
            response.headers.set('Retry-After', String(rate.retryAfterSec))
            return response
        }

        // Verificar que el tenant existe y está activo
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('id, nombre, estado')
            .eq('id', tenant_id)
            .single()

        if (tenantError) {
            console.error('Error validando tenant en registro QR:', tenantError)
            return errorResponse(
                500,
                'No pudimos validar el negocio',
                'CUSTOMER_REGISTER_TENANT_LOOKUP_FAILED',
                { error_detail: buildDbErrorDetail(tenantError) }
            )
        }

        if (!tenant) {
            return errorResponse(404, 'Negocio no encontrado', 'CUSTOMER_REGISTER_TENANT_NOT_FOUND')
        }

        if (tenant.estado !== 'activo') {
            return errorResponse(403, 'Este negocio no está activo', 'CUSTOMER_REGISTER_TENANT_INACTIVE')
        }

        // Verificar si el cliente ya existe
        const { data: existing, error: existingError } = await supabase
            .from('customers')
            .select('id, nombre, puntos_actuales')
            .eq('tenant_id', tenant_id)
            .eq('whatsapp', normalizedWhatsapp)
            .maybeSingle()

        if (existingError) {
            console.error('Error validando cliente existente:', existingError)
            return errorResponse(
                500,
                'No pudimos validar si el cliente ya existía',
                'CUSTOMER_REGISTER_EXISTENCE_CHECK_FAILED',
                { error_detail: buildDbErrorDetail(existingError) }
            )
        }

        if (existing) {
            return NextResponse.json({
                message: 'Cliente ya registrado',
                customer: existing,
                isNew: false
            })
        }

        if (referido_por) {
            if (typeof referido_por !== 'string' || !isUuid(referido_por)) {
                return errorResponse(400, 'Código de referido inválido', 'CUSTOMER_REGISTER_REFERRAL_INVALID')
            }
            const { data: referrer } = await supabase
                .from('customers')
                .select('id')
                .eq('id', referido_por)
                .eq('tenant_id', tenant_id)
                .maybeSingle()

            if (!referrer) {
                return errorResponse(400, 'Código de referido inválido', 'CUSTOMER_REGISTER_REFERRAL_INVALID')
            }
        }

        // Crear nuevo cliente
        const { data: customer, error: createError } = await supabase
            .from('customers')
            .insert({
                tenant_id,
                nombre: normalizedName,
                whatsapp: normalizedWhatsapp,
                email: normalizedEmail || null,
                fecha_nacimiento: normalizedBirthdate || null,
                puntos_actuales: 0,
                referido_por: referido_por || null
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creando cliente:', createError)
            if (createError.code === '23505') {
                return errorResponse(
                    409,
                    'Cliente ya registrado',
                    'CUSTOMER_REGISTER_DUPLICATE',
                    { error_detail: buildDbErrorDetail(createError) }
                )
            }
            if (createError.code === '42501') {
                return errorResponse(
                    500,
                    'Permisos de base de datos impiden registrar clientes',
                    'CUSTOMER_REGISTER_DB_PERMISSION_DENIED',
                    { error_detail: buildDbErrorDetail(createError) }
                )
            }
            if (createError.code === '23502') {
                return errorResponse(
                    500,
                    'Falta un dato obligatorio para crear el cliente',
                    'CUSTOMER_REGISTER_DB_NOT_NULL_VIOLATION',
                    { error_detail: buildDbErrorDetail(createError) }
                )
            }
            if (createError.code === '22P02') {
                return errorResponse(
                    400,
                    'Uno de los datos tiene formato inválido',
                    'CUSTOMER_REGISTER_DB_INVALID_TEXT_REPRESENTATION',
                    { error_detail: buildDbErrorDetail(createError) }
                )
            }
            return errorResponse(
                500,
                'Error al registrar cliente',
                'CUSTOMER_REGISTER_CREATE_FAILED',
                { error_detail: buildDbErrorDetail(createError) }
            )
        }

        return NextResponse.json({
            message: '¡Bienvenido! Te registraste correctamente',
            customer,
            isNew: true
        }, { status: 201 })

    } catch (error) {
        console.error('Error en registro:', error)
        const rawMessage = error instanceof Error ? error.message : 'unknown'
        if (/Invalid API key/i.test(rawMessage)) {
            return errorResponse(
                500,
                'Configuración de servidor inválida: revisa SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL (mismo proyecto).',
                'CUSTOMER_REGISTER_SUPABASE_SERVER_KEY_INVALID',
                { error_detail: rawMessage }
            )
        }
        return errorResponse(
            500,
            'Error interno',
            'CUSTOMER_REGISTER_UNEXPECTED',
            { error_detail: rawMessage }
        )
    }
}
