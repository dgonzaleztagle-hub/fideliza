-- ============================================================
-- Vuelve+ — Hardening de PIN para staff (hash + migración legacy)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE staff_profiles
ADD COLUMN IF NOT EXISTS pin_hash TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'staff_profiles'
          AND column_name = 'pin'
    ) THEN
        -- Migrar PIN legado en texto plano a hash seguro (bcrypt vía pgcrypto)
        UPDATE staff_profiles
        SET pin_hash = crypt(pin::text, gen_salt('bf'))
        WHERE pin IS NOT NULL
          AND COALESCE(pin_hash, '') = '';

        -- Dejar PIN en nulo para evitar exposición de secretos en texto plano
        ALTER TABLE staff_profiles
        ALTER COLUMN pin DROP NOT NULL;

        UPDATE staff_profiles
        SET pin = NULL
        WHERE pin_hash IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_profiles_tenant_active
ON staff_profiles (tenant_id, activo);
