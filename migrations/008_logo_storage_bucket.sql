-- ============================================================
-- Vuelve+ — Bucket de logos para onboarding sin URL manual
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE id = 'tenant-logos'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'tenant-logos',
            'tenant-logos',
            true,
            3145728, -- 3 MB
            ARRAY['image/png', 'image/jpeg', 'image/webp']
        );
    END IF;
END $$;

