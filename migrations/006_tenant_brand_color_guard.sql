-- Guardrail de color de marca para evitar valores inválidos o ilegibles

UPDATE public.tenants
SET color_primario = '#6366f1'
WHERE color_primario IS NULL
   OR color_primario !~ '^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$'
   OR lower(color_primario) IN ('#fff', '#ffffff');

ALTER TABLE public.tenants
ALTER COLUMN color_primario SET DEFAULT '#6366f1';

ALTER TABLE public.tenants
DROP CONSTRAINT IF EXISTS tenants_color_primario_format_chk;

ALTER TABLE public.tenants
ADD CONSTRAINT tenants_color_primario_format_chk
CHECK (color_primario ~ '^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$');
