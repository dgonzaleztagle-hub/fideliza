-- ============================================================
-- Vuelve+ — Security Advisor hardening
-- Corrige hallazgos de RLS y search_path mutable sin romper flujos
-- ============================================================

-- 1) RLS en tablas expuestas y policy mínima para service_role
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'scheduled_campaigns',
        'pending_reviews',
        'review_feedback',
        'staff_profiles'
    ]
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (current_user = ''service_role'') WITH CHECK (current_user = ''service_role'')',
                t || '_service_role_all',
                t
            );

            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
        END IF;
    END LOOP;
END $$;

-- 2) Endurecer policies de service_role que usen TRUE literal
--    (el Advisor marca USING/WITH CHECK (true) como sobre-permisivo)
DO $$
DECLARE
    p record;
    policy_cmd text;
    create_sql text;
BEGIN
    FOR p IN
        SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            cmd AS policy_cmd,
            roles,
            COALESCE(qual, '') AS qual,
            COALESCE(with_check, '') AS with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND cardinality(roles) = 1
          AND roles[1] = 'service_role'
          AND (
                COALESCE(qual, '') ~* '\btrue\b'
             OR COALESCE(with_check, '') ~* '\btrue\b'
          )
    LOOP
        policy_cmd := upper(p.policy_cmd);

        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            p.policyname, p.schemaname, p.tablename
        );

        create_sql := format(
            'CREATE POLICY %I ON %I.%I AS %s FOR %s TO service_role',
            p.policyname,
            p.schemaname,
            p.tablename,
            p.permissive,
            policy_cmd
        );

        IF policy_cmd = 'SELECT' OR policy_cmd = 'DELETE' THEN
            create_sql := create_sql || ' USING (current_user = ''service_role'')';
        ELSIF policy_cmd = 'INSERT' THEN
            create_sql := create_sql || ' WITH CHECK (current_user = ''service_role'')';
        ELSE
            -- UPDATE y ALL
            create_sql := create_sql
                || ' USING (current_user = ''service_role'')'
                || ' WITH CHECK (current_user = ''service_role'')';
        END IF;

        EXECUTE create_sql;
    END LOOP;
END $$;

-- 3) Fijar search_path en funciones marcadas como mutable
DO $$
DECLARE
    fn record;
BEGIN
    FOR fn IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS identity_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'process_stamp_and_reward',
              'redeem_reward_atomic',
              'handle_referral_reward',
              'handle_new_customer_welcome',
              'queue_review_request',
              'update_updated_at'
          )
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
            fn.schema_name,
            fn.function_name,
            fn.identity_args
        );
    END LOOP;
END $$;
