-- ============================================================
-- Vuelve+ — Persistencia de customerId de Flow por tenant
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenants'
          AND column_name = 'flow_customer_id'
    ) THEN
        ALTER TABLE public.tenants
            ADD COLUMN flow_customer_id TEXT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'tenants'
          AND indexname = 'tenants_flow_customer_id_uidx'
    ) THEN
        CREATE UNIQUE INDEX tenants_flow_customer_id_uidx
            ON public.tenants(flow_customer_id)
            WHERE flow_customer_id IS NOT NULL;
    END IF;
END $$;
