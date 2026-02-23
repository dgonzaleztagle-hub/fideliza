-- ============================================================
-- Vuelve+ — Fix trigger welcome de customers (no bloquear registro)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_customer_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  raw_claims text;
  jwt_claims jsonb;
  role_value text;
BEGIN
  -- request.jwt.claims puede venir vacío o no existir según el contexto.
  -- Esto jamás debe bloquear el INSERT de customers.
  raw_claims := current_setting('request.jwt.claims', true);

  IF raw_claims IS NULL OR btrim(raw_claims) = '' THEN
    jwt_claims := '{}'::jsonb;
  ELSE
    BEGIN
      jwt_claims := raw_claims::jsonb;
    EXCEPTION WHEN others THEN
      jwt_claims := '{}'::jsonb;
    END;
  END IF;

  role_value := COALESCE(jwt_claims ->> 'role', 'service_role');

  PERFORM net.http_post(
    url := 'https://uofesbqqiyindcnnsoaa.supabase.co/functions/v1/welcome-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Caller-Role', role_value
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'customers',
      'record', to_jsonb(NEW)
    )
  );

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Regla principal: NUNCA romper el alta del cliente por fallo del webhook.
  RAISE WARNING 'handle_new_customer_welcome failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
