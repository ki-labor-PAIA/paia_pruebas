-- ============================================
-- MIGRACIÓN CORREGIDA: Integrar Protocolo PAIA en PAIA_PRUEBAS
-- Base de datos: Supabase PostgreSQL
-- Fecha: 2025-11-21
-- ============================================
-- IMPORTANTE: Esta migración es NO DESTRUCTIVA
-- Solo agrega tablas nuevas
-- No modifica tablas existentes
-- ============================================

-- Verificar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA 1: AGENT_CAPABILITIES
-- Registra las capacidades de cada agente
-- ============================================
CREATE TABLE IF NOT EXISTS agent_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    capability_name VARCHAR(100) NOT NULL,
    capability_type VARCHAR(255) NOT NULL,
    description TEXT,
    input_schema JSONB,
    output_schema JSONB,
    requires_approval BOOLEAN DEFAULT false,
    autonomy_level VARCHAR(50) DEFAULT 'supervised',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, capability_name)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_capabilities_agent ON agent_capabilities(agent_id);
CREATE INDEX IF NOT EXISTS idx_capabilities_type ON agent_capabilities(capability_type);
CREATE INDEX IF NOT EXISTS idx_capabilities_enabled ON agent_capabilities(enabled) WHERE enabled = true;

COMMENT ON TABLE agent_capabilities IS 'Capacidades que cada agente puede ejecutar (Protocolo PAIA)';

-- ============================================
-- TABLA 2: AGENT_CONVERSATIONS
-- Tracking mejorado de conversaciones entre agentes
-- ============================================
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent1_id VARCHAR(255) NOT NULL,
    agent2_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    last_message_preview TEXT,
    unread_count_agent1 INTEGER DEFAULT 0,
    unread_count_agent2 INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(agent1_id, agent2_id),
    CHECK (agent1_id < agent2_id)
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_conv_agent1 ON agent_conversations(agent1_id);
CREATE INDEX IF NOT EXISTS idx_conv_agent2 ON agent_conversations(agent2_id);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON agent_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_status ON agent_conversations(status) WHERE status = 'active';

COMMENT ON TABLE agent_conversations IS 'Conversaciones entre agentes con tracking de mensajes no leídos';

-- ============================================
-- TABLA 3: AGENT_MESSAGES_PAIA
-- Mensajes entre agentes con protocolo PAIA
-- (Nueva tabla, no modifica las existentes)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_messages_paia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
    from_agent_id VARCHAR(255) NOT NULL,
    to_agent_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'sent',
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    in_reply_to UUID REFERENCES agent_messages_paia(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_msg_paia_conversation ON agent_messages_paia(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_paia_from ON agent_messages_paia(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_msg_paia_to ON agent_messages_paia(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_msg_paia_status ON agent_messages_paia(status) WHERE status IN ('pending', 'sent');
CREATE INDEX IF NOT EXISTS idx_msg_paia_type ON agent_messages_paia(message_type);
CREATE INDEX IF NOT EXISTS idx_msg_paia_payload ON agent_messages_paia USING GIN (payload);

COMMENT ON TABLE agent_messages_paia IS 'Mensajes del protocolo PAIA entre agentes';
COMMENT ON COLUMN agent_messages_paia.message_type IS 'Tipo de mensaje PAIA (ej: paia.chat.message, paia.request.calendar.check_availability)';
COMMENT ON COLUMN agent_messages_paia.payload IS 'Payload del mensaje en formato JSONB';
COMMENT ON COLUMN agent_messages_paia.metadata IS 'Metadata del mensaje (message_id, timestamp, conversation_id, etc)';
COMMENT ON COLUMN agent_messages_paia.status IS 'Estado: pending, sent, delivered, read, failed';

-- ============================================
-- TABLA 4: AUTONOMY_SETTINGS
-- Configuración de autonomía por agente
-- ============================================
CREATE TABLE IF NOT EXISTS autonomy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    default_level VARCHAR(50) DEFAULT 'supervised',
    rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id)
);

CREATE INDEX IF NOT EXISTS idx_autonomy_agent ON autonomy_settings(agent_id);

COMMENT ON TABLE autonomy_settings IS 'Configuración de autonomía para cada agente (full_auto, supervised, manual, disabled)';
COMMENT ON COLUMN autonomy_settings.default_level IS 'Nivel por defecto: full_auto, supervised, manual, disabled';
COMMENT ON COLUMN autonomy_settings.rules IS 'Array de reglas: [{condition, autonomy_level, priority}]';

-- ============================================
-- FUNCIÓN 1: Obtener o crear conversación
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_agent1_id VARCHAR(255),
    p_agent2_id VARCHAR(255)
) RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_ordered_agent1 VARCHAR(255);
    v_ordered_agent2 VARCHAR(255);
BEGIN
    -- Ordenar IDs alfabéticamente para evitar duplicados
    IF p_agent1_id < p_agent2_id THEN
        v_ordered_agent1 := p_agent1_id;
        v_ordered_agent2 := p_agent2_id;
    ELSE
        v_ordered_agent1 := p_agent2_id;
        v_ordered_agent2 := p_agent1_id;
    END IF;

    -- Buscar conversación existente
    SELECT id INTO v_conversation_id
    FROM agent_conversations
    WHERE agent1_id = v_ordered_agent1
      AND agent2_id = v_ordered_agent2;

    -- Si no existe, crear nueva
    IF v_conversation_id IS NULL THEN
        INSERT INTO agent_conversations (agent1_id, agent2_id)
        VALUES (v_ordered_agent1, v_ordered_agent2)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_conversation IS 'Obtiene conversation_id existente o crea uno nuevo';

-- ============================================
-- FUNCIÓN 2: Actualizar última actividad de conversación
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
DECLARE
    v_preview TEXT;
BEGIN
    -- Extraer preview del payload
    IF NEW.payload IS NOT NULL AND NEW.payload ? 'content' THEN
        v_preview := LEFT(NEW.payload->>'content', 100);
    ELSE
        v_preview := 'Mensaje sin contenido';
    END IF;

    -- Actualizar conversación
    UPDATE agent_conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = v_preview,
        metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{last_updated}',
            to_jsonb(CURRENT_TIMESTAMP)
        )
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-actualizar conversaciones
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON agent_messages_paia;
CREATE TRIGGER trigger_update_conversation_last_message
AFTER INSERT ON agent_messages_paia
FOR EACH ROW
WHEN (NEW.conversation_id IS NOT NULL)
EXECUTE FUNCTION update_conversation_last_message();

COMMENT ON TRIGGER trigger_update_conversation_last_message ON agent_messages_paia IS 'Actualiza automáticamente la última actividad de la conversación';

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Agentes con sus capacidades
CREATE OR REPLACE VIEW v_agents_with_capabilities AS
SELECT
    a.id,
    a.name,
    a.user_id,
    a.expertise,
    a.status,
    a.is_public,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'capability_name', ac.capability_name,
                'capability_type', ac.capability_type,
                'autonomy_level', ac.autonomy_level,
                'enabled', ac.enabled
            ) ORDER BY ac.created_at
        ) FILTER (WHERE ac.id IS NOT NULL),
        '[]'::jsonb
    ) as capabilities
FROM agents a
LEFT JOIN agent_capabilities ac ON a.id = ac.agent_id
GROUP BY a.id;

COMMENT ON VIEW v_agents_with_capabilities IS 'Vista que muestra agentes con sus capacidades en formato JSON';

-- Vista: Conversaciones activas
CREATE OR REPLACE VIEW v_active_conversations AS
SELECT
    ac.id,
    ac.agent1_id,
    a1.name as agent1_name,
    ac.agent2_id,
    a2.name as agent2_name,
    ac.last_message_at,
    ac.last_message_preview,
    ac.unread_count_agent1,
    ac.unread_count_agent2,
    ac.status
FROM agent_conversations ac
JOIN agents a1 ON ac.agent1_id = a1.id
JOIN agents a2 ON ac.agent2_id = a2.id
WHERE ac.status = 'active'
ORDER BY ac.last_message_at DESC NULLS LAST;

COMMENT ON VIEW v_active_conversations IS 'Vista de conversaciones activas con nombres de agentes';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $$
DECLARE
    v_capabilities_count INTEGER;
    v_conversations_count INTEGER;
    v_autonomy_count INTEGER;
    v_messages_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_capabilities_count FROM agent_capabilities;
    SELECT COUNT(*) INTO v_conversations_count FROM agent_conversations;
    SELECT COUNT(*) INTO v_autonomy_count FROM autonomy_settings;
    SELECT COUNT(*) INTO v_messages_count FROM agent_messages_paia;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tablas creadas:';
    RAISE NOTICE '  - agent_capabilities: % registros', v_capabilities_count;
    RAISE NOTICE '  - agent_conversations: % registros', v_conversations_count;
    RAISE NOTICE '  - agent_messages_paia: % registros', v_messages_count;
    RAISE NOTICE '  - autonomy_settings: % registros', v_autonomy_count;
    RAISE NOTICE 'Funciones creadas: 2';
    RAISE NOTICE 'Triggers creados: 1';
    RAISE NOTICE 'Vistas creadas: 2';
    RAISE NOTICE '========================================';
END $$;

-- Completado
SELECT
    '✓ Migración del Protocolo PAIA completada' as status,
    CURRENT_TIMESTAMP as timestamp;
