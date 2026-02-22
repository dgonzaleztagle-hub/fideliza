-- ============================================================
-- Vuelve+ — Personalización de tarjeta (logo, fondo, stamp)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
          AND column_name = 'card_background_url'
    ) THEN
        ALTER TABLE public.tenants
            ADD COLUMN card_background_url TEXT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
          AND column_name = 'stamp_icon_url'
    ) THEN
        ALTER TABLE public.tenants
            ADD COLUMN stamp_icon_url TEXT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'tenant-card-backgrounds'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'tenant-card-backgrounds',
            'tenant-card-backgrounds',
            true,
            3145728,
            ARRAY['image/png', 'image/jpeg', 'image/webp']
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'tenant-stamp-icons'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'tenant-stamp-icons',
            'tenant-stamp-icons',
            true,
            1048576,
            ARRAY['image/png', 'image/jpeg', 'image/webp']
        );
    END IF;
END $$;
