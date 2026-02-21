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

-- 2) Limpiar duplicados históricos por tenant/cliente/día
DELETE FROM stamps s1
USING stamps s2
WHERE s1.tenant_id = s2.tenant_id
  AND s1.customer_id = s2.customer_id
  AND s1.fecha = s2.fecha
  AND s1.ctid < s2.ctid;

-- 3) Constraint funcional: un solo stamp por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_stamps_one_per_customer_per_day
ON stamps (tenant_id, customer_id, fecha);
