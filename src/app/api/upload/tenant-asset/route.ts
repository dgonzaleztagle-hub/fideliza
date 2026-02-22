import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabase } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ASSET_CONFIG = {
    logo: { bucket: 'tenant-logos', maxFileSize: 3 * 1024 * 1024, folder: 'logos' },
    background: { bucket: 'tenant-card-backgrounds', maxFileSize: 3 * 1024 * 1024, folder: 'backgrounds' },
    stamp: { bucket: 'tenant-stamp-icons', maxFileSize: 1 * 1024 * 1024, folder: 'stamps' }
} as const

type AssetType = keyof typeof ASSET_CONFIG

function isAssetType(value: unknown): value is AssetType {
    return value === 'logo' || value === 'background' || value === 'stamp'
}

function extensionFromMime(mime: string) {
    if (mime === 'image/png') return 'png'
    if (mime === 'image/jpeg') return 'jpg'
    if (mime === 'image/webp') return 'webp'
    return 'bin'
}

async function ensureBucket(bucket: string, fileSizeLimit: number) {
    const supabase = getSupabase()
    const { data, error } = await supabase.storage.getBucket(bucket)
    if (!error && data) return

    await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit,
        allowedMimeTypes: ALLOWED_MIME_TYPES
    })
}

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req.headers)
        const rate = checkRateLimit(`tenant-asset-upload:${ip}`, 40, 10 * 60 * 1000)
        if (!rate.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas subidas. Intenta nuevamente en unos minutos.' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rate.retryAfterSec) }
                }
            )
        }

        const url = new URL(req.url)
        const rawType = (url.searchParams.get('type') || 'logo').trim().toLowerCase()
        if (!isAssetType(rawType)) {
            return NextResponse.json({ error: 'Tipo de asset inválido. Usa logo, background o stamp.' }, { status: 400 })
        }

        const form = await req.formData()
        const file = form.get('file')
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Formato no permitido. Usa PNG, JPG o WEBP.' }, { status: 400 })
        }

        const cfg = ASSET_CONFIG[rawType]
        if (file.size <= 0 || file.size > cfg.maxFileSize) {
            return NextResponse.json(
                { error: `El archivo excede el máximo permitido para ${rawType}.` },
                { status: 400 }
            )
        }

        await ensureBucket(cfg.bucket, cfg.maxFileSize)

        const supabase = getSupabase()
        const ext = extensionFromMime(file.type)
        const objectPath = `${cfg.folder}/${new Date().getUTCFullYear()}/${randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
            .from(cfg.bucket)
            .upload(objectPath, file, {
                contentType: file.type,
                upsert: false,
                cacheControl: '3600'
            })

        if (uploadError) {
            console.error(`Error subiendo asset ${rawType}:`, uploadError)
            return NextResponse.json({ error: 'No se pudo subir el archivo' }, { status: 500 })
        }

        const { data } = supabase.storage.from(cfg.bucket).getPublicUrl(objectPath)
        return NextResponse.json({
            type: rawType,
            asset_url: data.publicUrl,
            bucket: cfg.bucket,
            path: objectPath
        })
    } catch (error) {
        console.error('Error en upload tenant-asset:', error)
        return NextResponse.json({ error: 'Error interno al subir archivo' }, { status: 500 })
    }
}
