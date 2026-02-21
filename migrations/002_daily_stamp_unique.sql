-- ============================================================
-- Vuelve+ — Guardrail anti-duplicados de puntos por día
-- Regla de negocio: máximo 1 punto por cliente por día y negocio
-- ============================================================

-- 1) Asegurar fecha en cada stamp
UPDATE stamps
SET fecha = created_at::date
WHERE fecha IS NULL;

ALTER TABLE stamps
ALTER COLUMN fecha SET DEFAULT CURRENT_DATE;

ALTER TABLE stamps
ALTER COLUMN fecha SET NOT NULL;

-- 2) Constraint funcional: un solo stamp por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_stamps_one_per_customer_per_day
ON stamps (tenant_id, customer_id, fecha);
