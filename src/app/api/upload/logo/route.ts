import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabase } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const LOGO_BUCKET = 'tenant-logos'
const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function extensionFromMime(mime: string) {
    if (mime === 'image/png') return 'png'
    if (mime === 'image/jpeg') return 'jpg'
    if (mime === 'image/webp') return 'webp'
    return 'bin'
}

async function ensureLogoBucket() {
    const supabase = getSupabase()
    const { data, error } = await supabase.storage.getBucket(LOGO_BUCKET)
    if (!error && data) return

    await supabase.storage.createBucket(LOGO_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_MIME_TYPES
    })
}

// POST /api/upload/logo
// Subida de logo para onboarding sin pedir URL manual
export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req.headers)
        const rate = checkRateLimit(`logo-upload:${ip}`, 20, 10 * 60 * 1000)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas subidas. Intenta nuevamente en unos minutos.' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rate.retryAfterSec) }
                }
            )
        }

        const form = await req.formData()
        const file = form.get('file')
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Formato no permitido. Usa PNG, JPG o WEBP.' },
                { status: 400 }
            )
        }

        if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'El archivo debe pesar máximo 3 MB.' },
                { status: 400 }
            )
        }

        await ensureLogoBucket()

        const supabase = getSupabase()
        const ext = extensionFromMime(file.type)
        const objectPath = `logos/${new Date().getUTCFullYear()}/${randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
            .from(LOGO_BUCKET)
            .upload(objectPath, file, {
                contentType: file.type,
                upsert: false,
                cacheControl: '3600'
            })

        if (uploadError) {
            console.error('Error subiendo logo:', uploadError)
            return NextResponse.json({ error: 'No se pudo subir el logo' }, { status: 500 })
        }

        const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(objectPath)
        return NextResponse.json({
            logo_url: data.publicUrl,
            bucket: LOGO_BUCKET,
            path: objectPath
        })
    } catch (error) {
        console.error('Error en upload logo:', error)
        return NextResponse.json({ error: 'Error interno al subir logo' }, { status: 500 })
    }
}

