-- Planes por tier + selección de motores habilitados por negocio.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'selected_plan'
  ) THEN
    ALTER TABLE public.tenants
      ADD COLUMN selected_plan TEXT NOT NULL DEFAULT 'pro';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'selected_program_types'
  ) THEN
    ALTER TABLE public.tenants
      ADD COLUMN selected_program_types JSONB NOT NULL DEFAULT '["sellos"]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'pending_plan'
  ) THEN
    ALTER TABLE public.tenants
      ADD COLUMN pending_plan TEXT NULL;
  END IF;
END $$;

-- Backfill plan objetivo según plan actual.
UPDATE public.tenants
SET selected_plan = CASE
  WHEN plan IN ('pyme', 'pro', 'full') THEN plan
  ELSE 'pro'
END
WHERE selected_plan IS NULL
   OR selected_plan NOT IN ('pyme', 'pro', 'full');

-- Backfill motores permitidos según programa activo actual.
UPDATE public.tenants t
SET selected_program_types = jsonb_build_array(COALESCE(p.tipo_programa, 'sellos'))
FROM public.programs p
WHERE p.tenant_id = t.id
  AND p.activo = true
  AND (
    t.selected_program_types IS NULL
    OR jsonb_typeof(t.selected_program_types) <> 'array'
    OR jsonb_array_length(t.selected_program_types) = 0
  );

UPDATE public.tenants
SET selected_program_types = '["sellos"]'::jsonb
WHERE selected_program_types IS NULL
   OR jsonb_typeof(selected_program_types) <> 'array'
   OR jsonb_array_length(selected_program_types) = 0;

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_selected_plan_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_selected_plan_check
  CHECK (selected_plan IN ('pyme', 'pro', 'full'));

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_pending_plan_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_pending_plan_check
  CHECK (pending_plan IS NULL OR pending_plan IN ('pyme', 'pro', 'full'));
