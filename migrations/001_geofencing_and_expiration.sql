-- ============================================================
-- Vuelve+ — Migration: Geofencing columns + rewards expiration
-- Ejecutar en Supabase SQL Editor si las columnas no existen
-- ============================================================

-- 1. Agregar columnas de geofencing a tenants (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'lat') THEN
        ALTER TABLE tenants ADD COLUMN lat DOUBLE PRECISION DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'lng') THEN
        ALTER TABLE tenants ADD COLUMN lng DOUBLE PRECISION DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'mensaje_geofencing') THEN
        ALTER TABLE tenants ADD COLUMN mensaje_geofencing TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'telefono') THEN
        ALTER TABLE tenants ADD COLUMN telefono TEXT DEFAULT NULL;
    END IF;
END$$;

-- 2. Agregar columnas de membersía si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'saldo_cashback') THEN
        ALTER TABLE memberships ADD COLUMN saldo_cashback INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'usos_restantes') THEN
        ALTER TABLE memberships ADD COLUMN usos_restantes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'fecha_fin') THEN
        ALTER TABLE memberships ADD COLUMN fecha_fin TIMESTAMPTZ DEFAULT NULL;
    END IF;
END$$;

-- 3. Agregar tipo_programa y config a programs si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'tipo_programa') THEN
        ALTER TABLE programs ADD COLUMN tipo_programa TEXT DEFAULT 'sellos';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'config') THEN
        ALTER TABLE programs ADD COLUMN config JSONB DEFAULT '{}';
    END IF;
END$$;

-- 4. Índice para expiración de premios (mejora performance del cron)
CREATE INDEX IF NOT EXISTS idx_rewards_expiration 
ON rewards (canjeado, created_at) 
WHERE canjeado = false;

-- 5. Índice para membresías activas por vencer
CREATE INDEX IF NOT EXISTS idx_memberships_expiration 
ON memberships (estado, fecha_fin) 
WHERE estado = 'activo';

-- ============================================================
-- NOTA: Ejecutar solo una vez antes del deploy
-- Las columnas que ya existan serán ignoradas (IF NOT EXISTS)
-- ============================================================
