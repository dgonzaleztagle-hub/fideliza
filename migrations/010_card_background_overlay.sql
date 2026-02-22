-- ============================================================
-- Vuelve+ — Intensidad de imagen de fondo en tarjeta
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
          AND column_name = 'card_background_overlay'
    ) THEN
        ALTER TABLE public.tenants
            ADD COLUMN card_background_overlay DOUBLE PRECISION NOT NULL DEFAULT 0.22;
    END IF;
END $$;

UPDATE public.tenants
SET card_background_overlay = 0.22
WHERE card_background_overlay IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tenants_card_background_overlay_range'
    ) THEN
        ALTER TABLE public.tenants
            ADD CONSTRAINT tenants_card_background_overlay_range
            CHECK (card_background_overlay >= 0 AND card_background_overlay <= 0.8);
    END IF;
END $$;
