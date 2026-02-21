-- Alinea la columna programs.tipo_programa con todos los tipos soportados por la app.
DO $$
DECLARE
  c RECORD;
BEGIN
  IF to_regclass('public.programs') IS NULL THEN
    RAISE NOTICE 'Tabla public.programs no existe; se omite migracion';
    RETURN;
  END IF;

  -- Eliminamos checks viejos que restrinjan tipo_programa.
  FOR c IN
    SELECT pc.conname
    FROM pg_constraint pc
    JOIN pg_class pt ON pt.oid = pc.conrelid
    JOIN pg_namespace pn ON pn.oid = pt.relnamespace
    WHERE pn.nspname = 'public'
      AND pt.relname = 'programs'
      AND pc.contype = 'c'
      AND pg_get_constraintdef(pc.oid) ILIKE '%tipo_programa%'
  LOOP
    EXECUTE format('ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;

  ALTER TABLE public.programs
    ADD CONSTRAINT programs_tipo_programa_check
    CHECK (
      tipo_programa IN (
        'sellos',
        'cashback',
        'multipase',
        'membresia',
        'descuento',
        'cupon',
        'regalo',
        'afiliacion'
      )
    )
    NOT VALID;

  ALTER TABLE public.programs
    VALIDATE CONSTRAINT programs_tipo_programa_check;
END $$;
