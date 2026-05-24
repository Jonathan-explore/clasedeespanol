-- ============================================================
-- Supabase setup script
-- EJECUTAR ESTO EN EL SQL EDITOR DE SUPABASE DASHBOARD:
--   https://supabase.com/dashboard → tu proyecto → SQL Editor
--
-- Es NECESARIO para que el tablón persista correctamente.
-- Ejecutar una sola vez. Es seguro ejecutarlo varias veces.
-- ============================================================

-- 1. Crear la tabla config_clase si no existe
CREATE TABLE IF NOT EXISTS config_clase (
  id    BIGSERIAL PRIMARY KEY,
  key   TEXT NOT NULL,
  value TEXT NOT NULL
);

-- 2. Añadir constraint UNIQUE en la columna key
-- (necesario para upsert atómico — evita duplicados y pérdida de datos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'config_clase_key_unique'
  ) THEN
    ALTER TABLE config_clase ADD CONSTRAINT config_clase_key_unique UNIQUE (key);
  END IF;
END$$;

-- 3. Habilitar Row Level Security
ALTER TABLE config_clase ENABLE ROW LEVEL SECURITY;

-- 4. Policies: lectura pública, escritura pública (sin autenticación)
-- Permite que el tablón sea visible a todos y editable desde el admin.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='config_clase' AND policyname='allow_public_read'
  ) THEN
    CREATE POLICY allow_public_read ON config_clase FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='config_clase' AND policyname='allow_public_insert'
  ) THEN
    CREATE POLICY allow_public_insert ON config_clase FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='config_clase' AND policyname='allow_public_update'
  ) THEN
    CREATE POLICY allow_public_update ON config_clase FOR UPDATE USING (true);
  END IF;
END$$;
