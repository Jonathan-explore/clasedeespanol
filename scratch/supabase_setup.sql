-- ============================================================
-- Supabase setup script (opcional, mejora rendimiento)
-- Ejecutar en el SQL Editor del dashboard si se desea.
-- La app funciona sin ejecutar este script.
-- ============================================================

-- Añadir constraint UNIQUE en config_clase.key
-- (permite usar UPSERT nativo en el futuro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'config_clase_key_unique'
  ) THEN
    ALTER TABLE config_clase ADD CONSTRAINT config_clase_key_unique UNIQUE (key);
  END IF;
END$$;

-- NOTA: La tabla 'stile' ya NO es necesaria.
-- Los ítems de Stile se almacenan como JSON en config_clase bajo la clave 'stile_items'.
