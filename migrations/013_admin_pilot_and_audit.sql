-- ============================================================
-- Vuelve+ — Admin piloto + auditoría
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
          AND column_name = 'is_pilot'
    ) THEN
        ALTER TABLE public.tenants
            ADD COLUMN is_pilot BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
          AND column_name = 'pilot_started_at'
    ) THEN
        ALTER TABLE public.tenants
            ADD COLUMN pilot_started_at TIMESTAMPTZ NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
          AND column_name = 'pilot_notes'
    ) THEN
        ALTER TABLE public.tenants
            ADD COLUMN pilot_notes TEXT NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
    ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_tenant_id_idx
    ON public.admin_audit_logs(tenant_id);

