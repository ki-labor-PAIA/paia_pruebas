-- ============================================
-- Migración: Agregar WhatsApp a la tabla agents
-- ============================================
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Fecha: 2025-11-06
-- ============================================

-- 1. Agregar columna whatsapp_phone_number a la tabla agents
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS whatsapp_phone_number VARCHAR(20);

-- 2. Agregar índice para búsquedas más rápidas (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_agents_whatsapp_phone
ON agents(whatsapp_phone_number);

-- 3. Agregar comentario descriptivo a la columna
COMMENT ON COLUMN agents.whatsapp_phone_number IS
'Número de WhatsApp en formato internacional sin +. Ejemplo: 5214425498784';

-- 4. Verificar que la columna se agregó correctamente
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'agents'
AND column_name = 'whatsapp_phone_number';

-- ============================================
-- NOTAS:
-- - El número se guarda sin el símbolo +
-- - Formato ejemplo: 5214425498784 (México)
-- - Formato ejemplo: 5491123456789 (Argentina)
-- - La columna es nullable (puede ser NULL)
-- ============================================

-- ROLLBACK (solo si necesitas revertir los cambios):
-- DROP INDEX IF EXISTS idx_agents_whatsapp_phone;
-- ALTER TABLE agents DROP COLUMN IF EXISTS whatsapp_phone_number;
